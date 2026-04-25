const express = require("express");
const chatController = require("../controllers/chatController");
const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect);

router.post("/send", chatController.sendMessage);
router.get("/conversations", chatController.getConversations);
router
  .route("/conversations/:id")
  .get(chatController.getMessages)
  .delete(chatController.deleteConversation);

module.exports = router;
