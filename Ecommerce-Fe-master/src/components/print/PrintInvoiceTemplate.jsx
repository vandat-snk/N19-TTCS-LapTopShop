import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";

/**
 * PrintInvoiceTemplate
 * ─────────────────────────────────────────────────────────────────────────
 * Đặt file này tại:
 *   src/components/print/PrintInvoiceTemplate.jsx
 *
 * Props:
 *   order   {object}    – dữ liệu đơn hàng từ API / Redux
 *   trigger {ReactNode} – nút in tùy chỉnh (optional)
 *                         nếu không truyền dùng nút mặc định màu #d63384
 *
 * Cách dùng (ví dụ trong trang Order Detail của FE):
 * ─────────────────────────────────────────────────
 *   import PrintInvoiceTemplate from "@/components/print/PrintInvoiceTemplate";
 *
 *   // order lấy từ Redux selector hoặc API call, shape:
 *   // { _id, createdAt, status,
 *   //   user: { name, email },
 *   //   cart: [{ name, image, price, quantity }],
 *   //   shippingDetails: { receiver, phone, address },
 *   //   paymentInfo: { method, status },
 *   //   totalPrice, discount }
 *
 *   <PrintInvoiceTemplate order={order} />
 *
 *   // Hoặc dùng nút tùy chỉnh:
 *   <PrintInvoiceTemplate order={order} trigger={<MyButton />} />
 * ─────────────────────────────────────────────────────────────────────────
 */

// ── Helpers ──────────────────────────────────────────────────────────────
const formatVND = (n) =>
  n != null ? Number(n).toLocaleString("vi-VN") + " ₫" : "0 ₫";

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString("vi-VN") : "";

