const Transaction = require("./../models/transactionModel");
const Order = require("./../models/orderModel");
const factory = require("./handlerFactory");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const https = require("https");
const { createNotificationForUser } = require("./notificationController");

// ─── Helper: HTTP request dùng https built-in ────────────────────────────
const httpRequest = (url, options = {}, bodyData = null) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = https.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on("error", reject);

    if (bodyData) req.write(bodyData);
    req.end();
  });
};

// ─── Lấy PayPal Access Token ──────────────────────────────────────────────
const getPayPalAccessToken = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const baseUrl = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const data = await httpRequest(
    `${baseUrl}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
    },
    "grant_type=client_credentials"
  );

  if (!data.access_token) {
    throw new Error("Không thể lấy PayPal access token: " + JSON.stringify(data));
  }
  return { accessToken: data.access_token, baseUrl };
};

// ─── Gọi PayPal Refund API ────────────────────────────────────────────────
const refundPayPalCapture = async (captureId, amountUSD) => {
  const { accessToken, baseUrl } = await getPayPalAccessToken();

  const body = amountUSD
    ? JSON.stringify({ amount: { value: amountUSD.toFixed(2), currency_code: "USD" } })
    : "{}";

  const data = await httpRequest(
    `${baseUrl}/v2/payments/captures/${captureId}/refund`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Length": Buffer.byteLength(body),
      },
    },
    body
  );

  if (data.status !== "COMPLETED") {
    throw new Error("PayPal refund thất bại: " + JSON.stringify(data));
  }
  return data;
};

// ─── Helper: lấy userId an toàn từ transaction (có fallback sang order) ──
const resolveUserId = async (transaction) => {
  // Trường hợp 1: transaction.user đã có giá trị
  if (transaction.user) {
    return transaction.user._id || transaction.user;
  }
  // Trường hợp 2: fallback - lấy user từ order
  if (transaction.order) {
    const orderId = transaction.order._id || transaction.order;
    const ord = await Order.findById(orderId).select("user").lean();
    if (ord?.user) return ord.user;
  }
  return null;
};

// ─── Ghi nhận trạng thái thanh toán PayPal ───────────────────────────────
exports.returnPaypalStatus = catchAsync(async (req, res, next) => {
  const newRecord = {
    user: req.user,
    amount: req.body.amount,
    type: "payment",
    paymentMethod: "paypal",
    transactionCode: req.body.transactionCode,
    status: "success",
    invoicePayment: req.body.invoicePayment,
  };
  await Transaction.create(newRecord);
  res.status(201).json({ message: "success" });
});

exports.getListPayments = factory.getAll(Transaction);

exports.setUser = catchAsync(async (req, res, next) => {
  if (req.user.role !== "admin") req.query.user = req.user.id;
  next();
});

// ─── Lấy danh sách refund ────────────────────────────────────────────────
exports.getRefunds = catchAsync(async (req, res, next) => {
  const refunds = await Transaction.find({ type: "refund" })
    .populate({ path: "user", select: "name email" })
    .populate({ path: "order", select: "_id totalPrice status" })
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: refunds.length,
    data: { data: refunds },
  });
});

// ─── Tạo PayPal Order để admin xác nhận qua popup PayPal ─────────────────
exports.createRefundPaypalOrder = catchAsync(async (req, res, next) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    type: "refund",
  });

  if (!transaction) {
    return next(new AppError("Không tìm thấy giao dịch hoàn tiền", 404));
  }
  if (transaction.status === "success") {
    return next(new AppError("Giao dịch này đã hoàn tiền thành công.", 400));
  }

  const { accessToken, baseUrl } = await getPayPalAccessToken();

  const VND_PER_USD = 24000;
  const amountUSD = Math.max(transaction.amount / VND_PER_USD, 0.01).toFixed(2);

  const host = `${req.protocol}://${req.get("host")}`;
  const returnUrl = `${host}/api/v1/payments/refunds/${transaction._id}/paypal-callback?action=capture`;
  const cancelUrl = `${host}/refunds?cancelled=1`;

  const body = JSON.stringify({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: { currency_code: "USD", value: amountUSD },
        description: `Hoan tien don hang - Ref: ${transaction._id}`,
      },
    ],
    application_context: {
      brand_name: "LapTopShop Admin - Hoan tien",
      locale: "vi-VN",
      user_action: "PAY_NOW",
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  });

  const order = await httpRequest(
    `${baseUrl}/v2/checkout/orders`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Length": Buffer.byteLength(body),
      },
    },
    body
  );

  if (!order.id) {
    return next(new AppError("Không thể tạo PayPal Order: " + JSON.stringify(order), 502));
  }

  const approveLink = order.links.find((l) => l.rel === "approve");
  if (!approveLink) {
    return next(new AppError("Không tìm thấy PayPal approve URL", 502));
  }

  transaction.note = `paypal_order_id:${order.id}`;
  await transaction.save();

  res.status(200).json({
    status: "success",
    data: {
      approveUrl: approveLink.href,
      paypalOrderId: order.id,
      amountUSD,
    },
  });
});

