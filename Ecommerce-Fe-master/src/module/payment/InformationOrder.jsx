import React from "react";
import { formatPrice } from "../../utils/formatPrice";
import slugify from "slugify";
import { useNavigate } from "react-router-dom";

const InformationOrder = ({ data }) => {
  const navigate = useNavigate();

  const product = data?.product;
  const finalPrice = product?.promotion || product?.price;

  const handleClick = () => {
    const path = slugify(product?.title || "", { strict: true });
    navigate(`/${path}/${product?._id || data?.id}`);
  };

  return (
    <div className="flex items-center justify-between px-5 gap-x-5 py-5">
      <img
        src={product?.images?.[0]}
        alt=""
        className="w-[80px] h-[80px] border-2 border-solid"
      />

      <div className="flex flex-col justify-start items-start">
        <span
          className="text-sm line-clamp-2 hover:text-blue-800 cursor-pointer font-medium"
          onClick={handleClick}
          title={product?.title}
        >
          {product?.title}
        </span>

        <span className="text-sm text-[#a28faa]">
          Số lượng: {data?.quantity}
        </span>

        <span className="text-base font-semibold text-blue-700">
          {formatPrice(finalPrice)}
        </span>

        {product?.promotion && product?.promotion < product?.price && (
          <span className="text-sm text-[#a28faa] line-through">
            {formatPrice(product?.price)}
          </span>
        )}
      </div>
    </div>
  );
};

export default InformationOrder;
