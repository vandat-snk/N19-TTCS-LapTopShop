const Order = require("./../models/orderModel");
const factory = require("./handlerFactory");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const moment = require("moment");
const mailTemplate = require("./mailTemplate");
const Product = require("../models/productModel");
const sendEmail = require("../utils/email");
const Transaction = require("../models/transactionModel");
const {
  createNotificationForAdmins,
  createNotificationForUser,
} = require("./notificationController");

const getProductIdFromCartItem = (item) => {
  if (!item) return null;
  if (item.product?._id) return item.product._id;
  if (item.product?.id) return item.product.id;
  if (item.product) return item.product;
  if (item.id) return item.id;
  return null;
};

const buildCheckoutSnapshot = async (cart, userId) => {
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    throw new AppError("Gio hang trong!", 400);
  }

  let subtotal = 0;
  const realCart = [];

  for (const item of cart) {
    const productId = getProductIdFromCartItem(item);
    const quantity = Number(item.quantity);

    if (!productId || !Number.isInteger(quantity) || quantity < 1) {
      throw new AppError("Du lieu gio hang khong hop le.", 400);
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError(`Khong tim thay san pham ID: ${productId}`, 404);
    }

    if (quantity > product.inventory) {
      const name =
        product.title.length > 39 ? product.title.slice(0, 40) : product.title;
      throw new AppError(`So luong hang ${name} trong kho khong du`, 400);
    }

    const finalItemPrice = product.promotion || product.price;
    subtotal += finalItemPrice * quantity;

    realCart.push({
      product: product._id,
      title: product.title,
      image: product.images[0],
      quantity,
      price: finalItemPrice,
    });
  }

  const orderHistoryCount = await Order.countDocuments({
    user: userId,
    status: { $ne: "Cancelled" },
  });
  const isFirstOrder = orderHistoryCount === 0;
  const discount = isFirstOrder ? Math.round(subtotal * 0.15) : 0;

  return {
    cart: realCart,
    subtotal,
    discount,
    totalPrice: subtotal - discount,
    isFirstOrder,
  };
};

exports.checkStatusOrder = catchAsync(async (req, res, next) => {
  if (
    req.user.role == "user" &&
    ((req.body.status == "Cancelled" && req.order.status != "Processed") ||
      req.body.status != "Cancelled")
  ) {
    return next(new AppError("Bạn không có quyền thực hiện.", 403));
  }
  if (req.order.status == "Cancelled" || req.order.status == "Success") {
    return next(new AppError(`Đơn hàng nãy đã ${req.order.status}`, 403));
  }
  next();
});
exports.getTableOrder = factory.getTable(Order);
exports.getOrder = factory.getOne(Order);
exports.getAllOrders = factory.getAll(Order);

exports.getCheckoutQuote = catchAsync(async (req, res, next) => {
  const quote = await buildCheckoutSnapshot(req.body.cart, req.user.id);

  res.status(200).json({
    status: "success",
    data: quote,
  });
});

