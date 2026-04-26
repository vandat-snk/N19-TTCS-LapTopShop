import React from "react";
import { useNavigate } from "react-router-dom";

const ChatProductCard = ({ product }) => {
  const navigate = useNavigate();
  const price = product.promotion || product.price;
  const hasPromotion = product.promotion && product.promotion < product.price;

  const handleClick = () => {
    const slug = product.title
      ?.toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");
    navigate(`/${slug}/${product._id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-all cursor-pointer mb-2"
      style={{ maxWidth: "380px" }}
    >
      <img
        src={product.images?.[0] || "https://placehold.co/60x60?text=Laptop"}
        alt={product.title}
        className="w-[60px] h-[60px] object-cover rounded-md flex-shrink-0"
      />
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-gray-800 line-clamp-1">
          {product.title}
        </span>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold text-red-500">
            {price?.toLocaleString("vi-VN")}đ
          </span>
          {hasPromotion && (
            <span className="text-xs text-gray-400 line-through">
              {product.price?.toLocaleString("vi-VN")}đ
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatProductCard;
