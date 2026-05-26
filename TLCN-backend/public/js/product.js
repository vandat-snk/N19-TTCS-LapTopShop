const err_src = "/images/unnamed.jpg";

const loadData = async () => {
  try {
    $("#sample_data").DataTable({
      processing: true,
      serverSide: true,
      serverMethod: "get",
      ajax: {
        url: "api/v1/products/getTableProduct",
      },
      columns: [
        {
          data: "images",
          render: function (data) {
            return (
              `<img src="` +
              data[0] +
              `" alt="" height="65" width="65" onerror="this.src='` +
              err_src +
              `';" style="border-radius: 0.275rem;">`
            );
          },
        },
        {
          data: "title",
          render: function (data) {
            const value = data.length > 39 ? data.slice(0, 40) + "..." : data;
            return '<div class="my-3">' + value + "</div>";
          },
        },
        {
          data: "price",
          render: function (data) {
            return '<div class="my-3">' + data + " VND</div>";
          },
        },
        {
          data: "inventory",
          render: function (data) {
            return '<div class="my-3">' + data + "</div>";
          },
        },
        {
          data: null,
          render: function (row) {
            let btnEdit =
              '<button type="button" class="btn btn-primary btn-sm mr-1 edit" data-id="' +
              row.id +
              '"><i class="fa fa-edit"></i></button>';
            let btnDelete =
              '<button type="button" class="btn btn-danger btn-sm delete" data-id="' +
              row.id +
              '"><i class="fa fa-trash-alt"></i></button>';
            return `<div class="my-3">${btnEdit} ${btnDelete}</div>`;
          },
        },
      ],
    });

    showAlert("success", "Load Data successfully!");
  } catch (err) {
    showAlert("error", err);
  }
};

const loadCategory = function () {
  $.ajax({
    url: "/api/v1/categories",
    method: "GET",
    success: (data) => {
      $("#category").empty();
      data.data.data.forEach((value) => {
        $("#category").append(
          "<option value=" + value.id + ">" + value.name + "</option>"
        );
      });
    },
  });
};

const loadBrand = function () {
  $.ajax({
    url: "/api/v1/brands",
    method: "GET",
    success: (data) => {
      $("#brand").empty();
      data.data.data.forEach((value) => {
        $("#brand").append(
          "<option value=" + value.id + ">" + value.name + "</option>"
        );
      });
    },
  });
};

function reloadData() {
  $("#sample_data").DataTable().ajax.reload();
}

$(document).ready(async function () {
  $("select").select2({
    theme: "bootstrap-5",
  });
  loadData();
  loadCategory();
  loadBrand();
  $(".navbar-nav li").removeClass("active");
  $(".navbar-nav li")[3].className = "nav-item active";
});

// =====================
// THÊM SẢN PHẨM (Add)
// =====================
$("#add_data").click(function () {
  files = [];
  $("#dynamic_modal_title").text("Thêm sản phẩm");
  $("#sample_form")[0].reset();
  $("#category").val(null).trigger("change");
  $("#brand").val(null).trigger("change");
  $("#demand").val(null).trigger("change");
  $("#color").val(null).trigger("change");
  $("#action").val("Add");
  $("#id").val("");
  $("#action_button").text("Thêm");
  $(".img-show").empty();

  // Hiện lại phần upload ảnh khi Add
  $(".img-all").show();

  // Reset TinyMCE nếu có
  if (tinymce.get("description")) {
    tinymce.get("description").setContent("");
  }

  $("#action_modal").modal("show");
});

// =====================
// SỬA SẢN PHẨM (Edit)
// =====================
$(document).on("click", ".edit", function () {
  files = [];
  $("#sample_form")[0].reset();
  const id = $(this).data("id");

  $("#dynamic_modal_title").text("Sửa sản phẩm");
  $("#action").val("Edit");
  $("#id").val(id);
  $("#action_button").text("Cập nhật");
  $(".img-show").empty();

  // Ẩn CHỈ phần upload ảnh, không ẩn các field input
  $(".img-all").hide();

  $("#action_modal").modal("show");

  $.ajax({
    url: `/api/v1/products/${id}`,
    method: "GET",
    success: function (data) {
      const product = data.data.data;
      $("#title").val(product.title);
      $("#category").val(product.category.id).trigger("change");
      $("#brand").val(product.brand.id).trigger("change");
      $("#demand").val(product.demand).trigger("change");
      $("#color").val(product.color).trigger("change");
      $("#price").val(product.price);
      $("#promotion").val(product.promotion);
      $("#weight").val(product.weight);
      $("#ram").val(product.ram);
      $("#battery").val(product.battery);
      $("#cpu").val(product.cpu);
      $("#os").val(product.os);
      $("#screen").val(product.screen);
      $("#graphicCard").val(product.graphicCard);

      // Set nội dung TinyMCE
      if (tinymce.get("description")) {
        tinymce.get("description").setContent(product.description || "");
      } else {
        $("#description").val(product.description || "");
      }
    },
    error: function (err) {
      showAlert("error", err.responseJSON?.message || "Không thể tải dữ liệu sản phẩm");
    },
  });
});

// =====================
// SUBMIT FORM (Add / Edit)
// =====================
$("#sample_form").on("submit", async function (e) {
  e.preventDefault();

  const action = $("#action").val();
  const id = $("#id").val();

  // Sync nội dung TinyMCE vào textarea trước khi lấy FormData
  if (tinymce.get("description")) {
    tinymce.triggerSave();
  }

  const formData = new FormData(this);

  // Với Edit: gửi thêm field action để backend biết
  if (action === "Edit") {
    formData.append("action", "Edit");
  }

  const url = action === "Edit"
    ? `/api/v1/products/${id}`
    : `/api/v1/products`;

  const method = action === "Edit" ? "PATCH" : "POST";

  try {
    await $.ajax({
      url: url,
      method: method,
      data: formData,
      processData: false,
      contentType: false,
    });

    showAlert(
      "success",
      action === "Edit" ? "Cập nhật sản phẩm thành công!" : "Thêm sản phẩm thành công!"
    );
    $("#action_modal").modal("hide");
    reloadData();
  } catch (err) {
    showAlert("error", err.responseJSON?.message || "Đã xảy ra lỗi, vui lòng thử lại");
  }
});

// =====================
// XÓA SẢN PHẨM (Delete)
// =====================
$(document).on("click", ".delete", function () {
  const id = $(this).data("id");

  if (confirm("Bạn có chắc muốn xóa sản phẩm này không?")) {
    $.ajax({
      url: `/api/v1/products/${id}`,
      method: "DELETE",
      success: function () {
        showAlert("success", `Xóa sản phẩm thành công`);
        reloadData();
      },
      error: function (err) {
        showAlert("error", err.responseJSON?.message || "Xóa thất bại");
      },
    });
  }
});