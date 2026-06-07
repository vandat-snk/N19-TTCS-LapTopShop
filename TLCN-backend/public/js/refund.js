let currentFilter = 'pending';
let allRefunds = [];

// ─── Load danh sách refund ────────────────────────────────────────────────
const loadRefunds = async () => {
  try {
    const res = await $.ajax({ url: '/api/v1/payments/refunds', method: 'GET' });
    allRefunds = res.data.data || [];
    updatePendingCount();
    renderTable(currentFilter);

    // Xử lý query string sau khi PayPal callback
    handlePaypalReturn();
  } catch (err) {
    $('#refund-tbody').html(
      '<tr><td colspan="8" class="text-center text-danger py-4">' +
      '<i class="fa-solid fa-circle-exclamation me-1"></i>Không thể tải dữ liệu hoàn tiền.</td></tr>'
    );
  }
};

// ─── Đọc query string sau khi PayPal redirect về ─────────────────────────
const handlePaypalReturn = () => {
  const params = new URLSearchParams(window.location.search);

  if (params.get('success') === '1') {
    const refundId = params.get('refundId') || '';
    showToast('success',
      '✅ Hoàn tiền PayPal thành công!' + (refundId ? ' Mã: ' + refundId : '')
    );
    // Xoá query string khỏi URL mà không reload trang
    window.history.replaceState({}, '', '/refunds');
  } else if (params.get('cancelled') === '1') {
    showToast('warning', '⚠️ Bạn đã huỷ xác nhận hoàn tiền trên PayPal.');
    window.history.replaceState({}, '', '/refunds');
  } else if (params.get('error')) {
    const errMap = {
      missing_token: 'Không nhận được mã xác nhận từ PayPal.',
      not_found:     'Không tìm thấy giao dịch.',
      capture_failed:'PayPal capture thất bại. Vui lòng thử lại.',
    };
    showToast('error', '❌ ' + (errMap[params.get('error')] || 'Đã xảy ra lỗi.'));
    window.history.replaceState({}, '', '/refunds');
  } else if (params.get('already') === '1') {
    showToast('info', 'ℹ️ Giao dịch này đã được hoàn tiền thành công trước đó.');
    window.history.replaceState({}, '', '/refunds');
  }
};

// ─── Toast thông báo nhỏ ─────────────────────────────────────────────────
const showToast = (type, msg) => {
  const colors = {
    success: { bg: '#d1e7dd', color: '#0a5c36', border: '#a3cfbb' },
    error:   { bg: '#f8d7da', color: '#842029', border: '#f1aeb5' },
    warning: { bg: '#fff3cd', color: '#664d03', border: '#ffe69c' },
    info:    { bg: '#cff4fc', color: '#055160', border: '#9eeaf9' },
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; top:20px; right:20px; z-index:99999;
    background:${c.bg}; color:${c.color}; border:1px solid ${c.border};
    border-radius:10px; padding:14px 20px; font-size:14px; font-weight:600;
    box-shadow:0 4px 20px rgba(0,0,0,0.12); max-width:380px;
    animation: slideIn .3s ease;
  `;
  toast.textContent = msg;

  const style = document.createElement('style');
  style.textContent = '@keyframes slideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}';
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity .4s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 5000);
};

const updatePendingCount = () => {
  const n = allRefunds.filter(r => r.status === 'pending').length;
  $('#pending-count').text(n > 0 ? n + ' chờ xử lý' : '').toggle(n > 0);
};

const renderTable = (filter) => {
  const filtered = filter === 'all' ? allRefunds : allRefunds.filter(r => r.status === filter);

  if (filtered.length === 0) {
    $('#refund-tbody').html(
      '<tr><td colspan="8" class="text-center text-muted py-5">' +
      '<i class="fa-solid fa-inbox me-2"></i>Không có giao dịch nào.</td></tr>'
    );
    return;
  }

  const statusMap = {
    pending: '<span class="badge-status-pending">⏳ Chờ xử lý</span>',
    success: '<span class="badge-status-success">✅ Đã hoàn</span>',
    failed:  '<span class="badge-status-failed">❌ Thất bại</span>',
  };

  const rows = filtered.map(r => {
    const userName    = r.user ? r.user.name : 'N/A';
    const orderId     = r.order ? (r.order._id || r.order) : 'N/A';
    const amount      = r.amount ? r.amount.toLocaleString('vi-VN') + ' VND' : '—';
    const date        = r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : '—';
    const code        = r.transactionCode || '—';
    const method      = r.paymentMethod || '—';
    const statusBadge = statusMap[r.status] || r.status;

    let actionBtn;
    if (r.status === 'pending' || r.status === 'failed') {
      const btnClass = r.status === 'pending' ? 'btn-danger' : 'btn-warning';
      const icon     = r.status === 'pending' ? 'fa-brands fa-paypal' : 'fa-solid fa-rotate-right';
      const label    = r.status === 'pending' ? 'Hoàn tiền PayPal' : 'Thử lại';
      actionBtn =
        '<button class="btn btn-sm ' + btnClass + '" onclick="openPaypalPopup(\'' + r._id + '\')">' +
        '<i class="' + icon + ' me-1"></i>' + label + '</button>';
    } else {
      actionBtn = '<span class="text-muted small">—</span>';
    }

    const orderLink = orderId !== 'N/A'
      ? '<a href="/orders/' + orderId + '" class="text-decoration-none small text-primary">' + String(orderId).slice(-8) + '…</a>'
      : '—';

    return '<tr>' +
      '<td class="ps-4 fw-semibold">' + userName + '</td>' +
      '<td>' + orderLink + '</td>' +
      '<td class="text-danger fw-bold">' + amount + '</td>' +
      '<td><span class="badge bg-light text-dark border">' + method + '</span></td>' +
      '<td class="text-muted small">' + (code.length > 20 ? code.slice(0, 20) + '…' : code) + '</td>' +
      '<td class="text-muted small">' + date + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td class="text-center pe-4">' + actionBtn + '</td>' +
      '</tr>';
  });

  $('#refund-tbody').html(rows.join(''));
};

// ─── Mở popup PayPal thật sự ──────────────────────────────────────────────
// Luồng: gọi API tạo PayPal Order → nhận approveUrl → window.open
// → Admin đăng nhập PayPal và nhấn approve → PayPal redirect về backend callback
// → Backend capture → redirect về /refund?success=1
const openPaypalPopup = async (refundId) => {
  const r = allRefunds.find(x => x._id === refundId);
  if (!r) return;

  // Hiện loading overlay
  showLoadingOverlay(r);

  try {
    // Gọi backend tạo PayPal Order, nhận approveUrl
    const res = await $.ajax({
      url: '/api/v1/payments/refunds/' + refundId + '/create-paypal-order',
      method: 'POST',
      contentType: 'application/json',
    });

    const approveUrl = res.data?.approveUrl;
    if (!approveUrl) throw new Error('Không nhận được URL PayPal');

    hideLoadingOverlay();

    // Mở popup cửa sổ PayPal giống hình khách hàng
    const w = 500, h = 700;
    const left = (window.screen.width  - w) / 2;
    const top  = (window.screen.height - h) / 2;
    const popup = window.open(
      approveUrl,
      'PayPal Hoàn Tiền',
      `width=${w},height=${h},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // Trình duyệt chặn popup → mở tab mới
      showToast('warning', '⚠️ Trình duyệt chặn popup. Đang mở tab mới...');
      setTimeout(() => window.open(approveUrl, '_blank'), 500);
      return;
    }

    // Poll kiểm tra popup đóng → reload bảng
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setTimeout(() => loadRefunds(), 1500); // chờ backend xử lý callback
      }
    }, 800);

  } catch (err) {
    hideLoadingOverlay();
    const msg = err.responseJSON?.message || err.message || 'Không thể kết nối PayPal. Vui lòng thử lại.';
    showToast('error', '❌ ' + msg);
  }
};

