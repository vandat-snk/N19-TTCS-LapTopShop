const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Thông báo phải có người nhận"],
    },
    // "admin" nếu thông báo gửi cho tất cả admin/employee
    recipientRole: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    type: {
      type: String,
      enum: [
        "refund_success",
        "new_order",
        "order_cancelled",
        "order_processed",
        "order_success",
        "payment_success",
        "payment_failed",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    orderId: {
      type: mongoose.Schema.ObjectId,
      ref: "Order",
    },
    transactionId: {
      type: mongoose.Schema.ObjectId,
      ref: "Transaction",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;