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

  const { current } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, products]);

  useEffect(() => {
    if (isOpen && current) fetchConversations();
  }, [isOpen, current]);

  const fetchConversations = async () => {
    try {
      const res = await chatApi.getConversations();
      setConversations(res.data?.conversations || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadConversation = async (id) => {
    try {
      const res = await chatApi.getMessages(id);
      setMessages(res.data?.messages || []);
      setActiveConversation(id);
      setProducts([]);
      setShowSidebar(false);
    } catch (err) {
      console.error(err);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setActiveConversation(null);
    setProducts([]);
    setShowSidebar(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    if (!current) {
      toast.warning("Vui lòng đăng nhập");
      navigate("/sign-in");
      return;
    }

    const userMessage = {
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setProducts([]);

    try {
      const res = await chatApi.sendMessage({
        message: userMessage.content,
        conversationId: activeConversation,
      });

      const data = res.data;

      if (!activeConversation && data.conversationId) {
        setActiveConversation(data.conversationId);
        fetchConversations();
      }

      setMessages((prev) => [...prev, data.message]);
      if (data.products) setProducts(data.products);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Có lỗi xảy ra",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-[9999] hover:scale-110 transition"
        style={{ background: "linear-gradient(135deg,#ec4899,#f472b6)" }}
      >
        💬
      </button>

      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-[9998] bg-white rounded-2xl shadow-2xl flex overflow-hidden"
          style={{
            width: showSidebar ? 620 : 380,
            height: 500, // 👈 GIẢM CHIỀU CAO
            border: "1px solid #fbcfe8",
          }}
        >
          {/* Sidebar */}
          {showSidebar && (
            <div className="w-[200px] bg-pink-50 border-r border-pink-100 flex flex-col">
              <div className="p-2 border-b">
                <button
                  onClick={startNewChat}
                  className="w-full py-2 text-white rounded text-sm"
                  style={{
                    background: "linear-gradient(135deg,#ec4899,#f472b6)",
                  }}
                >
                  + Chat mới
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {conversations.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => loadConversation(c._id)}
                    className="px-3 py-2 text-sm hover:bg-pink-100 cursor-pointer"
                  >
                    {c.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main */}
          <div className="flex-1 flex flex-col">

            {/* Header */}
            <div
              className="px-4 py-2 text-white flex justify-between items-center"
              style={{
                background: "linear-gradient(135deg,#ec4899,#f472b6)",
              }}
            >
              <button onClick={() => setShowSidebar(!showSidebar)}>☰</button>
              <div className="font-semibold text-sm">HC-Tech AI</div>
              <div className="text-xs">Online</div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 bg-white">
              
              {/* 👇 WELCOME MESSAGE */}
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-pink-400">
                  <div className="text-lg font-semibold">
                    Xin chào 👋
                  </div>
                  <div className="text-sm">
                    Mình có thể giúp gì cho bạn?
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <ChatMessageItem
                  key={i}
                  message={m}
                  isUser={m.role === "user"}
                />
              ))}

              {products.map((p) => (
                <ChatProductCard key={p._id} product={p} />
              ))}

              {loading && (
                <div className="text-pink-400 text-sm">
                  Đang trả lời...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-2 border-t flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 px-3 py-2 rounded-full border border-pink-200 text-sm"
                placeholder="Nhập tin nhắn..."
              />

              <button
                onClick={handleSend}
                className="px-4 text-white rounded-full"
                style={{
                  background: "linear-gradient(135deg,#ec4899,#f472b6)",
                }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;