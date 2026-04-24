import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProductItem from "./ProductItem";
import slugify from "slugify";
import Pagination from "react-js-pagination";
import ModalAdvanced from "../../components/Modal/ModalAdvanced";
import { formatPrice } from "../../utils/formatPrice";
import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";

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
                      <span className="text-base font-normal line-clamp-2" title={selectedItems[0]?.title}>
                        {selectedItems[0]?.title}
                      </span>
                    </td>
                    <td>
                      <span className="text-base font-normal line-clamp-2" title={selectedItems[1]?.title}>
                        {selectedItems[1]?.title}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Thương hiệu</td>
                    <td>{selectedItems[0]?.brand?.name}</td>
                    <td>{selectedItems[1]?.brand?.name}</td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Hệ điều hành</td>
                    <td>{selectedItems[0]?.specs?.os}</td>
                    <td>{selectedItems[1]?.specs?.os}</td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Màu sắc</td>
                    <td>{selectedItems[0]?.specs?.color}</td>
                    <td>{selectedItems[1]?.specs?.color}</td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">CPU</td>
                    <td>{selectedItems[0]?.specs?.cpu}</td>
                    <td>{selectedItems[1]?.specs?.cpu}</td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Màn hình</td>
                    <td>{selectedItems[0]?.specs?.screen}</td>
                    <td>{selectedItems[1]?.specs?.screen}</td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Graphic Card</td>
                    <td>{selectedItems[0]?.specs?.graphicCard}</td>
                    <td>{selectedItems[1]?.specs?.graphicCard}</td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Ram</td>
                    <td>{selectedItems[0]?.specs?.ram}</td>
                    <td>{selectedItems[1]?.specs?.ram}</td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Khối lượng</td>
                    <td>{selectedItems[0]?.specs?.weight}</td>
                    <td>{selectedItems[1]?.specs?.weight}</td>
                  </tr>
                  <tr>
                    <td className="text-base font-semibold">Giá tiền</td>
                    <td className="text-blue-700 font-bold">{formatPrice(selectedItems[0]?.promotion)}</td>
                    <td className="text-blue-700 font-bold">{formatPrice(selectedItems[1]?.promotion)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ModalAdvanced>
        </div>
      )}
    </>
  );
};

export default ProductList;