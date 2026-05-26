const mongoose = require("mongoose");
const Transaction = require("./transactionModel");
const User = require("./userModel");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Hóa đơn phải có người mua"],
    },
    shippingDetails: {
      receiver: {
        type: String,
        required: [true, "Hóa đơn mua hàng phải có thông tin người nhận"],
      },
      phone: {
        type: String,
        required: [true, "Hóa đơn mua hàng phải có số điện thoại người nhận"],
      },
      address: {
        type: String,
        required: [true, "Hóa đơn mua hàng phải có địa chỉ vận chuyển"],
      },
    },
    cart: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        title: String,
        price: Number,
        quantity: Number,
        image: String,
      },
    ],
    totalPrice: Number,
    status: {
      type: String,
      enum: {
        values: [
          "Cancelled",
          "Processed",
          "Waiting Goods",
          "Delivery",
          "Success",
        ],
      },
      default: "Processed",
    },
    paymentInfo: {
      method: {
        type: String,
        enum: {
          values: ["tiền mặt", "paypal"],
          message: "Phương thức thanh toán chỉ bao gồm tiền mặt hoặc paypal",
        },
        required: [true, "Phải có phương thức thanh toán"],
      },
      status: { type: String, default: "Pending" },
      invoicePayment: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

orderSchema.index({ "$**": "text" });

orderSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name email",
  });

  next();
});

orderSchema.post("findOneAndUpdate", async function (doc) {
  // Nếu đơn hàng không phải tiền mặt (tức là đã thanh toán qua Paypal) và bị hủy
  if (doc.paymentInfo && doc.paymentInfo.method === "paypal" && doc.status === "Cancelled") {
    await Transaction.create({
      user: doc.user._id.toString(),
      order: doc._id,
      type: "refund",
      amount: doc.totalPrice,
      paymentMethod: "paypal",
      transactionCode: `refund-${doc.id}`,
      status: "pending",
    });
  }
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
