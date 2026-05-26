import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import chatApi from "../../api/chatApi";
import ChatMessageItem from "./ChatMessageItem";
import ChatProductCard from "./ChatProductCard";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [products, setProducts] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { current } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, products]);

  useEffect(() => {
    if (isOpen && current) {
      fetchConversations();
    }
  }, [isOpen, current]);

  const fetchConversations = async () => {
    try {
      const res = await chatApi.getConversations();
      setConversations(res.data?.conversations || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadConversation = async (convId) => {
    try {
      const res = await chatApi.getMessages(convId);
      setMessages(res.data?.messages || []);
      setActiveConversation(convId);
      setShowSidebar(false);
      setProducts([]);
    } catch (error) {
      console.error(error);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setActiveConversation(null);
    setShowSidebar(false);
    setProducts([]);
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await chatApi.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (activeConversation === convId) {
        startNewChat();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    if (!current) {
      toast.warning("Vui lòng đăng nhập để sử dụng chatbot");
      navigate("/sign-in");
      return;
    }

    const userMessage = {
      role: "user",
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setProducts([]);

    try {
      const token = localStorage.getItem("jwt"); // Token được lưu với key "jwt"
      const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
      const res = await fetch(`${baseUrl}/api/v1/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: activeConversation,
        }),
      });

      if (!res.ok) throw new Error("Network error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let isFirstChunk = true;

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith("data: ")) {
            const dataStr = trimmedLine.slice(6).trim();
            if (dataStr === "[DONE]") {
              setLoading(false);
              break;
            }
            try {
              const data = JSON.parse(dataStr);
              
              if (data.conversationId && !activeConversation) {
                setActiveConversation(data.conversationId);
                fetchConversations();
              }
              
              if (data.products && data.products.length > 0) {
                setProducts(data.products);
              }

              if (data.chunk) {
                if (isFirstChunk) {
                  setLoading(false);
                  setMessages(prev => [
                    ...prev, 
                    { role: "assistant", content: data.chunk, createdAt: new Date().toISOString() }
                  ]);
                  isFirstChunk = false;
                } else {
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    const last = newMsgs[newMsgs.length - 1];
                    last.content += data.chunk;
                    return newMsgs;
                  });
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Có lỗi xảy ra, vui lòng thử lại.",
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-[9999] transition-all duration-300 hover:scale-110"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
        title="Chat với AI"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-[9998] bg-white rounded-2xl shadow-2xl flex overflow-hidden"
          style={{
            width: showSidebar ? "620px" : "400px",
            height: "560px",
            border: "1px solid #e5e7eb",
            transition: "width 0.3s ease",
          }}
        >
          {/* Sidebar - Conversation History */}
          {showSidebar && (
            <div className="w-[220px] bg-gray-50 border-r border-gray-200 flex flex-col">
              <div className="p-3 border-b border-gray-200">
                <button
                  onClick={startNewChat}
                  className="w-full py-2 px-3 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Chat mới
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.map((conv) => (
                  <div
                    key={conv._id}
                    onClick={() => loadConversation(conv._id)}
                    className={`px-3 py-3 cursor-pointer border-b border-gray-100 hover:bg-gray-100 transition-colors flex items-center justify-between group ${
                      activeConversation === conv._id ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {conv.title}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(conv.updatedAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv._id, e)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all ml-2 flex-shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                {conversations.length === 0 && (
                  <p className="text-xs text-gray-400 text-center mt-8 px-3">
                    Chưa có cuộc hội thoại nào
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center justify-between flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"
                  title="Lịch sử chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div>
                  <h3 className="text-white font-semibold text-sm">
                    Laptop Shop AI Assistant
                  </h3>
                  <p className="text-white/70 text-[10px]">
                    Tư vấn laptop • So sánh • Đơn hàng
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white/70 text-[10px]">Online</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 110 2h-1.17A7 7 0 0113 22h-2a7 7 0 01-6.83-6H3a1 1 0 110-2h1a7 7 0 017-7h1V5.73A2 2 0 0112 2z" />
                    </svg>
                  </div>
                  <h4 className="text-gray-700 font-semibold text-sm mb-2">
                    Xin chào! 👋
                  </h4>
                  <p className="text-gray-400 text-xs leading-relaxed max-w-[250px]">
                    Mình là trợ lý AI của Laptop Shop. Hãy hỏi mình về laptop, so
                    sánh sản phẩm, hoặc kiểm tra đơn hàng nhé!
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {[
                      "Laptop gaming dưới 20 triệu?",
                      "So sánh Dell và Asus",
                      "Chính sách đổi trả?",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          inputRef.current?.focus();
                        }}
                        className="px-3 py-1.5 text-[11px] bg-gray-100 text-gray-600 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, index) => (
                <ChatMessageItem
                  key={index}
                  message={msg}
                  isUser={msg.role === "user"}
                />
              ))}

              {/* Product Cards */}
              {products.length > 0 && (
                <div className="mb-4 ml-10">
                  <p className="text-xs text-gray-500 mb-2 font-medium">
                    📦 Sản phẩm liên quan:
                  </p>
                  {products.map((product) => (
                    <ChatProductCard key={product._id} product={product} />
                  ))}
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 110 2h-1.17A7 7 0 0113 22h-2a7 7 0 01-6.83-6H3a1 1 0 110-2h1a7 7 0 017-7h1V5.73A2 2 0 0112 2z" />
                    </svg>
                  </div>
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập câu hỏi..."
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-300 transition-all disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-40 hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
