const Conversation = require("../models/chatModel");

// Lấy danh sách hội thoại
exports.getConversations = async (req, res) => {
  const conversations = await Conversation.find({ userId: req.user?.id });

  res.status(200).json({
    status: "success",
    conversations,
  });
};

// Lấy messages của 1 conversation
exports.getMessages = async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);

  res.status(200).json({
    status: "success",
    messages: conversation?.messages || [],
  });
};

// Gửi message
exports.sendMessage = async (req, res) => {
  const { message, conversationId } = req.body;

  let conversation;

  if (conversationId) {
    conversation = await Conversation.findById(conversationId);
  }

  if (!conversation) {
    conversation = await Conversation.create({
      userId: req.user?.id,
      title: message.slice(0, 30),
      messages: [],
    });
  }

  // user message
  conversation.messages.push({
    role: "user",
    content: message,
  });

  // fake AI response
  const reply = {
    role: "assistant",
    content: "Xin chào 👋 mình có thể giúp gì cho bạn?",
  };

  conversation.messages.push(reply);

  await conversation.save();

  res.status(200).json({
    status: "success",
    conversationId: conversation._id,
    message: reply,
  });
};

// Xoá conversation
exports.deleteConversation = async (req, res) => {
  await Conversation.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
};