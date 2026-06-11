// Set new default font family and font color to mimic Bootstrap's default styling
(Chart.defaults.global.defaultFontFamily = "Nunito"),
  '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
Chart.defaults.global.defaultFontColor = "#858796";
let totalRevenue = 0;
let totalInvoice = 0;
const currentYear = new Date().getFullYear();
const arr_status = [
  { status: "Cancelled",     quantity: 0 },
  { status: "Processed",     quantity: 0 },
  { status: "Waiting Goods", quantity: 0 },
  { status: "Delivery",      quantity: 0 },
  { status: "Success",       quantity: 0 },
];
const arr_revenue = Array.from({ length: 12 }, (_, i) => ({
  id: { year: currentYear, month: i + 1 }, total: 0,
}));
const arr_invoice = Array.from({ length: 12 }, (_, i) => ({
  id: { year: currentYear, month: i + 1 }, total: 0,
}));

function number_format(number, decimals, dec_point, thousands_sep) {
  number = (number + "").replace(",", "").replace(" ", "");
  var n = !isFinite(+number) ? 0 : +number,
    prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
    sep = typeof thousands_sep === "undefined" ? "," : thousands_sep,
    dec = typeof dec_point === "undefined" ? "." : dec_point,
    s = "",
    toFixedFix = function (n, prec) {
      var k = Math.pow(10, prec);
      return "" + Math.round(n * k) / k;
    };
  s = (prec ? toFixedFix(n, prec) : "" + Math.round(n)).split(".");
  if (s[0].length > 3) {
    s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
  }
  if ((s[1] || "").length < prec) {
    s[1] = s[1] || "";
    s[1] += new Array(prec - s[1].length + 1).join("0");
  }
  return s.join(dec);
}

// Load Pie Chart — nhiều màu sắc khác nhau để dễ phân biệt
async function loadPieChart() {
  try {
    const data = await $.ajax({ url: "api/v1/orders/count", method: "GET" });
    await data.forEach(async (value) => {
      await arr_status.forEach((status) => {
        if (status.status == value._id) status.quantity = value.count;
      });
    });
    const ctx = document.getElementById("myPieChart");
    const myPieChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: arr_status.map((s) => s.status),
        datasets: [
          {
            data: arr_status.map((s) => s.quantity),
            // 5 màu rõ ràng, khác nhau hoàn toàn
            backgroundColor: [
              "#dc3545", // đỏ  — Huỷ
              "#fd7e14", // cam  — Đang xử lý
              "#6c757d", // xám  — Chờ hàng
              "#6f42c1", // tím  — Giao hàng
              "#20c997", // xanh lá — Thành công
            ],
            hoverBackgroundColor: [
              "#c82333",
              "#e8690e",
              "#5a6268",
              "#5a32a3",
              "#17a589",
            ],
            borderWidth: 3,
            borderColor: "#ffffff",
            hoverBorderColor: "rgba(234, 236, 244, 1)",
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        tooltips: {
          backgroundColor: "rgb(255,255,255)",
          bodyFontColor: "#858796",
          borderColor: "#dddfeb",
          borderWidth: 1,
          xPadding: 15,
          yPadding: 15,
          displayColors: true,
          caretPadding: 10,
        },
        legend: { display: false },
        cutoutPercentage: 75,
      },
    });
  } catch (error) {
    showAlert("error", "Đã có lỗi xảy ra");
  }
}

// Area Chart — 2 màu khác nhau rõ ràng: hồng (thu nhập) & xanh lá (chi phí)
async function loadAreaChart() {
  try {
    const data    = await $.ajax({ url: "api/v1/orders/sum",  method: "GET" });
    const respond = await $.ajax({ url: "api/v1/imports/sum", method: "GET" });

    await data.forEach(async (value) => {
      totalRevenue += value.total_revenue_month;
      await arr_revenue.forEach((month) => {
        if (month.id.year === value._id.year && month.id.month === value._id.month)
          month.total = value.total_revenue_month;
      });
    });
    await respond.forEach(async (value) => {
      totalInvoice += value.total_month;
      await arr_invoice.forEach((month) => {
        if (month.id.year === value._id.year && month.id.month === value._id.month)
          month.total = value.total_month;
      });
    });

    document.getElementById("totalRevenue").innerHTML =
      Number((totalRevenue / 1000000).toFixed()).toLocaleString().replace(/,/g, ".") + " Triệu VND";
    document.getElementById("totalInvoice").innerHTML =
      Number((totalInvoice / 1000000).toFixed()).toLocaleString().replace(/,/g, ".") + " Triệu VND";

    const revenue = arr_revenue.map((v) => v.total);
    const invoice = arr_invoice.map((v) => v.total);
    const ctc = document.getElementById("myAreaChart");

    const myLineChart = new Chart(ctc, {
      type: "line",
      data: {
        labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        datasets: [
          {
            label: "Thu nhập",
            lineTension: 0.3,
            backgroundColor: "rgba(214, 51, 132, 0.08)",  // hồng nhạt fill
            borderColor: "#d63384",                        // hồng đậm line
            pointRadius: 4,
            pointBackgroundColor: "#d63384",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: "#d63384",
            pointHoverBorderColor: "#ffffff",
            pointHitRadius: 10,
            data: revenue,
          },
          {
            label: "Chi phí",
            lineTension: 0.3,
            backgroundColor: "rgba(32, 201, 151, 0.08)",  // xanh lá nhạt fill
            borderColor: "#20c997",                        // xanh lá đậm line
            pointRadius: 4,
            pointBackgroundColor: "#20c997",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: "#20c997",
            pointHoverBorderColor: "#ffffff",
            pointHitRadius: 10,
            data: invoice,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        layout: { padding: { left: 10, right: 25, top: 25, bottom: 0 } },
        scales: {
          xAxes: [{
            time: { unit: "date" },
            gridLines: { display: false, drawBorder: false },
            ticks: { maxTicksLimit: 7 },
          }],
          yAxes: [{
            ticks: {
              maxTicksLimit: 5,
              padding: 10,
              callback: function (value) { return number_format(value); },
            },
            gridLines: {
              color: "rgb(234, 236, 244)",
              zeroLineColor: "rgb(234, 236, 244)",
              drawBorder: false,
              borderDash: [2],
              zeroLineBorderDash: [2],
            },
          }],
        },
        legend: { display: false },
        tooltips: {
          backgroundColor: "rgb(255,255,255)",
          bodyFontColor: "#858796",
          titleMarginBottom: 10,
          titleFontColor: "#6e707e",
          titleFontSize: 14,
          borderColor: "#dddfeb",
          borderWidth: 1,
          xPadding: 15,
          yPadding: 15,
          displayColors: true,
          intersect: false,
          mode: "index",
          caretPadding: 10,
          callbacks: {
            label: function (tooltipItem, chart) {
              var datasetLabel = chart.datasets[tooltipItem.datasetIndex].label || "";
              return datasetLabel + ": " + number_format(tooltipItem.yLabel) + " VND";
            },
          },
        },
      },
    });
  } catch (error) {
    showAlert("error", error);
  }
}

$(document).ready(async function () {
  try {
    loadAreaChart();
    loadPieChart();
    const data    = await $.ajax({ url: "api/v1/users",                method: "GET" });
    const respond = await $.ajax({ url: "api/v1/orders?status=Success", method: "GET" });
    $("#totalUser").html(data.results);
    $("#totalOrder").html(respond.results);
  } catch (error) {
    showAlert("error", error);
  }
});