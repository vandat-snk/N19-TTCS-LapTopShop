const express = require("express");
const router = express.Router();

const chatController = require("../controllers/chatController");

// tạo / gửi message
router.post("/chat/send", chatController.sendMessage);

// lấy danh sách hội thoại
router.get("/chat/conversations", chatController.getConversations);

// lấy messages
router.get("/chat/messages/:id", chatController.getMessages);

// xoá hội thoại
router.delete("/chat/conversations/:id", chatController.deleteConversation);

module.exports = router;