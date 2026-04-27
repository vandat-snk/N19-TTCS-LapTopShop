let totalRevenue = 0;
let totalInvoice = 0;
let theDay;
let theWeek;
let theYear;

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

const oneJan = new Date(currentDate.getFullYear(), 0, 1);
const numberOfDays = Math.floor((currentDate - oneJan) / (24 * 60 * 60 * 1000));
const currentWeek = Math.ceil((numberOfDays - 1) / 7);

const arr_status = [
  { status: "Đã hủy", quantity: 0 },
  { status: "Đã xử lý", quantity: 0 },
  { status: "Chờ hàng", quantity: 0 },
  { status: "Đang giao", quantity: 0 },
  { status: "Hoàn thành", quantity: 0 }
];

function showChart() {
  $("#myPieChart").remove();
  $("#noData-chart").remove();

  $("#showChartPie").append('<canvas id="myPieChart"></canvas>');

  let ctx = document.getElementById("myPieChart");

  const empty = arr_status.every(s => s.quantity === 0);

  if (empty) {
    $("#showChartPie").append(
      `<h2 class="text-center text-muted">📭 Chưa có đơn hàng nào</h2>`
    );
  } else {
    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: arr_status.map(s => s.status),
        datasets: [{
          data: arr_status.map(s => s.quantity),
          backgroundColor: ["#dc3545", "#fd7e14", "#6c757d", "#0d6efd", "#198754"]
        }]
      },
      options: {
        cutout: 80,
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

async function loadPieChart(dt) {
  try {
    arr_status.forEach(s => s.quantity = 0);

    let data;

    if (!dt) {
      data = await $.ajax({
        url: "api/v1/orders/countOption",
        method: "POST"
      });
    } else {
      data = await $.ajax({
        url: "api/v1/orders/statusInRange",
        method: "POST",
        data: dt
      });
    }

    data.forEach(v => {
      arr_status.forEach(s => {
        if (s.status == v._id.status) s.quantity = v.count;
      });
    });

    showChart();
  } catch (err) {
    showAlert("error", "Đã có lỗi xảy ra");
  }
}

$(document).ready(async function () {
  $("select").select2({ theme: "bootstrap-5" });

  flatpickr("#dateRange", {
    mode: "range",
    dateFormat: "Y-m-d"
  });

  $(".navbar-nav li").removeClass("active");
  $(".navbar-nav li")[0].className = "nav-item active";

  loadPieChart();

  const countUser = await $.ajax({ url: "api/v1/users", method: "GET" });

  const totalRevenue = await $.ajax({
    url: "api/v1/orders/sumOption",
    method: "POST"
  });

  const totalImport = await $.ajax({
    url: "api/v1/imports/sumOption",
    method: "POST"
  });

  const topProduct = await $.ajax({
    url: "api/v1/orders/topProduct",
    method: "POST"
  });

  const topInventory = await $.ajax({
    url: "api/v1/products?sort=-inventory&limit=5",
    method: "GET"
  });

  // ===================== GIỮ NGUYÊN SẢN PHẨM =====================
  if (topProduct.length == 0) {
    $("#sell-product").html(`<h2 class="text-center">Chưa có sản phẩm nào</h2>`);
  } else {
    topProduct.forEach((value, index) => {
      $("#sell-product").append(`
        <div class="col-md-1 d-flex justify-content-center align-items-center">
          ${index + 1}
        </div>
        <div class="col-md-2">
          <img src="${value.image[0]}"
            onerror="this.src='https://res.cloudinary.com/dbekkzxtt/image/upload/v1668578244/dwxqdvfwehpklx9fzx6l.webp'"
            class="img-fluid">
        </div>
        <div class="col-md-7 d-flex align-items-center">
          ${value.title}
        </div>
        <div class="col-md-2 d-flex justify-content-center align-items-center">
          ${value.quantity} sản phẩm
        </div>
      `);
    });

    $("#inventory-product").empty();
    topInventory.data.data.forEach((value, index) => {
      $("#inventory-product").append(`
        <div class="col-md-1 d-flex justify-content-center align-items-center">
          ${index + 1}
        </div>
        <div class="col-md-2">
          <img src="${value.images[0]}" class="img-fluid">
        </div>
        <div class="col-md-7 d-flex align-items-center">
          ${value.title}
        </div>
        <div class="col-md-2 d-flex justify-content-center align-items-center">
          ${value.inventory} sản phẩm
        </div>
      `);
    });
  }

  const a = totalRevenue[0] ? totalRevenue[0].total_revenue : 0;
  const b = totalImport[0] ? totalImport[0].total : 0;

  $("#totalRevenue").html(`Doanh thu: ${(a / 1000000).toFixed(1)} triệu VND`);
  $("#totalInvoice").html(`Chi phí nhập: ${(b / 1000000).toFixed(1)} triệu VND`);
  $("#totalUser").html(`Người dùng: ${countUser.results}`);
  $("#totalOrder").html(arr_status[4].quantity);
});