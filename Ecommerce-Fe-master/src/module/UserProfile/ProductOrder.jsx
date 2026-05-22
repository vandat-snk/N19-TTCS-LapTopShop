// import React from "react";
// import { formatPrice } from "../../utils/formatPrice";

// const ProductOrder = ({ data }) => {
//   return (
//     <div className="flex flex-col items-start mt-5 w-full">
//       {data?.length > 0 &&
//         data.map((item, index) => (
//           <div
//             className="flex items-start justify-between w-full mb-4"
//             key={index}
//           >
//             <div className="flex items-start gap-x-2">
//               <img
//                 src={item?.image} /* ĐÃ SỬA: Lấy trực tiếp image từ item */
//                 alt=""
//                 className="w-[120px] h-[120px] object-cover rounded-md border"
//               />
//               <div className="flex flex-col items-start gap-y-2">
//                 <span className="text-base font-medium line-clamp-2">
//                   {item?.title} /* ĐÃ SỬA: Lấy trực tiếp title từ item */
//                 </span>
//                 <span className="text-sm text-gray-500">
//                   SKU: {item?.product} /* ĐÃ SỬA: product lúc này chứa thẳng mã chuỗi ID */
//                 </span>
//               </div>
//             </div>
//             <div className="flex flex-col items-end gap-y-1">
//               <span className="text-base font-medium text-red-500">
//                 {formatPrice(item?.price)} /* ĐÃ SỬA: Lấy giá đã lưu trong snapshot */
//               </span>
//               {/* Đã xóa phần line-through vì trong Model chỉ lưu 1 mức giá lúc mua */}
//               <span className="text-base font-medium text-gray-700">
//                 X{item?.quantity}
//               </span>
//             </div>
//           </div>
//         ))}
//     </div>
//   );
// };

// export default ProductOrder;

import React from "react";
import { formatPrice } from "../../utils/formatPrice";

const ProductOrder = ({ data }) => {
  return (
    <div className="flex flex-col items-start mt-5 w-full gap-y-5">
      {data?.length > 0 &&
        data.map((item, index) => {
          const product =
            item?.product && typeof item.product === "object"
              ? item.product
              : null;

          const productId = product?._id || item?.product || index;
          const title = item?.title || product?.title || "Sản phẩm";
          const image = item?.image || product?.images?.[0] || "";
          const price =
            item?.price || product?.promotion || product?.price || 0;
          const originalPrice = product?.price;

          return (
            <div
              className="flex items-start justify-between w-full border-b pb-5 last:border-b-0"
              key={`${productId}-${index}`}
            >
              <div className="flex items-start gap-x-2">
                {image && (
                  <img
                    src={image}
                    alt={title}
                    className="w-[120px] h-[120px] object-cover"
                  />
                )}

                <div className="flex flex-col items-start gap-y-2">
                  <span className="text-base font-medium">{title}</span>
                  <span className="text-sm">SKU: {productId}</span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-base font-medium">
                  {formatPrice(price)}
                </span>

                {originalPrice && originalPrice !== price && (
                  <span className="text-sm line-through">
                    {formatPrice(originalPrice)}
                  </span>
                )}

                <span className="text-base font-medium">X{item?.quantity}</span>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default ProductOrder;
