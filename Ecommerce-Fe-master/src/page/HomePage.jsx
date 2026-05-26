import React, { useEffect } from "react";
import Banner from "../components/banner/Banner";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import ProductListHome from "../module/product/ProductListHome";
import BackToTopButton from "../components/backtotop/BackToTopButton";
import ProductList from "../module/product/ProductList";
import { useDispatch, useSelector } from "react-redux";
import { getProduct } from "../redux/product/productSlice";
import { action_status } from "../utils/constants/status";
import { useState } from "react";
import SkeletonItem from "../components/skeleton/SkeletonItem";
import Skeleton from "../components/skeleton/Skeleton";

const HomePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { status, totalPage, product } = useSelector((state) => state.product);
  console.log("product:", product);
  const [page, setPage] = useState(1);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [dispatch]);

  useEffect(() => {
    function fetchDataProduct(page) {
      const limit = 50;
      const data = {
        page: page,
        limit: limit,
      };
      try {
        dispatch(getProduct(data));
      } catch (error) {
        console.log(error.message);
      }
    }
    fetchDataProduct(page);
  }, [page]);

  const handlePageClick = (values) => {
    setPage(values);
    window.scrollTo({
      top: 1750,
      behavior: "smooth",
    });
  };

  return (
    <>
      {status === action_status.LOADING && (
        <>
          <div className="container">
            <Skeleton className="w-full rounded-lg h-[400px] mt-10" />
          </div>{" "}
          <div className="container w-full rounded-lg bg-gray-200">
            <SkeletonItem className="my-10 grid-cols-5 p-5" totalItem={5} />
          </div>
          <div className="container w-full rounded-lg bg-gray-200">
            <SkeletonItem className="my-10 grid-cols-5 p-5" totalItem={5} />
          </div>
          <div className="my-20">
            <div className="container w-full rounded-lg bg-gray-200">
              <SkeletonItem className="my-5 grid-cols-5 p-5" totalItem={5} />
              <SkeletonItem className="my-5 grid-cols-5 p-5" totalItem={5} />
              <SkeletonItem className="my-5 grid-cols-5 p-5" totalItem={5} />
            </div>
            <div className="flex items-center justify-center container gap-x-5">
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="w-5 h-5 rounded-md" />
            </div>
          </div>
        </>
      )}
      {status === action_status.SUCCEEDED && (
        <>
          <Banner />
          <ProductListHome 
            data={product?.slice(0, 10)} 
            bg="bg1" 
            className="pt-20" 
          />
          <ProductListHome 
            data={[...(product || [])].sort((a, b) => (b.percent || 0) - (a.percent || 0)).slice(0, 10)} 
            bg="bg2" 
            className="pt-20" 
          />
          <ProductList
            data={product}
            handlePageClick={handlePageClick}
            page={page}
            totalPage={totalPage}
          />
          <BackToTopButton />
        </>
      )}
    </>
  );
};

export default HomePage;
