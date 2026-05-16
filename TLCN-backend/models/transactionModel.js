const mongoose = require("mongoose");
const User = require("./userModel");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Giao dịch phải liên kết với một người dùng"],
    },
    order: {
      type: mongoose.Schema.ObjectId,
      ref: "Order",
    },
    type: {
      type: String,
      enum: ["payment", "refund"],
      required: [true, "Phải xác định loại giao dịch (payment/refund)"],
    },
    amount: {
      type: Number,
      required: [true, "Không thể trống mục số tiền"],
      min: [1, "Số tiền phải lớn hơn 0"],
    },
    paymentMethod: {
      type: String,
      required: [true, "Phải có phương thức thanh toán"],
      enum: {
        values: ["tiền mặt", "paypal"],
        message: "Phương thức thanh toán không hợp lệ",
      },
    },
    transactionCode: String,
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    invoicePayment: Object,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;