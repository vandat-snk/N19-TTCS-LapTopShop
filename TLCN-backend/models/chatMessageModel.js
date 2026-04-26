const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.ObjectId,
      ref: "ChatConversation",
      required: [true, "Tin nhắn phải thuộc về một cuộc hội thoại"],
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: [true, "Tin nhắn phải có vai trò (user hoặc assistant)"],
    },
    content: {
      type: String,
      required: [true, "Tin nhắn không được để trống"],
    },
    productRefs: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
      },
    ],
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

chatMessageSchema.index({ conversation: 1, createdAt: 1 });

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

module.exports = ChatMessage;