// ─── PayPal callback sau khi admin approve ────────────────────────────────
exports.paypalRefundCallback = catchAsync(async (req, res, next) => {
  const { token: paypalOrderId } = req.query;

  if (!paypalOrderId) {
    return res.redirect("/refunds?error=missing_token");
  }

  // populate("order") để resolveUserId có thể fallback lấy user từ order
  const transaction = await Transaction.findById(req.params.id).populate("order");
  if (!transaction) {
    return res.redirect("/refunds?error=not_found");
  }
  if (transaction.status === "success") {
    return res.redirect("/refunds?already=1");
  }

  const { accessToken, baseUrl } = await getPayPalAccessToken();

  // Capture PayPal Order
  const captureResult = await httpRequest(
    `${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Length": "2",
      },
    },
    "{}"
  );

  if (captureResult.status !== "COMPLETED") {
    transaction.status = "failed";
    transaction.note = "PayPal capture thất bại: " + JSON.stringify(captureResult);
    await transaction.save();

    // [NOTIFICATION] Thông báo cho user khi hoàn tiền thất bại
    try {
      const userId = await resolveUserId(transaction);
      console.log("[Notification] paypalCallback FAILED - userId:", userId, "| txId:", transaction._id);
      if (userId) {
        await createNotificationForUser({
          userId,
          type: "payment_failed",
          title: "Hoàn tiền thất bại",
          message: `Yêu cầu hoàn tiền cho đơn hàng của bạn gặp lỗi. Vui lòng liên hệ chúng tôi để được hỗ trợ.`,
          orderId: transaction.order?._id || transaction.order,
          transactionId: transaction._id,
        });
        console.log("[Notification] ✓ Đã gửi thông báo hoàn tiền thất bại cho user:", userId);
      } else {
        console.log("[Notification] WARN: Không tìm được userId - bỏ qua thông báo hoàn tiền thất bại");
      }
    } catch (err) {
      console.log("[Notification] Lỗi gửi thông báo hoàn tiền thất bại:", err.message, err.stack);
    }

    return res.redirect("/refunds?error=capture_failed");
  }

  // Thành công
  const captureId = captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.id || "";
  transaction.status = "success";
  transaction.note = `PayPal capture ID: ${captureId}`;
  transaction.invoicePayment = captureResult;
  await transaction.save();

  // [NOTIFICATION] Thông báo cho user khi hoàn tiền thành công
  try {
    const userId = await resolveUserId(transaction);
    console.log("[Notification] paypalCallback SUCCESS - userId:", userId, "| txId:", transaction._id);
    if (userId) {
      await createNotificationForUser({
        userId,
        type: "refund_success",
        title: "Hoàn tiền thành công",
        message: `Yêu cầu hoàn tiền cho đơn hàng của bạn đã được xử lý thành công. Số tiền đã được hoàn về tài khoản PayPal của bạn.`,
        orderId: transaction.order?._id || transaction.order,
        transactionId: transaction._id,
      });
      console.log("[Notification] ✓ Đã gửi thông báo hoàn tiền thành công cho user:", userId);
    } else {
      console.log("[Notification] WARN: Không tìm được userId - bỏ qua thông báo hoàn tiền thành công");
    }
  } catch (err) {
    console.log("[Notification] Lỗi gửi thông báo hoàn tiền thành công:", err.message, err.stack);
  }

  // Redirect về trang admin với thông báo thành công
  return res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Refund Success</title>
</head>
<body style="font-family:Arial;text-align:center;padding:40px">
  <h3>✅ Hoàn tiền thành công</h3>
  <p>Cửa sổ sẽ tự đóng sau 2 giây...</p>

  <script>
    if (window.opener && !window.opener.closed) {
      window.opener.location.reload();
    }

    setTimeout(() => {
      window.close();
    }, 2000);
  </script>
</body>
</html>
`);
});

