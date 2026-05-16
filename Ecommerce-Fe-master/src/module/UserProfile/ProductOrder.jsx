import React from "react";
import { formatPrice } from "../../utils/formatPrice";

const ProductOrder = ({ data }) => {
  return (
    <div className="flex flex-col items-start mt-5 w-full">
      {data?.length > 0 &&
        data.map((item, index) => (
          <div
            className="flex items-start justify-between w-full mb-4"
            key={index}
          >
            <div className="flex items-start gap-x-2">
              <img
                src={item?.image} /* ĐÃ SỬA: Lấy trực tiếp image từ item */
                alt=""
                className="w-[120px] h-[120px] object-cover rounded-md border"
              />
              <div className="flex flex-col items-start gap-y-2">
                <span className="text-base font-medium line-clamp-2">
                  {item?.title} /* ĐÃ SỬA: Lấy trực tiếp title từ item */
                </span>
                <span className="text-sm text-gray-500">
                  SKU: {item?.product} /* ĐÃ SỬA: product lúc này chứa thẳng mã chuỗi ID */
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-y-1">
              <span className="text-base font-medium text-red-500">
                {formatPrice(item?.price)} /* ĐÃ SỬA: Lấy giá đã lưu trong snapshot */
              </span>
              {/* Đã xóa phần line-through vì trong Model chỉ lưu 1 mức giá lúc mua */}
              <span className="text-base font-medium text-gray-700">
                X{item?.quantity}
              </span>
            </div>
          </div>
        ))}
    </div>
  );
};

export default ProductOrder;