exports.createOrder = catchAsync(async (req, res, next) => {
  const incomingCart = req.body.cart;
  if (!incomingCart || incomingCart.length === 0) {
    return next(new AppError("Giỏ hàng trống!", 400));
  }

  let calculatedTotalPrice = 0;
  const realCart = await Promise.all(
    incomingCart.map(async (item) => {
      const productId = getProductIdFromCartItem(item);
      const quantity = Number(item.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1) {
        throw new AppError("Du lieu gio hang khong hop le.", 400);
      }

      const product = await Product.findById(productId);
      if (!product) {
        throw new AppError(`Không tìm thấy sản phẩm ID: ${item.product}`, 404);
      }

      if (quantity > product.inventory) {
        const name =
          product.title.length > 39 ? product.title.slice(0, 40) : product.title;
        throw new AppError(`So luong hang ${name} trong kho khong du`, 400);
      }

      const finalItemPrice = product.promotion ? product.promotion : product.price;
      calculatedTotalPrice += finalItemPrice * quantity;

      return {
        product: product._id,
        title: product.title,
        image: product.images[0],
        quantity,
        price: finalItemPrice,
      };
    })
  );

  const orderHistoryCount = await Order.countDocuments({
    user: req.user.id,
    status: { $ne: "Cancelled" },
  });

  if (orderHistoryCount === 0) {
    calculatedTotalPrice = Math.round(calculatedTotalPrice * 0.85);
    console.log(`Đơn hàng đầu tiên của ${req.user.name}, đã áp dụng giảm giá 15%!`);
  }

  req.body.cart = realCart;
  req.body.totalPrice = calculatedTotalPrice;

  if (req.body.receiver || req.body.phone || req.body.address) {
    req.body.shippingDetails = {
      receiver: req.body.receiver,
      phone: req.body.phone,
      address: req.body.address,
    };
  }

  const paymentMethod = req.body.paymentInfo?.method || req.body.payments;
  if (paymentMethod) {
    // Lấy invoicePayment từ bất kỳ nguồn nào, đảm bảo luôn lưu dạng JSON string 1 lần
    const rawInvoice = req.body.paymentInfo?.invoicePayment ?? req.body.invoicePayment;
    let invoicePayment;
    if (rawInvoice === undefined || rawInvoice === null) {
      invoicePayment = undefined;
    } else if (typeof rawInvoice === "string") {
      // Kiểm tra xem có bị stringify 2 lần không (string của string)
      try {
        const parsed = JSON.parse(rawInvoice);
        // Nếu parse ra lại là string → bị double-stringify → parse lại 1 lần nữa
        invoicePayment = typeof parsed === "string" ? parsed : rawInvoice;
      } catch {
        invoicePayment = rawInvoice;
      }
    } else {
      // Object → stringify 1 lần
      invoicePayment = JSON.stringify(rawInvoice);
    }

    req.body.paymentInfo = {
      method: paymentMethod,
      status:
        req.body.paymentInfo?.status ||
        (paymentMethod === "paypal" && invoicePayment ? "Paid" : "pending"),
      invoicePayment,
    };
  }

  const doc = await Order.create(req.body);

  // [NOTIFICATION] Thông báo cho admin khi có đơn hàng mới
  try {
    const payMethod = req.body.paymentInfo?.method || "tiền mặt";
    await createNotificationForAdmins({
      type: "new_order",
      title: "Đơn hàng mới cần xử lý",
      message: `Khách hàng vừa đặt đơn hàng thanh toán bằng ${payMethod}. Vui lòng xử lý đơn hàng.`,
      orderId: doc._id,
    });
  } catch (err) {
    console.log("[Notification] Lỗi gửi thông báo đơn hàng mới:", err.message);
  }

  // [NOTIFICATION] Thông báo cho khách hàng khi đặt hàng
  try {
    const payMethod = req.body.paymentInfo?.method || "tiền mặt";
    const isPaid = doc.paymentInfo?.status === "Paid";
    if (isPaid) {
      await createNotificationForUser({
        userId: req.user.id,
        type: "payment_success",
        title: "Thanh toán thành công",
        message: `Đơn hàng của bạn đã được đặt và thanh toán thành công qua ${payMethod}. Chúng tôi sẽ xử lý đơn hàng sớm nhất.`,
        orderId: doc._id,
      });
    } else {
      await createNotificationForUser({
        userId: req.user.id,
        type: "new_order",
        title: "Đặt hàng thành công",
        message: `Đơn hàng của bạn đã được đặt thành công. Vui lòng thanh toán khi nhận hàng.`,
        orderId: doc._id,
      });
    }
  } catch (err) {
    console.log("[Notification] Lỗi gửi thông báo đặt hàng cho khách:", err.message, err.stack);
  }

  await Product.bulkWrite(
    realCart.map((item) => ({
      updateOne: {
        filter: { _id: item.product, inventory: { $gte: item.quantity } },
        update: { $inc: { inventory: -item.quantity } },
      },
    }))
  );

  if (doc.paymentInfo?.method === "paypal") {
    try {
      const invoice =
        typeof doc.paymentInfo.invoicePayment === "string"
          ? JSON.parse(doc.paymentInfo.invoicePayment)
          : doc.paymentInfo.invoicePayment;

      await Transaction.create({
        user: req.user.id,
        order: doc._id,
        type: "payment",
        amount: doc.totalPrice,
        paymentMethod: "paypal",
        transactionCode: invoice?.id,
        status: doc.paymentInfo.status === "Paid" ? "success" : "pending",
        invoicePayment: invoice,
      });
    } catch (err) {
      console.log("Cannot save PayPal transaction:", err.message);
    }
  }

  const populatedDoc = await Order.findById(doc._id)
    .populate("user")
    .populate("cart.product");

  res.status(201).json({
    status: "success",
    data: { data: populatedDoc },
    id: doc._id,
    totalPrice: doc.totalPrice,
  });
});

