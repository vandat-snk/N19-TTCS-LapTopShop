import React from "react";
import ProgressBar from "../../components/progressbar/ProgressBar";
import { FaStar } from "react-icons/fa";

const StatisticFeedback = ({ data }) => {
  if (!data || data?.ratingsQuantity === 0) {
    return (
      <div className="w-[1200px] h-[250px] bg-[#f9fafb] rounded-lg mx-auto mt-6 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-16 h-16 text-gray-300 mb-3"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
        <h2 className="text-xl font-semibold text-gray-500">Chưa có đánh giá nào</h2>
        <p className="text-gray-400 mt-1">Hãy là người đầu tiên nhận xét sản phẩm này!</p>
      </div>
    );
  }

  const stars = Array(5).fill(0);
  return (
    <div className="w-[1200px] h-[350px] bg-white rounded-lg mx-auto mt-6 border-2 border-solid feelback">
      <div className="flex flex-col items-center justify-center border-r-2 border-solid">
        <span className="text-3xl font-bold">{data?.ratingsAverage} / 5</span>
        <span className="flex items-center justify-center gap-x-3 mt-3">
          {stars.map((item, index) => (
            <FaStar
              key={index}
              color={data?.ratingsAverage > index ? "#ffba5a" : "#e5e7eb"}
              size={20}
            />
          ))}
        </span>
        <span className="mt-3 text-xl text-gray-500">
          {data?.ratingsQuantity} đánh giá và nhận xét
        </span>
      </div>

      <div className="flex flex-col items-center justify-center gap-y-5">
        <div className="flex flex-row items-center justify-between gap-x-5">
          <span className="flex flex-row items-center gap-x-2">
            5 <FaStar color="#ffba5a" size={20} />
          </span>
          <ProgressBar
            value={(data?.eachRating?.["5_star"] / data?.ratingsQuantity) * 500 || 0}
          />
          <span className="w-20">{data?.eachRating?.["5_star"] || 0} đánh giá</span>
        </div>

        <div className="flex flex-row items-center justify-between gap-x-5">
          <span className="flex flex-row items-center gap-x-2">
            4 <FaStar color="#ffba5a" size={20} />
          </span>
          <ProgressBar
            value={(data?.eachRating?.["4_star"] / data?.ratingsQuantity) * 500 || 0}
          />
          <span className="w-20">{data?.eachRating?.["4_star"] || 0} đánh giá</span>
        </div>

        <div className="flex flex-row items-center justify-between gap-x-5">
          <span className="flex flex-row items-center gap-x-2">
            3 <FaStar color="#ffba5a" size={20} />
          </span>
          <ProgressBar
            value={(data?.eachRating?.["3_star"] / data?.ratingsQuantity) * 500 || 0}
          />
          <span className="w-20">{data?.eachRating?.["3_star"] || 0} đánh giá</span>
        </div>

        <div className="flex flex-row items-center justify-between gap-x-5">
          <span className="flex flex-row items-center gap-x-2">
            2 <FaStar color="#ffba5a" size={20} />
          </span>
          <ProgressBar
            value={(data?.eachRating?.["2_star"] / data?.ratingsQuantity) * 500 || 0}
          />
          <span className="w-20">{data?.eachRating?.["2_star"] || 0} đánh giá</span>
        </div>

        <div className="flex flex-row items-center justify-between gap-x-5">
          <span className="flex flex-row items-center gap-x-2">
            1 <FaStar color="#ffba5a" size={20} />
          </span>
          <ProgressBar
            value={(data?.eachRating?.["1_star"] / data?.ratingsQuantity) * 500 || 0}
          />
          <span className="w-20">{data?.eachRating?.["1_star"] || 0} đánh giá</span>
        </div>
      </div>
    </div>
  );
};

export default StatisticFeedback;