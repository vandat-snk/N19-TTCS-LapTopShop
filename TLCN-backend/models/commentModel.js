const mongoose = require("mongoose");
const Product = require("./productModel");

const CommentSchema = new mongoose.Schema(
  {
    content: { 
      type: String,
      required: [true, "Bình luận không thể để trống!"],
    },
    
    product: {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
      required: [true, "Vui lòng cung cấp sản phẩm Bình luận."],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Bình luận phải từ một người dùng nào đó"],
    },
    parent: {
      type: mongoose.Schema.ObjectId,
      ref: "Comment",
      default: null,
    },
    likes: [ 
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      }
    ],
    children: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Comment",
      },
    ],
  },
  {
    timestamps: true, 
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

CommentSchema.index({ "$**": "text" });

CommentSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name avatar role",
  })
    .populate({
      path: "children",
      select: "-__v",
    })
  next();
});

const Comment = mongoose.model("Comment", CommentSchema);

module.exports = Comment;