exports.updateOrder = catchAsync(async (req, res, next) => {
  // ─── Hoàn kho nếu hủy đơn ───────────────────────────────────────────────
  if (req.body.status == "Cancelled" && req.order.status !== "Cancelled") {
    const cart = req.order.cart;
    for (const value of cart) {
      const productId = value.product._id || value.product;
      await Product.findByIdAndUpdate(productId, {
        $inc: { inventory: value.quantity },
      });
    }
  }

  const doc = await Order.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!doc) {
    return next(new AppError("Không tìm thấy dữ liệu với ID này", 404));
  }

  // ─── Lấy userId từ req.order (đã được populate bởi isOwner middleware) ──
  // KHÔNG query lại Order để tránh vấn đề populate không nhất quán
  const userId = req.order.user?._id || req.order.user;
  console.log("[Notification] updateOrder - status:", req.body.status, "| userId:", userId, "| orderId:", doc._id);

  // ─── Gửi email khi cập nhật trạng thái ───────────────────────────────────
  if (req.body.status) {
    try {
      const populatedOrder = await Order.findById(doc._id)
        .populate({ path: "user", select: "name email" })
        .populate("cart.product");

      if (populatedOrder && populatedOrder.user && populatedOrder.user.email) {
        const mailData = populatedOrder.toObject();
        mailData.address =
          mailData.address || mailData.shippingDetails?.address || "Chưa có địa chỉ";
        mailData.cart = (mailData.cart || []).map((item) => {
          const product = item.product || {};
          return {
            ...item,
            product: {
              ...product,
              images: product.images || (item.image ? [item.image] : []),
              title: product.title || item.title || "Sản phẩm",
              color: product.color || product.specs?.color || item.color || "",
              promotion: product.promotion || item.price || product.price || 0,
            },
          };
        });

        const domain = process.env.CLIENT_URL || "http://localhost:5173";
        const message = mailTemplate(mailData, domain);
        await sendEmail({
          email: populatedOrder.user.email,
          subject: "Cập nhật trạng thái đơn hàng",
          message,
        });
        console.log(`Đã gửi email cập nhật trạng thái đơn hàng đến ${populatedOrder.user.email}`);
      }
    } catch (err) {
      console.log("Lỗi gửi email cập nhật trạng thái đơn hàng:", err.message);
    }
  }

  // ─── Thông báo khi HỦY đơn ───────────────────────────────────────────────
  if (req.body.status === "Cancelled") {
    // Thông báo admin nếu PayPal
    try {
      const payMethod = req.order.paymentInfo?.method;
      if (payMethod === "paypal") {
        const userName = req.order.user?.name || "Khách hàng";
        await createNotificationForAdmins({
          type: "order_cancelled",
          title: "Đơn hàng bị hủy – Cần hoàn tiền PayPal",
          message: `${userName} đã hủy đơn hàng đã thanh toán qua PayPal. Vui lòng xử lý hoàn tiền trong trang Quản lý Hoàn tiền.`,
          orderId: doc._id,
        });
      }
    } catch (err) {
      console.log("[Notification] Lỗi gửi thông báo admin hủy đơn:", err.message);
    }

    // Thông báo khách hàng
    try {
      if (userId) {
        await createNotificationForUser({
          userId,
          type: "order_cancelled",
          title: "Đơn hàng đã bị hủy",
          message: `Đơn hàng của bạn đã bị hủy. Nếu bạn đã thanh toán qua PayPal, chúng tôi sẽ hoàn tiền trong thời gian sớm nhất.`,
          orderId: doc._id,
        });
        console.log("[Notification] ✓ Đã gửi thông báo hủy đơn cho user:", userId);
      } else {
        console.log("[Notification] WARN: Không tìm được userId để gửi thông báo hủy đơn");
      }
    } catch (err) {
      console.log("[Notification] Lỗi gửi thông báo hủy đơn cho khách:", err.message, err.stack);
    }
  }

  // ─── Thông báo khi đơn được XỬ LÝ (Processed) ───────────────────────────
  if (req.body.status === "Processed") {
    try {
      if (userId) {
        await createNotificationForUser({
          userId,
          type: "order_processed",
          title: "Đơn hàng đang được xử lý",
          message: `Đơn hàng của bạn đã được xác nhận và đang được chuẩn bị. Chúng tôi sẽ giao hàng sớm nhất có thể.`,
          orderId: doc._id,
        });
        console.log("[Notification] ✓ Đã gửi thông báo Processed cho user:", userId);
      }
    } catch (err) {
      console.log("[Notification] Lỗi gửi thông báo Processed:", err.message, err.stack);
    }
  }

  // ─── Thông báo khi đơn GIAO THÀNH CÔNG (Success) ─────────────────────────
  if (req.body.status === "Success") {
    try {
      if (userId) {
        await createNotificationForUser({
          userId,
          type: "order_success",
          title: "Đơn hàng đã giao thành công",
          message: `Đơn hàng của bạn đã được giao thành công. Cảm ơn bạn đã mua sắm tại LapTopShop!`,
          orderId: doc._id,
        });
        console.log("[Notification] ✓ Đã gửi thông báo Success cho user:", userId);
      }
    } catch (err) {
      console.log("[Notification] Lỗi gửi thông báo Success:", err.message, err.stack);
    }
  }

  return res.status(200).json({
    status: "success",
    data: { data: doc },
  });
});

