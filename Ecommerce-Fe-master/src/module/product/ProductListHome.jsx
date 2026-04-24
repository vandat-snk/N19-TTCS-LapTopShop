import React, { useEffect, useState } from "react";
import ProdictItem from "../product/ProductItem";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, EffectCards } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-cards";
import { useNavigate } from "react-router-dom";
import slugify from "slugify";
import ModalAdvanced from "../../components/Modal/ModalAdvanced";
import { formatPrice } from "../../utils/formatPrice";
import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";

const ProductListHome = ({ data, bg = "", className = "" }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const bodyStyle = document.body.style;
  const [selectedItems, setSelectedItems] = useState([]);

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

  const removeFromCompare = (item) => {
    const filteredItems = selectedItems.filter(
      (product) => product._id !== item._id
    );
    setSelectedItems(filteredItems);
  };

  useEffect(() => {
    if (showModal === true) {
      disableBodyScroll(bodyStyle);
    } else {
      enableBodyScroll(bodyStyle);
    }
  }, [showModal, bodyStyle]);

  const handleClick = (item) => {
    const path = slugify(item.title, { strict: true });
    navigate(`/${path}/${item._id}`);
  };

  return (
    <div className={`${className}`}>
      <div
        className={`container ${
          bg === "bg1" ? 'bg-[url("../images/bg-laptop.png")] h-[460px]' : ""
        }
        ${bg === "bg2" ? 'bg-[url("../images/bg-laptop-1.png")] h-[460px]' : ""}
           bg-no-repeat w-full bg-cover rounded-lg `}
      >
        <Swiper
          modules={[Navigation, Pagination, EffectCards]}
          slidesPerView={5}
          slidesPerGroup={5}
          navigation
          loop={true}
          pagination={{ clickable: true }}
          className={`w-full rounded-lg ${className}`}
        >
          {data?.length > 0 &&
            data.map((item) => (
              <SwiperSlide key={item._id}>
                <ProdictItem
                  product={item}
                  onClickItem={() => handleClick(item)}
                  selected={selectedItems}
                  addToCompare={addToCompare}
                  removeFromCompare={removeFromCompare}
                />
              </SwiperSlide>
            ))}
        </Swiper>
      </div>
      {selectedItems.length === 2 && (
        <div>
          <ModalAdvanced
            visible={showModal}
            onClose={() => {
              setShowModal(false);
              setSelectedItems([]);
            }}
            bodyClassName="w-[1050px] bg-white p-10 rounded-lg relative z-10 content h-[600px] overflow-y-auto overflow-x-hidden"
          >
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
                    <img src={selectedItems[0]?.images[0]} alt="" className="w-[200px] h-[200px] object-cover mx-auto" />
                  </td>
                  <td>
                    <img src={selectedItems[1]?.images[0]} alt="" className="w-[200px] h-[200px] object-cover mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="text-base font-semibold">Tên sản phẩm</td>
                  <td><span className="text-base font-normal line-clamp-2">{selectedItems[0]?.title}</span></td>
                  <td><span className="text-base font-normal line-clamp-2">{selectedItems[1]?.title}</span></td>
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
                  <td className="text-base font-semibold">CPU</td>
                  <td>{selectedItems[0]?.specs?.cpu}</td>
                  <td>{selectedItems[1]?.specs?.cpu}</td>
                </tr>
                <tr>
                    <td className="text-base font-semibold">Ram</td>
                    <td>{selectedItems[0]?.specs?.ram}</td>
                    <td>{selectedItems[1]?.specs?.ram}</td>
                </tr>
                <tr>
                  <td className="text-base font-semibold">Giá tiền</td>
                  <td className="text-blue-700 font-bold">{formatPrice(selectedItems[0]?.promotion)}</td>
                  <td className="text-blue-700 font-bold">{formatPrice(selectedItems[1]?.promotion)}</td>
                </tr>
              </tbody>
            </table>
          </ModalAdvanced>
        </div>
      )}
    </div>
  );
};

export default ProductListHome;