const Order = require("./../models/orderModel");
const factory = require("./handlerFactory");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const moment = require("moment");
const mailTemplate = require("./mailTemplate");
const Product = require("../models/productModel");
const sendEmail = require("../utils/email");
const Transaction = require("../models/transactionModel");

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
  // 1. Lấy giỏ hàng từ Frontend gửi lên
  const incomingCart = req.body.cart;
  if (!incomingCart || incomingCart.length === 0) {
    return next(new AppError("Giỏ hàng trống!", 400));
  }

  // 2. QUERY VÀO DATABASE ĐỂ CHỐT GIÁ (SNAPSHOT) - KHÔNG TIN TƯỞNG FRONTEND
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

      // LẤY GIÁ TỪ DATABASE: Ưu tiên giá promotion, nếu không có thì lấy price
      if (quantity > product.inventory) {
        const name =
          product.title.length > 39 ? product.title.slice(0, 40) : product.title;
        throw new AppError(`So luong hang ${name} trong kho khong du`, 400);
      }

      const finalItemPrice = product.promotion
        ? product.promotion
        : product.price;

      calculatedTotalPrice += finalItemPrice * quantity;

      // Trả về Object để nhúng (Embed) vào đơn hàng
      return {
        product: product._id,
        title: product.title,
        image: product.images[0],
        quantity,
        price: finalItemPrice, // Giá đã được chốt cứng tại Server
      };
    })
  );

  // 3. Xử lý giảm giá 15% cho đơn đầu tiên
  const orderHistoryCount = await Order.countDocuments({
    user: req.user.id,
    status: { $ne: "Cancelled" },
  });

  if (orderHistoryCount === 0) {
    calculatedTotalPrice = Math.round(calculatedTotalPrice * 0.85);
    console.log(
      `Đơn hàng đầu tiên của ${req.user.name}, đã áp dụng giảm giá 15%!`
    );
  }

  // 4. Ghi đè dữ liệu an toàn vào req.body trước khi lưu
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
    const invoicePayment =
      req.body.paymentInfo?.invoicePayment ||
      (req.body.invoicePayment
        ? JSON.stringify(req.body.invoicePayment)
        : undefined);

    req.body.paymentInfo = {
      method: paymentMethod,
      status:
        req.body.paymentInfo?.status ||
        (paymentMethod === "paypal" && invoicePayment ? "Paid" : "pending"),
      invoicePayment,
    };
  }

  // 5. Tạo đơn hàng
  const doc = await Order.create(req.body);

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
    data: {
      data: populatedDoc,
    },
    id: doc._id,
    totalPrice: doc.totalPrice,
  });
});

