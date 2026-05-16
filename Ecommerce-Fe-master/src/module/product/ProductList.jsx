import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProductItem from "./ProductItem";
import slugify from "slugify";
import Pagination from "react-js-pagination";
import ModalAdvanced from "../../components/Modal/ModalAdvanced";
import { formatPrice } from "../../utils/formatPrice";
import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";
import { calculateScore, generateRealLifeSuggestion } from "../../utils/calculateScore";

const ProductList = ({ data, handlePageClick, page, totalPage }) => {
  const navigate = useNavigate();
  const bodyStyle = document.body.style;
  const [showModal, setShowModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  const handleClick = (item) => {
    const path = slugify(item.title, { strict: true });
    navigate(`/${path}/${item._id}`);
  };

  const addToCompare = (item) => {
    if (selectedItems.length < 2) {
      setSelectedItems((prev) => [...prev, item]);
    }
  };

  useEffect(() => {
    if (selectedItems.length === 2) {
      setShowModal(true);
    }
  }, [selectedItems]);

  useEffect(() => {
    if (showModal === true) {
      disableBodyScroll(bodyStyle);
    } else {
      enableBodyScroll(bodyStyle);
    }
  }, [showModal, bodyStyle]);

  const removeFromCompare = (item) => {
    const filteredItems = selectedItems.filter(
      (product) => product._id !== item._id
    );
    setSelectedItems(filteredItems);
  };

  return (
    <>
      <div className="mt-20">
        <div className="flex flex-col container rounded-lg bg-white ">
          <div className="flex items-center justify-between p-5 ">
            <span className="font-bold text-xl">Laptop</span>
            <div className="flex items-center gap-x-1 cursor-pointer">
              <span
                className="text-base text-[#a497a2] font-semibold "
                onClick={() => navigate("/product")}
              >
                Xem tất cả
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </div>
          </div>
          <div className="grid-cols-5 grid gap-y-2 pb-10 items-stretch">
            {data?.length > 0 &&
              data?.map((item, index) => (
                <ProductItem
                  product={item}
                  onClickItem={() => handleClick(item)}
                  key={index}
                  className="border-2 border-solid border-[#f6f6f6]"
                  selected={selectedItems}
                  addToCompare={addToCompare}
                  removeFromCompare={removeFromCompare}
                />
              ))}
          </div>
        </div>
        <div className="flex justify-center items-center mt-5">
          <Pagination
            activePage={page}
            nextPageText={">"}
            prevPageText={"<"}
            totalItemsCount={totalPage}
            itemsCountPerPage={1}
            firstPageText={"<<"}
            lastPageText={">>"}
            linkClass="page-num"
            onChange={handlePageClick}
          />
        </div>
      </div>
      {selectedItems.length === 2 && (
        <div>
          <ModalAdvanced
            visible={showModal}
            onClose={() => {
              setShowModal(false);
              setSelectedItems([]);
            }}
            bodyClassName="w-[1050px] bg-white rounded-lg relative z-10 content overflow-hidden "
          >
            <div className="overflow-y-auto h-[600px] p-10">
              <table className="table-product items-center table-fixed w-full">
                <thead>
                  <tr>
                    <th></th>
                    <th className="text-base font-semibold">Sản phẩm 1</th>
                    <th className="text-base font-semibold">Sản phẩm 2</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-base font-semibold">Ảnh sản phẩm</td>
                    <td>
                      <img
                        src={selectedItems[0]?.images[0]}
                        alt=""
                        className="w-[200px] h-[200px] object-cover mx-auto"
                      />
                    </td>
                    <td>
                      <img
                        src={selectedItems[1]?.images[0]}
                        alt=""
                        className="w-[200px] h-[200px] object-cover mx-auto"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Tên sản phẩm</td>
                    <td>
                      <span
                        className="text-base font-normal line-clamp-2 cursor-pointer"
                        title={selectedItems[0]?.title}
                      >
                        {selectedItems[0]?.title}
                      </span>
                    </td>
                    <td>
                      <span
                        className="text-base font-normal line-clamp-2 cursor-pointer"
                        title={selectedItems[1]?.title}
                      >
                        {selectedItems[1]?.title}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold text-blue-600">Điểm đánh giá (Gợi ý)</td>
                    <td>
                      <span className="text-xl text-yellow-400">
                        {"★".repeat(calculateScore(selectedItems[0]))}
                        <span className="text-gray-400 text-sm ml-1">
                          ({calculateScore(selectedItems[0])}/10)
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className="text-xl text-yellow-400">
                        {"★".repeat(calculateScore(selectedItems[1]))}
                        <span className="text-gray-400 text-sm ml-1">
                          ({calculateScore(selectedItems[1])}/10)
                        </span>
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Thương hiệu</td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[0]?.brand?.name}
                      </span>
                    </td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[1]?.brand?.name}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="text-base font-semibold">Hệ điều hành</td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[0]?.specs?.os}
                      </span>
                    </td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[1]?.specs?.os}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Màu sắc</td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[0]?.specs?.color}
                      </span>
                    </td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[1]?.specs?.color}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">CPU</td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[0]?.specs?.cpu}
                      </span>
                    </td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[1]?.specs?.cpu}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Màn hình</td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[0]?.specs?.screen}
                      </span>
                    </td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[1]?.specs?.screen}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Graphic Card</td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[0]?.specs?.graphicCard}
                      </span>
                    </td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[1]?.specs?.graphicCard}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Pin</td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[0]?.specs?.battery}
                      </span>
                    </td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[1]?.specs?.battery}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Nhu cầu</td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[0]?.specs?.demand}
                      </span>
                    </td>
                    <td>
                      <span className="text-base font-normal">
                        {selectedItems[1]?.specs?.demand}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Ram</td>
                    <td>
                      <span className="text-base font-normal flex items-center gap-x-2">
                        {selectedItems[0]?.specs?.ram}
                        {parseFloat(selectedItems[0]?.specs?.ram) -
                          parseFloat(selectedItems[1]?.specs?.ram) >=
                          0 && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="green"
                              className="w-10 h-10"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                      </span>
                    </td>
                    <td>
                      <span className="text-base font-normal flex items-center gap-x-2">
                        {selectedItems[1]?.specs?.ram}
                        {parseFloat(selectedItems[1]?.specs?.ram) -
                          parseFloat(selectedItems[0]?.specs?.ram) >=
                          0 && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="green"
                              className="w-10 h-10"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Khối lượng</td>
                    <td>
                      <span className="text-base font-normal flex items-center gap-x-2">
                        {selectedItems[0]?.specs?.weight}
                        {parseFloat(selectedItems[0]?.specs?.weight) - parseFloat(selectedItems[1]?.specs?.weight) <=
                          0 && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="green"
                              className="w-10 h-10"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                      </span>
                    </td>
                    <td>
                      <span className="text-base font-normal flex items-center gap-x-2">
                        {selectedItems[1]?.specs?.weight}
                        {parseFloat(selectedItems[1]?.specs?.weight) - parseFloat(selectedItems[0]?.specs?.weight) <=
                          0 && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="green"
                              className="w-10 h-10"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Giá tiền</td>
                    <td>
                      <span className="text-base font-normal flex items-center gap-x-2 text-blue-700 font-bold">
                        {formatPrice(selectedItems[0]?.promotion)}
                        {selectedItems[0]?.promotion -
                          selectedItems[1]?.promotion <=
                          0 && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="green"
                              className="w-10 h-10"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                      </span>
                    </td>
                    <td>
                      <span className="text-base font-normal flex items-center gap-x-2 text-blue-700 font-bold">
                        {formatPrice(selectedItems[1]?.promotion)}
                        {selectedItems[1]?.promotion -
                          selectedItems[0]?.promotion <=
                          0 && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="green"
                              className="w-10 h-10"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              
              {selectedItems.length === 2 && (
                <div className="mt-5 border-t pt-5 pb-5">
                  <h3 className="text-lg font-bold text-green-600 mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Gợi ý từ hệ thống
                  </h3>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                    <span className="font-medium text-green-800 block mb-1">
                      {generateRealLifeSuggestion(selectedItems[0], selectedItems[1]).split('|')[0]}
                    </span>
                    {generateRealLifeSuggestion(selectedItems[0], selectedItems[1]).includes('|') && (
                      <span className="text-gray-600 block mt-1">
                        {generateRealLifeSuggestion(selectedItems[0], selectedItems[1]).split('|')[1]}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ModalAdvanced>
        </div>
      )}
    </>
  );
};

export default ProductList;