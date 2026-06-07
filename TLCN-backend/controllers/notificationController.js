const Notification = require("../models/notificationModel");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

/**
 * Tạo thông báo cho một user cụ thể
 */
const createNotificationForUser = async ({ userId, type, title, message, orderId, transactionId }) => {
  await Notification.create({
    recipient: userId,
    recipientRole: "user",
    type,
    title,
    message,
    orderId,
    transactionId,
  });
};

/**
 * Tạo thông báo cho tất cả admin và employee
 */
const createNotificationForAdmins = async ({ type, title, message, orderId, transactionId }) => {
  const admins = await User.find({ role: { $in: ["admin", "employee"] } }).select("_id");
  if (!admins.length) return;

  const notifications = admins.map((admin) => ({
    recipient: admin._id,
    recipientRole: "admin",
    type,
    title,
    message,
    orderId,
    transactionId,
  }));

  await Notification.insertMany(notifications);
};

// Export helpers để dùng trong các controller khác
exports.createNotificationForUser = createNotificationForUser;
exports.createNotificationForAdmins = createNotificationForAdmins;

/**
 * GET /api/v1/notifications
 * Lấy danh sách thông báo của user hiện tại (phân trang, mới nhất trước)
 */
exports.getMyNotifications = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ recipient: req.user.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalUnread = await Notification.countDocuments({
    recipient: req.user.id,
    isRead: false,
  });

  res.status(200).json({
    status: "success",
    results: notifications.length,
    totalUnread,
    data: { data: notifications },
  });
});

/**
 * PATCH /api/v1/notifications/:id/read
 * Đánh dấu một thông báo đã đọc
 */
exports.markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return next(new AppError("Không tìm thấy thông báo", 404));
  }

  res.status(200).json({ status: "success", data: { data: notification } });
});

/**
 * PATCH /api/v1/notifications/read-all
 * Đánh dấu tất cả thông báo của user đã đọc
 */
exports.markAllAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    { recipient: req.user.id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({ status: "success", message: "Đã đánh dấu tất cả là đã đọc" });
});

/**
 * DELETE /api/v1/notifications/:id
 * Xóa một thông báo
 */
exports.deleteNotification = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user.id,
  });

  if (!notification) {
    return next(new AppError("Không tìm thấy thông báo", 404));
  }

  res.status(204).json({ status: "success", data: null });
});