// ─── Loading overlay ──────────────────────────────────────────────────────
const showLoadingOverlay = (r) => {
  const amount = r.amount ? r.amount.toLocaleString('vi-VN') + ' VND' : '—';
  const userName = r.user ? r.user.name : 'N/A';

  let el = document.getElementById('paypal-loading-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'paypal-loading-overlay';
    document.body.appendChild(el);
  }
  el.style.cssText = `
    position:fixed; inset:0; z-index:99998;
    background:rgba(0,0,0,0.55); backdrop-filter:blur(4px);
    display:flex; align-items:center; justify-content:center;
  `;
  el.innerHTML = `
    <div style="
      background:#fff; border-radius:16px; padding:36px 32px;
      text-align:center; width:340px; max-width:90vw;
      box-shadow:0 16px 48px rgba(214,51,132,0.2);
      animation: popIn .25s cubic-bezier(.34,1.56,.64,1);
    ">
      <div style="
        width:64px; height:64px; border-radius:50%;
        background:linear-gradient(135deg,#d63384,#ff6ab0);
        display:flex; align-items:center; justify-content:center;
        margin:0 auto 16px;
        box-shadow:0 4px 16px rgba(214,51,132,0.3);
      ">
        <i class="fa-brands fa-paypal" style="color:#fff; font-size:26px;"></i>
      </div>
      <div style="font-size:17px; font-weight:700; color:#1a1a2e; margin-bottom:6px;">
        Đang mở cửa sổ PayPal...
      </div>
      <div style="font-size:13px; color:#888; margin-bottom:18px;">
        Vui lòng đăng nhập và xác nhận hoàn tiền
      </div>
      <div style="background:#fdf2f8; border-radius:10px; padding:12px 16px; text-align:left; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
          <span style="color:#888;">Khách hàng</span>
          <span style="font-weight:600; color:#333;">${userName}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:14px;">
          <span style="color:#888;">Số tiền hoàn</span>
          <span style="font-weight:700; color:#d63384;">${amount}</span>
        </div>
      </div>
      <div style="display:flex; align-items:center; justify-content:center; gap:8px; color:#888; font-size:13px;">
        <div style="
          width:18px; height:18px;
          border:2.5px solid #e9d0e6; border-top-color:#d63384;
          border-radius:50%; animation:spin .7s linear infinite;
        "></div>
        Đang kết nối PayPal...
      </div>
    </div>
    <style>
      @keyframes spin   { to { transform: rotate(360deg); } }
      @keyframes popIn  { from { transform:scale(0.88); opacity:0; } to { transform:scale(1); opacity:1; } }
    </style>
  `;
};

const hideLoadingOverlay = () => {
  const el = document.getElementById('paypal-loading-overlay');
  if (el) el.remove();
};

// ─── Khởi động ───────────────────────────────────────────────────────────
$(document).ready(function () {
  loadRefunds();

  $('#refundTab .nav-link').on('click', function (e) {
    e.preventDefault();
    $('#refundTab .nav-link').removeClass('active');
    $(this).addClass('active');
    currentFilter = $(this).data('filter');
    renderTable(currentFilter);
  });
});