let table;

const loadData = () => {
  if ($.fn.DataTable.isDataTable("#sample_data")) {
    table.destroy();
    $("#sample_data").empty();
  }

  table = $("#sample_data").DataTable({
    processing: true,
    serverSide: true,
    serverMethod: "GET",
    ajax: {
      url: "api/v1/brands/getTableBrand",
      dataSrc: function (json) {
        return json.data || [];
      },
    },
    columns: [
      {
        data: "name",
        render: function (data) {
          if (!data) return "";
          const value =
            data.length > 39 ? data.slice(0, 40) + "..." : data;

          return `<div class="my-3 fw-bold text-dark">${value}</div>`;
        },
      },
      {
        data: null,
        orderable: false,
        searchable: false,
        render: function (row) {
          return `
            <div class="my-3 d-flex gap-2">
              <button class="btn btn-sm btn-outline-primary edit" data-id="${row._id}">
                ✏️ Sửa
              </button>
              <button class="btn btn-sm btn-outline-danger delete" data-id="${row._id}">
                🗑 Xoá
              </button>
            </div>
          `;
        },
      },
    ],
  });
};

function reloadData() {
  if (table) {
    table.ajax.reload(null, false);
  }
}

/* ================= ADD ================= */
$("#add_data").click(function () {
  $("#dynamic_modal_title").text("Thêm thương hiệu");
  $("#sample_form")[0].reset();
  $("#action").val("Add");
  $("#id").val("");

  $("#action_button").text("Thêm mới");
  $("#action_modal").modal("show");
});

/* ================= EDIT ================= */
$(document).on("click", ".edit", function () {
  const id = $(this).data("id");

  $("#dynamic_modal_title").text("Cập nhật thương hiệu");
  $("#action").val("Edit");
  $("#action_button").text("Cập nhật");
  $("#action_modal").modal("show");

  $.ajax({
    url: `/api/v1/brands/${id}`,
    method: "GET",
    success: function (data) {
      const brand = data.data.data;
      $("#name").val(brand.name);
      $("#id").val(brand._id);
    },
  });
});

/* ================= DELETE ================= */
$(document).on("click", ".delete", function () {
  const id = $(this).data("id");

  if (!confirm("Bạn có chắc muốn xoá thương hiệu này không?")) return;

  $.ajax({
    url: `/api/v1/brands/${id}`,
    method: "DELETE",
    success: function () {
      showAlert("success", "Xoá thành công!");
      reloadData(); // ✅ không cần reload page
    },
    error: function () {
      showAlert("error", "Có lỗi xảy ra!");
    },
  });
});

/* ================= SUBMIT ================= */
$("#sample_form").on("submit", function (e) {
  e.preventDefault();

  const action = $("#action").val();
  const id = $("#id").val();

  const method = action === "Add" ? "POST" : "PATCH";
  const url =
    action === "Add"
      ? "/api/v1/brands"
      : `/api/v1/brands/${id}`;

  $.ajax({
    url,
    method,
    data: { name: $("#name").val() },
    beforeSend: function () {
      $("#action_button").prop("disabled", true);
    },
    success: function () {
      $("#action_button").prop("disabled", false);
      $("#action_modal").modal("hide");

      showAlert(
        "success",
        action === "Add" ? "Thêm thành công!" : "Cập nhật thành công!"
      );

      reloadData(); // ✅ quan trọng nhất
    },
    error: function (err) {
      $("#action_button").prop("disabled", false);
      showAlert("error", err.responseJSON?.message || "Có lỗi xảy ra!");
    },
  });
});

/* ================= INIT ================= */
$(document).ready(function () {
  $("select").select2({ theme: "bootstrap-5" });

  loadData();

  $(".navbar-nav li").removeClass("active");
  $(".navbar-nav li")[5].className = "nav-item active";
});