import axiosClient from "./axiosClient";

const chatApi = {
  sendMessage(data) {
    const url = "/api/v1/chat/send";
    return axiosClient.post(url, data);
  },
  getConversations() {
    const url = "/api/v1/chat/conversations";
    return axiosClient.get(url);
  },
  getMessages(conversationId) {
    const url = `/api/v1/chat/conversations/${conversationId}`;
    return axiosClient.get(url);
  },
  deleteConversation(conversationId) {
    const url = `/api/v1/chat/conversations/${conversationId}`;
    return axiosClient.delete(url);
  },
};

export default chatApi;