exports.deleteOrder = factory.deleteOne(Order);
exports.isOwner = factory.checkPermission(Order);
exports.setUser = (req, res, next) => {
  if (!req.body.user) req.body.user = req.user;
  next();
};

exports.countStatus = catchAsync(async (req, res, next) => {
  const data = await Order.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  res.status(200).json(data);
});

exports.countStatusOption = catchAsync(async (req, res, next) => {
  const option = { status: "$status" };
  if (req.body.year) option.year = { $year: "$createdAt" };
  if (req.body.month) option.month = { $month: "$createdAt" };
  if (req.body.week) option.week = { $week: "$createdAt" };
  if (req.body.date) option.date = { $dayOfWeek: "$createdAt" };
  const data = await Order.aggregate([{ $group: { _id: option, count: { $sum: 1 } } }]);
  res.status(200).json(data);
});

exports.sumRevenueOption = catchAsync(async (req, res, next) => {
  const option = {};
  if (req.body.year) option.year = { $year: "$createdAt" };
  if (req.body.month) option.month = { $month: "$createdAt" };
  if (req.body.week) option.week = { $week: "$createdAt" };
  if (req.body.date) option.date = { $dayOfWeek: "$createdAt" };
  const data = await Order.aggregate([
    { $match: { status: "Success" } },
    { $group: { _id: option, total_revenue: { $sum: "$totalPrice" } } },
  ]);
  res.status(200).json(data);
});

exports.sumRevenue = catchAsync(async (req, res, next) => {
  const data = await Order.aggregate([
    { $match: { status: "Success" } },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        total_revenue_month: { $sum: "$totalPrice" },
      },
    },
  ]);
  res.status(200).json(data);
});

