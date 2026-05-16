import React from "react";

const ProductParameters = ({ data }) => {
  return (
    <div className="product-parameters px-5 pb-10">
      <div className="text-2xl font-semibold mb-8">Thông tin chi tiết</div>
      <table className="table-product">
        <thead>
          <tr>
            <td>Thương hiệu</td>
            <td>{data?.brand?.name}</td>
          </tr>
          <tr>
            <td>Bảo hành</td>
            <td>12 tháng</td>
          </tr>
          <tr>
            <td>Màu sắc</td>
            <td>{data?.specs?.color}</td> {/* THÊM .specs */}
          </tr>
          <tr>
            <td>CPU</td>
            <td>{data?.specs?.cpu}</td> {/* THÊM .specs */}
          </tr>
          <tr>
            <td>Chip đồ họa</td>
            <td>{data?.specs?.graphicCard}</td> {/* THÊM .specs */}
          </tr>
          <tr>
            <td>RAM</td>
            <td>{data?.specs?.ram}</td> {/* THÊM .specs */}
          </tr>
          <tr>
            <td>Ổ cứng</td>
            <td>{data?.specs?.storage}</td> {/* BỔ SUNG: thêm trường storage mới */}
          </tr>
          <tr>
            <td>Màn hình</td>
            <td>{data?.specs?.screen}</td> {/* THÊM .specs */}
          </tr>
          <tr>
            <td>Nhu cầu</td>
            <td>{data?.specs?.demand}</td> {/* THÊM .specs */}
          </tr>
          <tr>
            <td>Hệ điều hành</td>
            <td>{data?.specs?.os}</td> {/* THÊM .specs */}
          </tr>
          <tr>
            <td>Pin</td>
            <td>{data?.specs?.battery}</td> {/* THÊM .specs */}
          </tr>
          <tr>
            <td>Khối lượng</td>
            <td>{data?.specs?.weight}</td> {/* ĐÃ CÓ sẵn chữ 'kg' trong DB nên bỏ kg ở ngoài */}
          </tr>
        </thead>
      </table>
    </div>
  );
};

export default ProductParameters;