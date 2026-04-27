import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// ========================
// REQUEST INTERCEPTOR
// ========================
axiosClient.interceptors.request.use(
  (config) => {
    // có thể gắn token nếu cần
    // const token = localStorage.getItem("token");
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ========================
// RESPONSE INTERCEPTOR
// ========================
axiosClient.interceptors.response.use(
  (response) => {
    // backend trả { data: ... }
    return response.data;
  },
  (error) => {
    if (!error.response) {
      return Promise.reject(new Error("❌ Lỗi mạng / server không phản hồi"));
    }

    const { status, data, config } = error.response;

    console.error("❌ API ERROR:", {
      url: config?.url,
      status,
      message: data?.message,
    });

    // ========================
    // XỬ LÝ LỖI THEO STATUS
    // ========================
    if (status === 400) {
      return Promise.reject(new Error(data?.message || "Bad Request"));
    }

    if (status === 401) {
      return Promise.reject(new Error("Bạn chưa đăng nhập"));
    }

    if (status === 403) {
      return Promise.reject(new Error("Không có quyền truy cập"));
    }

    if (status === 404) {
      return Promise.reject(new Error("Không tìm thấy dữ liệu"));
    }

    if (status === 500) {
      return Promise.reject(new Error("Lỗi server, thử lại sau"));
    }

    return Promise.reject(new Error(data?.message || "Unknown error"));
  }
);

export default axiosClient;