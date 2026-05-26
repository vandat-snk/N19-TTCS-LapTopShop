import React, { useEffect } from "react";
import { formatPrice } from "../../utils/formatPrice";
import { PayPalButtons } from "@paypal/react-paypal-js";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { resetCart } from "../../redux/cart/cartSlice";
import orderApi from "../../api/orderApi";

const VND_PER_USD = 24000;

const PaymentBank = () => {
  const dataOrder = JSON.parse(localStorage.getItem("order"));
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    if (!dataOrder || !dataOrder.cart || dataOrder.cart.length === 0) {
      navigate("/cart");
      return;
    }
    if (
      localStorage.getItem("jwt") &&
      JSON.parse(localStorage.getItem("user")).active === "verify"
    ) {
      return navigate("/verify");
    }
    if (
      localStorage.getItem("jwt") === null &&
      JSON.parse(localStorage.getItem("user")) === null
    ) {
      return navigate("/sign-in");
    }
  }, []);
  return (
    <div className="mt-10">
      <div className="container mx-auto  bg-white rounded-lg flex flex-col p-12 justify-between">
        <span className="text-2xl font-semibold mx-auto">
          Thông tin đơn hàng
        </span>
        <div className="flex flex-col w-[1000px] mx-auto mt-16 gap-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xl font-medium">Nguời nhận:</span>
            <span className="text-xl font-medium">{dataOrder?.receiver}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xl font-medium">Số điện thoại:</span>
            <span className="text-xl font-medium">{dataOrder?.phone}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xl font-medium">Địa chỉ nhận hàng:</span>
            <span className="text-xl font-medium">{dataOrder?.address}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xl font-medium">Phương thức thanh toán:</span>
            <span className="text-xl font-medium">{dataOrder?.payments}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xl font-medium">
              Tổng số tiền cần thanh toán
            </span>
            <span className="text-2xl font-medium text-[#009245]">
              {formatPrice(dataOrder?.totalPrice)}
            </span>
          </div>
        </div>
      </div>
      <div className="mx-auto w-[800px] mt-10">
        <PayPalButtons
          style={{ shape: "pill" }}
          createOrder={async (data, actions) => {
            const quoteResponse = await orderApi.getCheckoutQuote(dataOrder);
            const quote = quoteResponse?.data || quoteResponse;
            const totalPrice = quote?.totalPrice || dataOrder?.totalPrice;
            const usdValue = Math.max(totalPrice / VND_PER_USD, 0.01).toFixed(
              2
            );

            localStorage.setItem(
              "order",
              JSON.stringify({
                ...dataOrder,
                totalPrice,
                subtotal: quote?.subtotal,
                discount: quote?.discount,
                isFirstOrder: quote?.isFirstOrder,
              })
            );

            return actions.order.create({
              purchase_units: [
                {
                  amount: {
                    currency_code: "USD",
                    value: usdValue,
                  },
                },
              ],
            });
          }}
          onApprove={async (data, actions) => {
            const order = await actions.order.capture();
            Swal.fire(
              "Thanh toán thành công!",
              "Cảm ơn bạn đã ủng hộ cửa hàng !!!",
              "success"
            );
            const data1 = {
              shippingDetails: dataOrder?.shippingDetails || {
                address: dataOrder?.address,
                phone: dataOrder?.phone,
                receiver: dataOrder?.receiver,
              },
              cart: dataOrder?.cart,
              totalPrice: dataOrder?.totalPrice,
              paymentInfo: {
                method:
                  dataOrder?.paymentInfo?.method ||
                  dataOrder?.payments ||
                  "paypal",
                status: "Paid",
                invoicePayment: JSON.stringify(order),
              },

              address:
                dataOrder?.address || dataOrder?.shippingDetails?.address,
              phone: dataOrder?.phone || dataOrder?.shippingDetails?.phone,
              receiver:
                dataOrder?.receiver || dataOrder?.shippingDetails?.receiver,
              payments: dataOrder?.payments || dataOrder?.paymentInfo?.method,
              invoicePayment: order,
            };
            try {
              await orderApi.createOrder(data1);

              if (dataOrder?.checkoutType === "cart") {
                dispatch(resetCart());
              } else {
                localStorage.removeItem("buyNowItem");
              }

              localStorage.removeItem("order");
              navigate("/account/orders");
            } catch (error) {
              toast.dismiss();
              toast.error(error.message || "Khong the tao don hang PayPal");
            }
          }}
          onError={(err) => {
            toast.dismiss();
            toast.error("Lỗi hệ thống thanh toán Paypal", {
              pauseOnHover: false,
            });
            console.log("Paypal checkout onError", err);
          }}
          onCancel={() => {
            navigate(-1);
          }}
        />
      </div>
    </div>
  );
};

export default PaymentBank;
