const mongoose = require("mongoose");

const chatConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Cuộc hội thoại phải thuộc về một người dùng"],
    },
    title: {
      type: String,
      default: "Cuộc trò chuyện mới",
      maxlength: 100,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

chatConversationSchema.index({ user: 1, updatedAt: -1 });

chatConversationSchema.virtual("messages", {
  ref: "ChatMessage",
  foreignField: "conversation",
  localField: "_id",
});

const ChatConversation = mongoose.model("ChatConversation", chatConversationSchema);

module.exports = ChatConversation;
