import React from "react";

const ChatMessageItem = ({ message, isUser }) => {
  const escapeHtml = (text = "") =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const formatInline = (text = "") => {
    return escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /`(.*?)`/g,
        '<code class="bg-gray-200 px-1 rounded text-xs">$1</code>'
      );
  };

  const isTableLine = (line) => {
    const trimmed = line.trim();
    return trimmed.startsWith("|") && trimmed.endsWith("|");
  };

  const isSeparatorLine = (line) => {
    return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
  };

  const renderTable = (tableLines) => {
    const rows = tableLines
      .filter((line) => !isSeparatorLine(line))
      .map((line) =>
        line
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim())
      );

    if (rows.length === 0) return "";

    const headers = rows[0];
    const numProducts = headers.length - 1;

    // Nếu không có sản phẩm nào hoặc định dạng lỗi, bỏ qua
    if (numProducts <= 0) return "";

    // Render dạng đứng (Vertical Card List)
    let html = `<div class="space-y-4 my-3">`;

    for (let colIndex = 1; colIndex <= numProducts; colIndex++) {
      const productName = headers[colIndex];
      html += `
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-left">
          <!-- Tên sản phẩm Header -->
          <div class="bg-gray-50 border-b border-gray-150 px-3 py-2.5 flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
              ${colIndex}
            </span>
            <span class="font-bold text-xs text-gray-800">${formatInline(productName)}</span>
          </div>
          <!-- Thông số chi tiết -->
          <div class="p-3 space-y-2 text-xs">
      `;

      for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        const criteriaName = rows[rowIndex][0];
        const criteriaValue = rows[rowIndex][colIndex] || "-";

        // Nhấn mạnh thuộc tính Giá
        const isPrice = criteriaName.toLowerCase().includes("giá");

        html += `
          <div class="flex border-b border-gray-50 last:border-b-0 py-1.5 flex-wrap">
            <span class="w-[75px] text-gray-400 font-semibold flex-shrink-0">${formatInline(criteriaName)}</span>
            <span class="flex-1 text-gray-700 break-words ${isPrice ? "text-red-500 font-bold" : "font-medium"}">
              ${formatInline(criteriaValue)}
            </span>
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    html += `</div>`;
    return html;
  };

  const formatContent = (text) => {
    if (!text) return "";

    const lines = text.split("\n");
    const htmlParts = [];
    let tableBuffer = [];

    const flushTable = () => {
      if (tableBuffer.length > 0) {
        htmlParts.push(renderTable(tableBuffer));
        tableBuffer = [];
      }
    };

    lines.forEach((line) => {
      if (isTableLine(line)) {
        tableBuffer.push(line);
      } else {
        flushTable();

        if (line.trim() === "") {
          htmlParts.push("<br/>");
        } else {
          htmlParts.push(
            `<p class="mb-2 last:mb-0 break-words whitespace-pre-wrap">${formatInline(
              line
            )}</p>`
          );
        }
      }
    });

    flushTable();

    return htmlParts.join("");
  };

  const hasTable = message.content && message.content.includes("|");

  return (
    <div
      className={`flex w-full min-w-0 mb-4 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 110 2h-1.17A7 7 0 0113 22h-2a7 7 0 01-6.83-6H3a1 1 0 110-2h1a7 7 0 017-7h1V5.73A2 2 0 0112 2z" />
          </svg>
        </div>
      )}

      <div
        className={`min-w-0 px-4 py-3 rounded-2xl text-sm leading-relaxed break-words overflow-hidden ${
          hasTable ? "flex-1 max-w-[85%]" : "w-fit max-w-[85%]"
        } ${
          isUser
            ? "bg-blue-500 text-white rounded-br-md"
            : "bg-gray-100 text-gray-800 rounded-bl-md"
        }`}
      >
        <div
          className="w-full min-w-0 overflow-hidden"
          dangerouslySetInnerHTML={{
            __html: formatContent(message.content),
          }}
        />

        <div
          className={`text-[10px] mt-1 ${
            isUser ? "text-blue-100" : "text-gray-400"
          }`}
        >
          {new Date(message.createdAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0 ml-2 mt-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default ChatMessageItem;