// ── Template (phần được in) ───────────────────────────────────────────────
// Dùng React.forwardRef để react-to-print lấy được DOM node
const InvoiceDocument = React.forwardRef(({ order }, ref) => {
  if (!order) return null;

  const {
    _id,
    createdAt,
    cart = [],
    shippingDetails = {},
    paymentInfo = {},
    totalPrice = 0,
    discount = 0,
    status = "",
    user = {},
  } = order;

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div ref={ref} style={s.page}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div>
          <h1 style={s.shopName}>LapTopShop</h1>
          <p style={s.shopSub}>Chuyên laptop chính hãng</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={s.invoiceTitle}>HOÁ ĐƠN BÁN HÀNG</h2>
          <p style={s.meta}>Mã đơn: #{String(_id).slice(-8).toUpperCase()}</p>
          <p style={s.meta}>Ngày: {formatDate(createdAt)}</p>
          <p style={s.meta}>Trạng thái: <strong>{status}</strong></p>
        </div>
      </div>

      <hr style={s.divider} />

      {/* ── Thông tin 2 cột ── */}
      <div style={s.infoGrid}>
        <div>
          <p style={s.sectionLabel}>Thông tin khách hàng</p>
          <p style={s.infoLine}>
            <strong>Người nhận:</strong>{" "}
            {shippingDetails.receiver || user.name || "—"}
          </p>
          <p style={s.infoLine}>
            <strong>SĐT:</strong> {shippingDetails.phone || "—"}
          </p>
          <p style={s.infoLine}>
            <strong>Địa chỉ:</strong> {shippingDetails.address || "—"}
          </p>
          {user.email && (
            <p style={s.infoLine}>
              <strong>Email:</strong> {user.email}
            </p>
          )}
        </div>

        <div style={{ textAlign: "right" }}>
          <p style={s.sectionLabel}>Thanh toán</p>
          <p style={s.infoLine}>
            <strong>Phương thức:</strong>{" "}
            {paymentInfo.method === "paypal" ? "PayPal" : "Tiền mặt"}
          </p>
          <p style={s.infoLine}>
            <strong>Trạng thái TT:</strong>{" "}
            <span
              style={{
                color:
                  paymentInfo.status === "Paid" ? "#16a34a" : "#d97706",
                fontWeight: 600,
              }}
            >
              {paymentInfo.status || "Pending"}
            </span>
          </p>
        </div>
      </div>

      {/* ── Bảng sản phẩm ── */}
      <table style={s.table}>
        <thead>
          <tr style={s.thead}>
            <th style={{ ...s.th, width: "5%" }}>STT</th>
            <th style={{ ...s.th, width: "42%", textAlign: "left" }}>
              Sản phẩm
            </th>
            <th style={{ ...s.th, width: "17%" }}>Đơn giá</th>
            <th style={{ ...s.th, width: "9%" }}>SL</th>
            <th style={{ ...s.th, width: "20%" }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {cart.map((item, idx) => (
            <tr
              key={idx}
              style={idx % 2 === 0 ? s.rowEven : s.rowOdd}
            >
              <td style={s.tdCenter}>{idx + 1}</td>
              <td style={s.td}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {item.image && (
                    <img
                      src={item.image}
                      alt=""
                      style={s.productImg}
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  )}
                  <span>{item.name || item.title || "Sản phẩm"}</span>
                </div>
              </td>
              <td style={s.tdCenter}>{formatVND(item.price)}</td>
              <td style={s.tdCenter}>{item.quantity}</td>
              <td style={s.tdRight}>
                {formatVND(item.price * item.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Tổng kết ── */}
      <div style={s.summaryWrap}>
        <div style={s.summaryBox}>
          <div style={s.summaryRow}>
            <span>Tạm tính:</span>
            <span>{formatVND(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div style={s.summaryRow}>
              <span>Giảm giá:</span>
              <span style={{ color: "#d63384" }}>
                - {formatVND(discount)}
              </span>
            </div>
          )}
          <div style={{ ...s.summaryRow, ...s.summaryTotal }}>
            <span>TỔNG THANH TOÁN:</span>
            <span>{formatVND(totalPrice)}</span>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={s.footer}>
        <p>
          Cảm ơn quý khách đã mua hàng tại{" "}
          <strong>LapTopShop</strong>!
        </p>
        <p style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
          Mọi thắc mắc xin liên hệ: support@laptopshop.vn
        </p>
      </div>
    </div>
  );
});

InvoiceDocument.displayName = "InvoiceDocument";

// ── Component chính (wrapper + nút in) ──────────────────────────────────
const PrintInvoiceTemplate = ({ order, trigger }) => {
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `HoaDon_${order?._id || ""}`,
    onBeforeGetContent: () => {
      // Ẩn các phần không cần in (sidebar, chatbot…) qua class
      document.body.classList.add("printing");
    },
    onAfterPrint: () => {
      document.body.classList.remove("printing");
    },
  });

  return (
    <>
      {/* Nút bấm – dùng trigger prop hoặc nút mặc định */}
      <span onClick={handlePrint} style={{ cursor: "pointer" }}>
        {trigger ?? (
          <button type="button" style={s.printBtn}>
            🖨️ In hoá đơn
          </button>
        )}
      </span>

      {/* Template ẩn trong DOM – chỉ hiện khi window.print() chạy */}
      <div style={{ display: "none" }}>
        <InvoiceDocument ref={printRef} order={order} />
      </div>
    </>
  );
};

export { InvoiceDocument };
export default PrintInvoiceTemplate;

// ── Styles (inline để tự chứa, không cần CSS file) ───────────────────────
const s = {
  page: {
    fontFamily: "'Segoe UI', Arial, sans-serif",
    fontSize: 13,
    color: "#222",
    padding: "32px 40px",
    maxWidth: 800,
    margin: "0 auto",
    background: "#fff",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  shopName: { margin: 0, fontSize: 24, color: "#d63384", fontWeight: 700 },
  shopSub:  { margin: "3px 0 0", fontSize: 12, color: "#888" },
  invoiceTitle: { margin: 0, fontSize: 18, fontWeight: 700 },
  meta: { margin: "2px 0", fontSize: 12, color: "#555" },
  divider: {
    border: "none",
    borderTop: "2px solid #d63384",
    margin: "12px 0",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 1,
    color: "#d63384",
    textTransform: "uppercase",
    margin: "0 0 6px",
  },
  infoLine: { margin: "3px 0", fontSize: 13 },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: 16,
  },
  thead: { background: "#d63384", color: "#fff" },
  th: {
    padding: "9px 10px",
    fontWeight: 600,
    fontSize: 12,
    textAlign: "center",
  },
  td:       { padding: "9px 10px", fontSize: 13, verticalAlign: "middle" },
  tdCenter: { padding: "9px 10px", fontSize: 13, textAlign: "center", verticalAlign: "middle" },
  tdRight:  {
    padding: "9px 10px",
    fontSize: 13,
    textAlign: "right",
    verticalAlign: "middle",
    fontWeight: 600,
    color: "#d63384",
  },
  rowEven: { background: "#fff" },
  rowOdd:  { background: "#fdf2f8" },
  productImg: {
    width: 44,
    height: 44,
    objectFit: "cover",
    borderRadius: 6,
    flexShrink: 0,
  },
  summaryWrap: { display: "flex", justifyContent: "flex-end", marginBottom: 24 },
  summaryBox:  { minWidth: 260 },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
    fontSize: 13,
    borderBottom: "1px solid #f0e0ea",
  },
  summaryTotal: {
    fontWeight: 700,
    fontSize: 16,
    color: "#d63384",
    borderBottom: "2px solid #d63384",
    paddingTop: 8,
  },
  footer: {
    textAlign: "center",
    marginTop: 24,
    paddingTop: 12,
    borderTop: "1px dashed #ddd",
    fontSize: 13,
    color: "#555",
  },
  printBtn: {
    background: "#d63384",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 18px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
};