exports.topProduct = catchAsync(async (req, res, next) => {
  const option = { product: "$cart.product" };
  if (req.body.year) option.year = { $year: "$createdAt" };
  if (req.body.month) option.month = { $month: "$createdAt" };
  if (req.body.week) option.week = { $week: "$createdAt" };
  if (req.body.date) option.date = { $dayOfWeek: "$createdAt" };

  const data = await Order.aggregate([
    { $unwind: "$cart" },
    { $match: { status: "Success" } },
    {
      $group: {
        _id: option,
        quantity: { $sum: "$cart.quantity" },
        title: { $first: "$cart.title" },
        image: { $first: "$cart.image" },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "_id.product",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $addFields: { productDoc: { $arrayElemAt: ["$productInfo", 0] } } },
    {
      $addFields: {
        title: { $ifNull: ["$productDoc.title", "$title"] },
        image: { $ifNull: [{ $arrayElemAt: ["$productDoc.images", 0] }, "$image"] },
      },
    },
    { $project: { productInfo: 0, productDoc: 0 } },
    { $sort: { quantity: -1 } },
    { $limit: 5 },
  ]);
  res.status(200).json(data);
});

exports.countStatusInRange = catchAsync(async (req, res, next) => {
  const dateFrom = req.body.dateFrom;
  const dateTo = req.body.dateTo;
  const option = { status: "$status" };
  let dateStart = new Date(dateFrom);
  let dateEnd = new Date(dateTo);
  dateStart.setUTCHours(0, 0, 0, 0);
  dateEnd.setUTCHours(23, 59, 59, 999);
  const data = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: moment.utc(dateStart).toDate(),
          $lt: moment.utc(dateEnd).toDate(),
        },
      },
    },
    { $group: { _id: option, count: { $sum: 1 } } },
  ]);
  res.status(200).json(data);
});

exports.topProductInRange = catchAsync(async (req, res, next) => {
  const option = { product: "$cart.product" };
  const dateFrom = req.body.dateFrom;
  const dateTo = req.body.dateTo;
  let dateStart = new Date(dateFrom);
  let dateEnd = new Date(dateTo);
  dateStart.setUTCHours(0, 0, 0, 0);
  dateEnd.setUTCHours(23, 59, 59, 999);

  const data = await Order.aggregate([
    { $unwind: "$cart" },
    {
      $match: {
        status: "Success",
        createdAt: {
          $gte: moment.utc(dateStart).toDate(),
          $lt: moment.utc(dateEnd).toDate(),
        },
      },
    },
    {
      $group: {
        _id: option,
        quantity: { $sum: "$cart.quantity" },
        title: { $first: "$cart.title" },
        image: { $first: "$cart.image" },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "_id.product",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $addFields: { productDoc: { $arrayElemAt: ["$productInfo", 0] } } },
    {
      $addFields: {
        title: { $ifNull: ["$productDoc.title", "$title"] },
        image: { $ifNull: [{ $arrayElemAt: ["$productDoc.images", 0] }, "$image"] },
      },
    },
    { $project: { productInfo: 0, productDoc: 0 } },
    { $sort: { quantity: -1 } },
    { $limit: 5 },
  ]);
  res.status(200).json(data);
});

exports.sumInRange = catchAsync(async (req, res, next) => {
  const dateFrom = req.body.dateFrom;
  const dateTo = req.body.dateTo;
  let dateStart = new Date(dateFrom);
  let dateEnd = new Date(dateTo);
  dateStart.setUTCHours(0, 0, 0, 0);
  dateEnd.setUTCHours(23, 59, 59, 999);
  const data = await Order.aggregate([
    {
      $match: {
        status: "Success",
        createdAt: {
          $gte: moment.utc(dateStart).toDate(),
          $lt: moment.utc(dateEnd).toDate(),
        },
      },
    },
    { $group: { _id: null, total_revenue: { $sum: "$totalPrice" } } },
  ]);
  res.status(200).json(data);
});