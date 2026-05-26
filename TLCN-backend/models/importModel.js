const mongoose = require("mongoose");
const Product = require('./productModel');
const importSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Hóa đơn nhập hàng phải từ admin hoặc nhân viên"],
    },
    invoice: [
      {
        product: { 
          type: mongoose.Schema.ObjectId, 
          ref: "Product" 
        },
        image: String,
        title: String,
        quantity: Number,
        price: Number,
      },
    ],
    totalPrice: Number,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

importSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name",
  });

  next();
});


importSchema.index({ "$**": "text" });

const Import = mongoose.model("Import", importSchema);

module.exports = Import;
