import axiosClient from "./axiosClient";

const chatApi = {
  sendMessage(data) {
    return axiosClient.post("/api/v1/chat/send", data);
  },

  getConversations() {
    return axiosClient.get("/api/v1/chat/conversations");
  },

  // ✅ FIX Ở ĐÂY
  getMessages(conversationId) {
    return axiosClient.get(
      `/api/v1/chat/conversations/${conversationId}`
    );
  },

  deleteConversation(conversationId) {
    return axiosClient.delete(
      `/api/v1/chat/conversations/${conversationId}`
    );
  },
};

export default chatApi;