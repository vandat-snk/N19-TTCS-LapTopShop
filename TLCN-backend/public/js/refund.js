let currentFilter = 'pending';
let allRefunds = [];

// ─── Load danh sách refund ────────────────────────────────────────────────
const loadRefunds = async () => {
  try {
    const res = await $.ajax({ url: '/api/v1/payments/refunds', method: 'GET' });
    allRefunds = res.data.data || [];
    updatePendingCount();
    renderTable(currentFilter);
  } catch (err) {
    $('#refund-tbody').html(
      '<tr><td colspan="8" class="text-center text-danger py-4">' +
      '<i class="fa-solid fa-circle-exclamation me-1"></i>Không thể tải dữ liệu hoàn tiền.</td></tr>'
    );
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
      // ✅ Đổi từ openPaypalPopup → processRefund
      actionBtn =
        '<button class="btn btn-sm ' + btnClass + '" onclick="processRefund(\'' + r._id + '\')">' +
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

// ─── Hoàn tiền trực tiếp qua PayPal Refund API (KHÔNG cần popup) ─────────
// Luồng: Admin bấm nút → gọi PATCH /refunds/:id/status
// → Backend dùng captureId từ đơn hàng gốc → gọi PayPal Refund API
// → Tiền tự động hoàn về tài khoản buyer, không cần đăng nhập PayPal thủ công
const processRefund = async (refundId) => {
  const r = allRefunds.find(x => x._id === refundId);
  if (!r) return;

  const label = r.status === 'pending' ? 'hoàn tiền' : 'thử lại hoàn tiền';
  const userName = r.user ? r.user.name : 'khách hàng này';
  const amount = r.amount ? r.amount.toLocaleString('vi-VN') + ' VND' : '';

  if (!confirm(`Xác nhận ${label} ${amount ? amount + ' ' : ''}cho ${userName}?`)) return;

  showLoadingOverlay(r);

  try {
    const res = await $.ajax({
      url: '/api/v1/payments/refunds/' + refundId,
      method: 'PATCH',
      contentType: 'application/json',
      data: JSON.stringify({ note: 'Admin xác nhận hoàn tiền' }),
    });

    hideLoadingOverlay();
    const refundCode = res.data?.paypalRefundId || '';
    showToast('success', '✅ Hoàn tiền thành công!' + (refundCode ? ' Mã PayPal: ' + refundCode : ''));
    await loadRefunds();

  } catch (err) {
    hideLoadingOverlay();
    const msg = err.responseJSON?.message || err.message || 'Hoàn tiền thất bại. Vui lòng thử lại.';
    showToast('error', '❌ ' + msg);
    await loadRefunds();
  }
};

// ─── Loading overlay (giữ nguyên giao diện cũ) ───────────────────────────
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
      box-shadow:0 16px 48px rgba(0,116,186,0.2);
      animation: popIn .25s cubic-bezier(.34,1.56,.64,1);
    ">
      <div style="
        width:64px; height:64px; border-radius:50%;
        background:linear-gradient(135deg,#003087,#009cde);
        display:flex; align-items:center; justify-content:center;
        margin:0 auto 16px;
        box-shadow:0 4px 16px rgba(0,116,186,0.3);
      ">
        <i class="fa-brands fa-paypal" style="color:#fff; font-size:26px;"></i>
      </div>
      <div style="font-size:17px; font-weight:700; color:#1a1a2e; margin-bottom:6px;">
        Đang xử lý hoàn tiền...
      </div>
      <div style="font-size:13px; color:#888; margin-bottom:18px;">
        Vui lòng chờ, không tắt trang này
      </div>
      <div style="background:#f0f7ff; border-radius:10px; padding:12px 16px; text-align:left; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
          <span style="color:#888;">Khách hàng</span>
          <span style="font-weight:600; color:#333;">${userName}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:14px;">
          <span style="color:#888;">Số tiền hoàn</span>
          <span style="font-weight:700; color:#003087;">${amount}</span>
        </div>
      </div>
      <div style="display:flex; align-items:center; justify-content:center; gap:8px; color:#888; font-size:13px;">
        <div style="
          width:18px; height:18px;
          border:2.5px solid #cce4f7; border-top-color:#009cde;
          border-radius:50%; animation:spin .7s linear infinite;
        "></div>
        Đang gọi PayPal API...
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