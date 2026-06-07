import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import notificationApi from "../../api/notificationApi";

export const fetchNotifications = createAsyncThunk(
  "notification/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      // axiosClient interceptor đã unwrap response.data rồi
      // nên res = { status, results, totalUnread, data: { data: [...] } }
      const res = await notificationApi.getMyNotifications({ limit: 20 });
      return res; // trả về cả object gốc để lấy được totalUnread
    } catch (err) {
      // axiosClient throw Error object (không có .response), lấy message trực tiếp
      return rejectWithValue(err.message || "Lỗi tải thông báo");
    }
  }
);

export const markOneRead = createAsyncThunk(
  "notification/markOne",
  async (id, { rejectWithValue }) => {
    try {
      await notificationApi.markAsRead(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.message || err.response?.data?.message);
    }
  }
);

export const markAllRead = createAsyncThunk(
  "notification/markAll",
  async (_, { rejectWithValue }) => {
    try {
      await notificationApi.markAllAsRead();
      return true;
    } catch (err) {
      return rejectWithValue(err.message || err.response?.data?.message);
    }
  }
);

export const removeNotification = createAsyncThunk(
  "notification/remove",
  async (id, { rejectWithValue }) => {
    try {
      await notificationApi.deleteNotification(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.message || err.response?.data?.message);
    }
  }
);

const notificationSlice = createSlice({
  name: "notification",
  initialState: {
    list: [],
    totalUnread: 0,
    loading: false,
    error: null,
  },
  reducers: {
    resetNotifications(state) {
      state.list = [];
      state.totalUnread = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        // res = { status, results, totalUnread, data: { data: [...] } }
        state.list = action.payload.data?.data || [];
        state.totalUnread = action.payload.totalUnread || 0;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markOneRead.fulfilled, (state, action) => {
        const id = action.payload;
        const notif = state.list.find((n) => n._id === id);
        if (notif && !notif.isRead) {
          notif.isRead = true;
          state.totalUnread = Math.max(0, state.totalUnread - 1);
        }
      })
      .addCase(markAllRead.fulfilled, (state) => {
        state.list.forEach((n) => (n.isRead = true));
        state.totalUnread = 0;
      })
      .addCase(removeNotification.fulfilled, (state, action) => {
        const id = action.payload;
        const notif = state.list.find((n) => n._id === id);
        if (notif && !notif.isRead) state.totalUnread = Math.max(0, state.totalUnread - 1);
        state.list = state.list.filter((n) => n._id !== id);
      });
  },
});

export const { resetNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;