// ─── Xử lý hoàn tiền tự động qua PayPal (retry server-side) ─────────────
exports.updateRefundStatus = catchAsync(async (req, res, next) => {
  const { note } = req.body;

  const transaction = await Transaction.findOne({
    _id: req.params.id,
    type: "refund",
  }).populate("order");

  if (!transaction) {
    return next(new AppError("Không tìm thấy giao dịch hoàn tiền", 404));
  }

  if (transaction.status === "success") {
    return next(new AppError("Giao dịch này đã hoàn tiền thành công, không thể thực hiện lại.", 400));
  }

  if (transaction.status === "failed") {
    transaction.status = "pending";
    transaction.note = "";
    await transaction.save();
  }

  if (!transaction.order) {
    return next(new AppError("Giao dịch này không liên kết với đơn hàng nào", 400));
  }

  const orderId = transaction.order?._id || transaction.order;
  const order = await Order.findById(orderId).select("paymentInfo totalPrice");

  if (!order) {
    return next(new AppError("Không tìm thấy đơn hàng liên kết với giao dịch này", 404));
  }

  if (!order.paymentInfo?.invoicePayment) {
    return next(new AppError("Không tìm thấy thông tin thanh toán PayPal của đơn hàng", 400));
  }

  let invoiceData;
  try {
    invoiceData =
      typeof order.paymentInfo.invoicePayment === "string"
        ? JSON.parse(order.paymentInfo.invoicePayment)
        : order.paymentInfo.invoicePayment;
  } catch (e) {
    return next(new AppError("Dữ liệu invoicePayment không hợp lệ (không thể parse JSON)", 400));
  }

  const captureId = invoiceData?.purchase_units?.[0]?.payments?.captures?.[0]?.id;

  if (!captureId) {
    return next(
      new AppError(
        "Không tìm thấy captureId trong dữ liệu PayPal. Keys hiện có: " +
          JSON.stringify(Object.keys(invoiceData || {})),
        400
      )
    );
  }

  let paypalResult;
  try {
    const VND_PER_USD = 24000;
    const amountUSD = Math.max(transaction.amount / VND_PER_USD, 0.01);
    paypalResult = await refundPayPalCapture(captureId, amountUSD);
  } catch (err) {
    transaction.status = "failed";
    transaction.note = err.message;
    await transaction.save();

    // [NOTIFICATION] Thông báo cho user khi hoàn tiền thất bại
    try {
      const userId = await resolveUserId(transaction);
      console.log("[Notification] updateRefund FAILED - userId:", userId, "| txId:", transaction._id);
      if (userId) {
        await createNotificationForUser({
          userId,
          type: "payment_failed",
          title: "Hoàn tiền thất bại",
          message: `Yêu cầu hoàn tiền cho đơn hàng của bạn gặp lỗi. Vui lòng liên hệ chúng tôi để được hỗ trợ.`,
          orderId: transaction.order?._id || transaction.order,
          transactionId: transaction._id,
        });
        console.log("[Notification] ✓ Đã gửi thông báo hoàn tiền thất bại cho user:", userId);
      } else {
        console.log("[Notification] WARN: Không tìm được userId - bỏ qua thông báo hoàn tiền thất bại");
      }
    } catch (notifErr) {
      console.log("[Notification] Lỗi gửi thông báo hoàn tiền thất bại:", notifErr.message, notifErr.stack);
    }

    return next(new AppError("Hoàn tiền PayPal thất bại: " + err.message, 502));
  }

  transaction.status = "success";
  transaction.note = note || `PayPal refund ID: ${paypalResult.id}`;
  transaction.invoicePayment = paypalResult;
  await transaction.save();

  // [NOTIFICATION] Thông báo cho user khi hoàn tiền thành công
  try {
    const userId = await resolveUserId(transaction);
    console.log("[Notification] updateRefund SUCCESS - userId:", userId, "| txId:", transaction._id);
    if (userId) {
      await createNotificationForUser({
        userId,
        type: "refund_success",
        title: "Hoàn tiền thành công",
        message: `Yêu cầu hoàn tiền cho đơn hàng của bạn đã được xử lý thành công. Số tiền đã được hoàn về tài khoản PayPal của bạn.`,
        orderId: transaction.order?._id || transaction.order,
        transactionId: transaction._id,
      });
      console.log("[Notification] ✓ Đã gửi thông báo hoàn tiền thành công cho user:", userId);
    } else {
      console.log("[Notification] WARN: Không tìm được userId - bỏ qua thông báo hoàn tiền thành công");
    }
  } catch (err) {
    console.log("[Notification] Lỗi gửi thông báo hoàn tiền thành công:", err.message, err.stack);
  }

  res.status(200).json({
    status: "success",
    message: "Hoàn tiền PayPal thành công!",
    data: { data: transaction, paypalRefundId: paypalResult.id },
  });
});