exports.updateOrder = catchAsync(async (req, res, next) => {
  if (req.body.status == "Cancelled") {
    const cart = req.order.cart;
    for (const value of cart) {
      await Product.findByIdAndUpdate(value.product._id, {
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

  // Bổ sung: chỉ gửi mail khi có cập nhật trạng thái đơn hàng
  if (req.body.status) {
    try {
      // Lấy lại đơn hàng đầy đủ user và product để template mail cũ đọc được
      const populatedOrder = await Order.findById(doc._id)
        .populate({
          path: "user",
          select: "name email",
        })
        .populate("cart.product");

      if (populatedOrder && populatedOrder.user && populatedOrder.user.email) {
        // Chuyển sang object thường để bổ sung field address cho mailTemplate cũ
        const mailData = populatedOrder.toObject();

        // mailTemplate cũ đang đọc data.address,
        // còn Order mới đang lưu địa chỉ trong shippingDetails.address
        mailData.address =
          mailData.address ||
          mailData.shippingDetails?.address ||
          "Chưa có địa chỉ";

        // Đảm bảo cart có dữ liệu đúng cho template cũ
        mailData.cart = (mailData.cart || []).map((item) => {
          const product = item.product || {};

          return {
            ...item,
            product: {
              ...product,
              images: product.images || (item.image ? [item.image] : []),
              title: product.title || item.title || "Sản phẩm",
              color:
                product.color ||
                product.specs?.color ||
                item.color ||
                "",
              promotion:
                product.promotion ||
                item.price ||
                product.price ||
                0,
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

        console.log(
          `Đã gửi email cập nhật trạng thái đơn hàng đến ${populatedOrder.user.email}`
        );
      } else {
        console.log("Không gửi email vì đơn hàng không có email người dùng.");
      }
    } catch (err) {
      console.log("Lỗi gửi email cập nhật trạng thái đơn hàng:", err.message);
    }
  }

  return res.status(200).json({
    status: "success",
    data: {
      data: doc,
    },
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
  const option = {
    status: "$status",
  };
  if (req.body.year) option.year = { $year: "$createdAt" };
  if (req.body.month) option.month = { $month: "$createdAt" };
  if (req.body.week) option.week = { $week: "$createdAt" };
  if (req.body.date) option.date = { $dayOfWeek: "$createdAt" };
  const data = await Order.aggregate([
    {
      $group: {
        _id: option,
        count: { $sum: 1 },
      },
    },
  ]);
  res.status(200).json(data);
});
exports.sumRevenueOption = catchAsync(async (req, res, next) => {
  const option = {};
  if (req.body.year) option.year = { $year: "$createdAt" };
  if (req.body.month) option.month = { $month: "$createdAt" };
  if (req.body.week) option.week = { $week: "$createdAt" };
  if (req.body.date) option.date = { $dayOfWeek: "$createdAt" };
  const data = await Order.aggregate([
    {
      $match: { status: "Success" },
    },
    {
      $group: {
        _id: option,
        total_revenue: { $sum: "$totalPrice" },
        // bookings_month: {
        //   $push: {
        //     each_order: "$totalPrice",
        //   },
        // },
      },
    },
  ]);
  res.status(200).json(data);
});
exports.sumRevenue = catchAsync(async (req, res, next) => {
  const data = await Order.aggregate([
    {
      $match: { status: "Success" },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        total_revenue_month: { $sum: "$totalPrice" },
        // bookings_month: {
        //   $push: {
        //     each_order: "$totalPrice",
        //   },
        // },
      },
    },
  ]);
  res.status(200).json(data);
});
exports.topProduct = catchAsync(async (req, res, next) => {
  const option = {
    product: "$cart.product.id",
  };
  if (req.body.year) option.year = { $year: "$createdAt" };
  if (req.body.month) option.month = { $month: "$createdAt" };
  if (req.body.week) option.week = { $week: "$createdAt" };
  if (req.body.date) option.date = { $dayOfWeek: "$createdAt" };

  const data = await Order.aggregate([
    {
      $unwind: "$cart",
    },
    {
      $match: { status: "Success" },
    },
    {
      $group: {
        _id: option,
        quantity: { $sum: "$cart.quantity" },
        title: { $first: "$cart.title" },
        image: { $first: "$cart.image" },
      },
    },
    { $sort: { quantity: -1 } },
    { $limit: 5 },
  ]);
  res.status(200).json(data);
});

exports.countStatusInRange = catchAsync(async (req, res, next) => {
  const dateFrom = req.body.dateFrom;
  const dateTo = req.body.dateTo;
  const option = {
    status: "$status",
  };
  let dateStart = new Date(dateFrom);
  dateStart;
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
    {
      $group: {
        _id: option,
        count: { $sum: 1 },
      },
    },
  ]);
  res.status(200).json(data);
});
exports.topProductInRange = catchAsync(async (req, res, next) => {
  const option = {
    product: "$cart.product.id",
  };
  const dateFrom = req.body.dateFrom;
  const dateTo = req.body.dateTo;
  let dateStart = new Date(dateFrom);
  dateStart;
  let dateEnd = new Date(dateTo);
  dateStart.setUTCHours(0, 0, 0, 0);
  dateEnd.setUTCHours(23, 59, 59, 999);
  const data = await Order.aggregate([
    {
      $unwind: "$cart",
    },
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
    { $sort: { quantity: -1 } },
    { $limit: 5 },
  ]);
  res.status(200).json(data);
});
exports.sumInRange = catchAsync(async (req, res, next) => {
  const dateFrom = req.body.dateFrom;
  const dateTo = req.body.dateTo;
  let dateStart = new Date(dateFrom);
  dateStart;
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
    {
      $group: {
        _id: null,
        total_revenue: { $sum: "$totalPrice" },
        // bookings_month: {
        //   $push: {
        //     each_order: "$totalPrice",
        //   },
        // },
      },
    },
  ]);
  res.status(200).json(data);
});
