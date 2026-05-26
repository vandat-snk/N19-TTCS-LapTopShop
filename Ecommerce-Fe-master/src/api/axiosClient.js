import axios from "axios";
import StorageKeys from "../utils/constants/storage-keys"; 

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:5000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

axiosClient.interceptors.request.use(
  function (config) {
    const token = localStorage.getItem(StorageKeys.TOKEN);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

axiosClient.interceptors.response.use(
  function (response) {
    return response.data;
  },
  function (error) {
    const { config, status, data } = error.response;
    const URLs = [
      "/api/v1/users/signup",
      "/api/v1/users/login",
      "/api/v1/users/verify",
      "/api/v1/users/forgotPassword",
      "/api/v1/users/changeState",
      "/api/v1/users/logout",
      "/api/v1/users/verifyResetPass",
      "/api/v1/users/me",
      "/api/v1/users/resetPassword/:token",
      "/api/v1/users/updateMe",
      "/api/v1/users/createAddress",
      "/api/v1/users/me/address",
      "/api/v1/users/deleteAddress",
      "/api/v1/users/updateAddress",
      "/api/v1/users/updateMyPassword",
      "/api/v1/users/setDefaultAddress",
      "/api/v1/products",
      "/api/v1/reviews",
      "/api/v1/products/:id/reviews",
      "/api/v1/reviews/:id",
      "/api/v1/orders",
      "/api/v1/users/userLoginWith",
      "/api/v1/comments",
      "/api/v1/products/:id/comments?query",
      "/api/v1/comments/:id",
      "/api/v1/comments/setLike/:id",
    ];
    if (
      (URLs.includes(config.url) && status === 500) ||
      status == 400 ||
      status == 401 ||
      status == 404 ||
      status == 403
    ) {
      throw new Error(data.message);
    }
    return Promise.reject(error);
  }
);

export default axiosClient;