const loadData = async () => {
  try {
    $("#sample_data").DataTable({
      processing: true,
      serverSide: true,
      serverMethod: "get",
      ajax: {
        url: "api/v1/orders/getTableOrder",
      },
      columns: [
        {
          data: "user",
          render: function (data) {
            // Sử dụng Optional Chaining (?) để tránh lỗi nếu user bị xóa
            const n = data ? data.name : "Tài khoản đã xóa";
            return '<div class= "my-3">' + n + "</div>";
          },
        },
        {
          data: "cart",
          render: function (data) {
            let html = "";
            if (data && data.length > 0) {
              data.forEach((value, index) => {
                // ĐÃ SỬA CHÍNH XÁC: Đọc trực tiếp value.title từ Snapshot, không dùng value.product.title
                const titleText = value.title || "Sản phẩm không có tên";
                const name =
                  titleText.length > 39
                    ? titleText.slice(0, 40) + "..."
                    : titleText;
                html += `<div class= "my-3"> ${name} </div>`;
              });
            }
            return html;
          },
        },
        {
          data: "createdAt",
          render: function (data) {
            const theDate = new Date(Date.parse(data));
            const date = theDate.toLocaleString();
            return '<div class= "my-3">' + date + "</div>";
          },
        },
        {
          data: "status",
          render: function (data) {
            const value = data.length > 9 ? data.slice(0, 8) : data;
            let html = "";
            if (data == "Processed")
              html = `<div class= "my-3"><button class="btn btn-warning" disabled>${value}</button></div>`;
            if (data == "Cancelled")
              html = `<div class= "my-3"><button class="btn btn-danger" disabled>${value}</button></div>`;
            if (data == "Waiting Goods")
              html = `<div class= "my-3"><button class="btn btn-info" disabled>${value}</button></div>`;
            if (data == "Delivery")
              html = `<div class= "my-3"><button class="btn btn-primary" disabled>${value}</button></div>`;
            if (data == "Success")
              html = `<div class= "my-3"><button class="btn btn-success" disabled>${value}</button></div>`;
            return html;
          },
        },
        {
          data: "totalPrice",
          render: function (data) {
            return `<div class= "my-3">${data.toLocaleString()} VND</div>`; // Thêm toLocaleString() để phân tách hàng nghìn cho đẹp
          },
        },
        {
          data: null,
          render: function (row) {
            let btnView = `<a href="/orders/${row.id}"><button type="button" class="btn btn-primary btn-sm mr-1" >View</button></a>`;
            return `<div class= "my-3">${btnView}</div>`;
          },
        },
      ],
    });

    showAlert("success", "Load Data successfully!");
  } catch (err) {
    showAlert("error", err);
  }
};

function reloadData() {
  $("#sample_data").DataTable().ajax.reload();
}

$(document).ready(function () {
  loadData();
  $(".navbar-nav li").removeClass("active");
  $(".navbar-nav li")[2].className = "nav-item active";
});