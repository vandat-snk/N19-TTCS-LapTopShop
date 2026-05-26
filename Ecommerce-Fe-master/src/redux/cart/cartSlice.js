import { createSlice } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import StorageKeys from "../../utils/constants/storage-keys";

const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem(StorageKeys.USER));
    return user?._id || user?.id || null;
  } catch (error) {
    return null;
  }
};

const getUserCartKey = (userId) => {
  return userId ? `cart_${userId}` : "cart_guest";
};

const getCartFromStorage = () => {
  const userId = getCurrentUserId();
  const cartKey = getUserCartKey(userId);

  return JSON.parse(localStorage.getItem(cartKey)) || [];
};

const saveCartToStorage = (cart) => {
  const userId = getCurrentUserId();
  const cartKey = getUserCartKey(userId);

  localStorage.setItem(cartKey, JSON.stringify(cart));
  localStorage.setItem("cart", JSON.stringify(cart));
};

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    cart: getCartFromStorage(),
  },
  reducers: {
    getCart(state) {
      state.cart = getCartFromStorage();
    },

    loadCartByUser(state, action) {
      const userId = action.payload;
      const cartKey = getUserCartKey(userId);
      const cart = JSON.parse(localStorage.getItem(cartKey)) || [];

      localStorage.setItem("cart", JSON.stringify(cart));
      state.cart = cart;
    },

    addToCart(state, action) {
      let cart = getCartFromStorage();

      const newItem = action.payload;
      const index = cart.findIndex((x) => x.id === newItem.id);

      if (index >= 0) {
        if (cart[index].quantity < newItem.product.inventory) {
          cart[index].quantity += newItem.quantity;
        } else {
          toast.dismiss();
          toast.warning("Chỉ còn 1 sản phẩm");
        }
      } else {
        cart.push(newItem);
      }

      saveCartToStorage(cart);
      state.cart = cart;
    },

    setQuantity(state, action) {
      let cart = getCartFromStorage();

      const { id, quantity } = action.payload;
      const index = cart.findIndex((x) => x.id === id);

      if (index >= 0) {
        cart[index].quantity = quantity;
      }

      saveCartToStorage(cart);
      state.cart = cart;
    },

    removeFromCart(state, action) {
      let cart = getCartFromStorage();

      const idNeedToRemove = action.payload;
      cart = cart.filter((x) => x.id !== idNeedToRemove);

      saveCartToStorage(cart);
      state.cart = cart;
    },

    resetCart(state) {
      // Chỉ reset giỏ hàng đang hiển thị sau khi logout.
      // Không xóa cart_${userId}, để login lại user đó còn lấy lại được.
      state.cart = [];
      localStorage.removeItem("cart");
    },
  },
});

const { actions, reducer } = cartSlice;

export const {
  addToCart,
  setQuantity,
  removeFromCart,
  getCart,
  loadCartByUser,
  resetCart,
} = actions;

export default reducer;