const mongoose = require("mongoose");
const Transaction = require("./transactionModel");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Đơn hàng phải liên kết với một người dùng"],
    },
    cart: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        title: String,
        image: String,
        price: Number,
        quantity: Number,
      },
    ],
    shippingDetails: {
      address: String,
      phone: String,
      receiver: String,
    },
    address: String,
    phone: String,
    receiver: String,
    totalPrice: {
      type: Number,
      required: [true, "Đơn hàng phải có giá"],
    },
    discount: {
      type: Number,
      default: 0,
    },
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
  // Nếu đơn hàng thanh toán qua PayPal và bị hủy → tạo refund transaction
  if (
    doc.paymentInfo &&
    doc.paymentInfo.method === "paypal" &&
    doc.status === "Cancelled"
  ) {
    // [FIX] Lấy userId an toàn: doc.user có thể là object (populated) hoặc ObjectId thuần
    const userId =
      doc.user?._id
        ? doc.user._id.toString()
        : doc.user?.toString?.() || doc.user;

    if (!userId) {
      console.error("[orderModel] Không xác định được userId khi tạo refund transaction, orderId:", doc._id);
      return;
    }

    // Lấy captureId từ invoicePayment để dùng sau khi hoàn tiền
    let captureId = null;
    try {
      const invoiceData =
        typeof doc.paymentInfo.invoicePayment === "string"
          ? JSON.parse(doc.paymentInfo.invoicePayment)
          : doc.paymentInfo.invoicePayment;
      captureId =
        invoiceData?.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;
    } catch (e) {
      console.error("[orderModel] Không parse được invoicePayment:", e.message);
      // Không parse được thì thôi, captureId = null
    }

    try {
      await Transaction.create({
        user: userId,
        order: doc._id,
        type: "refund",
        amount: doc.totalPrice,
        paymentMethod: "paypal",
        transactionCode: `refund-${doc._id}`,
        status: "pending",
        note: captureId ? `captureId: ${captureId}` : "Chưa tìm thấy captureId",
      });
    } catch (e) {
      console.error("[orderModel] Lỗi khi tạo refund transaction:", e.message);
    }
  }
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;