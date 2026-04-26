import React from "react";

const ChatMessageItem = ({ message, isUser }) => {
  const formatContent = (text) => {
    if (!text) return "";
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
      .replace(/\n/g, "<br/>");

    formatted = formatted.replace(
      /\|(.+)\|/g,
      (match) => `<div class="overflow-x-auto text-xs my-1"><table class="border-collapse border border-gray-300 w-full">${match
        .split("\n")
        .map(
          (row) =>
            `<tr>${row
              .split("|")
              .filter(Boolean)
              .map((cell) => `<td class="border border-gray-300 px-2 py-1">${cell.trim()}</td>`)
              .join("")}</tr>`
        )
        .join("")}</table></div>`
    );
    return formatted;
  };

  return (
    <div className={`flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 110 2h-1.17A7 7 0 0113 22h-2a7 7 0 01-6.83-6H3a1 1 0 110-2h1a7 7 0 017-7h1V5.73A2 2 0 0112 2z" />
          </svg>
        </div>
      )}

      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-blue-500 text-white rounded-br-md"
            : "bg-gray-100 text-gray-800 rounded-bl-md"
        }`}
      >
        <div
          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
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
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default ChatMessageItem;
