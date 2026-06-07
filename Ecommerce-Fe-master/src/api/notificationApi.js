import axiosClient from "./axiosClient";

const notificationApi = {
  getMyNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `/api/v1/notifications${query ? `?${query}` : ""}`;
    return axiosClient.get(url);
  },
  markAsRead(id) {
    const url = `/api/v1/notifications/${id}/read`;
    return axiosClient.patch(url);
  },
  markAllAsRead() {
    const url = `/api/v1/notifications/read-all`;
    return axiosClient.patch(url);
  },
  deleteNotification(id) {
    const url = `/api/v1/notifications/${id}`;
    return axiosClient.delete(url);
  },
};

export default notificationApi;