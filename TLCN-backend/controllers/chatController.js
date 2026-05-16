const { GoogleGenerativeAI } = require("@google/generative-ai");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const ChatConversation = require("../models/chatConversationModel");
const ChatMessage = require("../models/chatMessageModel");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const Category = require("../models/categoryModel");
const Brand = require("../models/brandModel");

let genAI = null;
function getGenAI() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

const SYSTEM_PROMPT = `Bạn là trợ lý bán hàng AI của cửa hàng bán laptop trực tuyến Laptop Shop.
Nhiệm vụ của bạn:
1. Tư vấn sản phẩm laptop dựa trên nhu cầu khách hàng (gaming, văn phòng, đồ họa, sinh viên...)
2. So sánh chi tiết các sản phẩm laptop khi khách yêu cầu
3. Tra cứu thông tin đơn hàng của khách
4. Trả lời câu hỏi về chính sách cửa hàng

Chính sách cửa hàng:
- Giao hàng miễn phí toàn quốc cho đơn từ 500.000đ
- Đổi trả trong 7 ngày nếu lỗi từ nhà sản xuất
- Bảo hành chính hãng 12-24 tháng tùy sản phẩm
- Thanh toán: Tiền mặt (COD), PayPal, VNPay, Số dư tài khoản
- Hỗ trợ trả góp 0% qua thẻ tín dụng

Quy tắc trả lời:
- Trả lời bằng Tiếng Việt, thân thiện, chuyên nghiệp
- Khi tư vấn sản phẩm, luôn nêu rõ: tên, giá, cấu hình chính (CPU, RAM, GPU, màn hình)
- Khi so sánh, trình bày dạng bảng rõ ràng
- Nếu không có sản phẩm phù hợp trong dữ liệu, nói rõ là không tìm thấy
- Không bịa thông tin sản phẩm, chỉ dùng dữ liệu được cung cấp
- Khi đề cập sản phẩm, format giá tiền dạng VNĐ (ví dụ: 15.990.000đ)
- Trả lời ngắn gọn, đi vào trọng tâm
- Nếu khách hàng hỏi những vấn đề không liên quan đến laptop, công nghệ hoặc cửa hàng, hãy từ chối lịch sự`;

function detectIntent(message) {
  const msg = message.toLowerCase();

  if (
    msg.includes("so sánh") ||
    msg.includes("khác nhau") ||
    msg.includes("khác gì") ||
    msg.includes("nên chọn") ||
    msg.includes("hay là") ||
    msg.includes("vs") ||
    msg.includes("versus")
  ) {
    return "compare";
  }

  if (
    msg.includes("đơn hàng") ||
    msg.includes("đơn của tôi") ||
    msg.includes("order") ||
    msg.includes("giao hàng") ||
    msg.includes("trạng thái đơn") ||
    msg.includes("mua rồi")
  ) {
    return "order";
  }

  if (
    msg.includes("chính sách") ||
    msg.includes("bảo hành") ||
    msg.includes("đổi trả") ||
    msg.includes("hoàn tiền") ||
    msg.includes("trả góp") ||
    msg.includes("thanh toán") ||
    msg.includes("giao hàng") ||
    msg.includes("ship")
  ) {
    return "policy";
  }

  return "consult";
}

function extractKeywords(message) {
  const keywords = [];
  const msg = message.toLowerCase();

  const brands = [
    "asus", "dell", "hp", "lenovo", "acer", "msi", "apple", "macbook",
    "thinkpad", "razer", "samsung", "lg", "gigabyte",
  ];
  brands.forEach((b) => {
    if (msg.includes(b)) keywords.push(b);
  });

  const demands = [
    "gaming", "văn phòng", "đồ họa", "sinh viên", "lập trình",
    "mỏng nhẹ", "doanh nhân",
  ];
  demands.forEach((d) => {
    if (msg.includes(d)) keywords.push(d);
  });

  const priceMatch = msg.match(/(\d+)\s*(triệu|tr|m)/);
  if (priceMatch) {
    keywords.push({ type: "price", value: parseInt(priceMatch[1]) * 1000000 });
  }

  return keywords;
}

// === RETRIEVAL: Two-Step Hybrid RAG (Vector Search + Real-time Hydration) ===
async function retrieveProducts(message, keywords) {
  const filter = {};
  let priceFilter = null;

  keywords.forEach((kw) => {
    if (typeof kw === "object" && kw.type === "price") {
      filter.price = { $lte: kw.value };
      priceFilter = kw.value;
    }
  });

  const selectFields = "title price promotion specs brand category inventory images ratingsAverage";

  try {
    // Step 1: Semantic Search via Atlas Vector Search
    const model = getGenAI().getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent(message);
    const queryVector = result.embedding.values;

    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryVector,
          numCandidates: 100,
          limit: 15,
        }
      },
      {
        $project: {
          _id: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ];

    const searchResults = await Product.aggregate(pipeline);

    // Lọc điểm tương đồng > 0.55 (chống hỏi ngoài luồng)
    const candidateIds = searchResults
      .filter(p => p.score > 0.55)
      .map(p => p._id);

    if (candidateIds.length > 0) {
      // Step 2: Real-time Hydration (Giá/Tồn kho chuẩn 100%)
      let query = { _id: { $in: candidateIds } };
      if (priceFilter) {
        query.price = { $lte: priceFilter };
      }

      const hydratedProducts = await Product.find(query)
        .populate("brand category")
        .select(selectFields)
        .limit(10)
        .lean();

      if (hydratedProducts.length > 0) {
        return hydratedProducts;
      }
    }
  } catch (error) {
    console.error("Lỗi Vector Search (fallback về Search thường):", error.message);
  }

  // --- FALLBACK: Keyword/Regex search ---
  const textKeywords = keywords.filter((kw) => typeof kw === "string");

  if (textKeywords.length > 0) {
    try {
      const textResults = await Product.find({
        ...filter,
        $text: { $search: textKeywords.join(" ") },
      })
        .populate("brand category")
        .select(selectFields)
        .limit(10)
        .lean();
      if (textResults.length > 0) return textResults;
    } catch (e) { /* fall through */ }
  }

  let regexConditions = [];
  if (textKeywords.length > 0) {
    textKeywords.forEach((kw) => {
      regexConditions.push({ title: { $regex: kw, $options: "i" } });
      regexConditions.push({ "specs.demand": { $regex: kw, $options: "i" } });
    });
    const regexResults = await Product.find({
      ...filter,
      $or: regexConditions,
    })
      .populate("brand category")
      .select(selectFields)
      .limit(10)
      .lean();
    if (regexResults.length > 0) return regexResults;
  }

  const fallback = await Product.find(filter)
    .populate("brand category")
    .select(selectFields)
    .sort({ price: 1 })
    .limit(10)
    .lean();

  if (fallback.length === 0 && filter.price && regexConditions.length > 0) {
    const withoutPriceFallback = await Product.find({ $or: regexConditions })
      .populate("brand category")
      .select(selectFields)
      .sort({ price: 1 })
      .limit(5)
      .lean();
    return withoutPriceFallback;
  }

  return fallback;
}

async function retrieveOrders(userId) {
  const orders = await Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  return orders;
}

// === FORMAT CONTEXT: Adapted for specs object ===
function formatProductContext(products) {
  if (!products || products.length === 0) return "Không tìm thấy sản phẩm phù hợp trong cửa hàng.";

  return products
    .map((p, i) => {
      const brandName = p.brand?.name || "N/A";
      const catName = p.category?.name || "N/A";
      const s = p.specs || {};
      return `[Sản phẩm ${i + 1}] ID: ${p._id}
- Tên: ${p.title}
- Giá: ${p.price?.toLocaleString("vi-VN")}đ${p.promotion ? ` (Giảm còn ${p.promotion?.toLocaleString("vi-VN")}đ)` : ""}
- CPU: ${s.cpu || "N/A"}
- RAM: ${s.ram || "N/A"}
- Màn hình: ${s.screen || "N/A"}
- Card đồ họa: ${s.graphicCard || "N/A"}
- Ổ cứng: ${s.storage || "N/A"}
- Pin: ${s.battery || "N/A"}
- Thương hiệu: ${brandName}
- Danh mục: ${catName}
- Nhu cầu: ${s.demand || "N/A"}
- Đánh giá: ${p.ratingsAverage || "N/A"}/5
- Tồn kho: ${p.inventory || 0}`;
    })
    .join("\n\n");
}

function formatOrderContext(orders) {
  if (!orders || orders.length === 0) return "Không tìm thấy đơn hàng nào.";

  return orders
    .map((o, i) => {
      const items = o.cart?.map((c) => c.product?.title || "Sản phẩm").join(", ") || "N/A";
      return `[Đơn hàng ${i + 1}] Mã: ${o._id}
- Sản phẩm: ${items}
- Tổng tiền: ${o.totalPrice?.toLocaleString("vi-VN")}đ
- Thanh toán: ${o.payments}
- Trạng thái: ${o.status}
- Ngày đặt: ${new Date(o.createdAt).toLocaleDateString("vi-VN")}`;
    })
    .join("\n\n");
}

// === CONTROLLER ENDPOINTS ===
exports.sendMessage = catchAsync(async (req, res, next) => {
  const { message, conversationId } = req.body;
  const userId = req.user.id;

  if (!message || message.trim() === "") {
    return next(new AppError("Vui lòng nhập tin nhắn", 400));
  }

  let conversation;
  if (conversationId) {
    conversation = await ChatConversation.findOne({
      _id: conversationId,
      user: userId,
    });
    if (!conversation) {
      return next(new AppError("Không tìm thấy cuộc hội thoại", 404));
    }
  } else {
    const title = message.length > 50 ? message.substring(0, 50) + "..." : message;
    conversation = await ChatConversation.create({
      user: userId,
      title,
    });
  }

  await ChatMessage.create({
    conversation: conversation._id,
    role: "user",
    content: message,
  });

  const intent = detectIntent(message);
  const keywords = extractKeywords(message);

  let context = "";
  let productIds = [];

  if (intent === "order") {
    const orders = await retrieveOrders(userId);
    context = `\n\n--- DỮ LIỆU ĐƠN HÀNG CỦA KHÁCH ---\n${formatOrderContext(orders)}`;
  } else if (intent === "policy") {
    context = "\n\n--- Trả lời dựa trên chính sách cửa hàng trong System Prompt ---";
  } else {
    const products = await retrieveProducts(message, keywords);
    context = `\n\n--- DỮ LIỆU SẢN PHẨM TỪ CỬA HÀNG ---\n${formatProductContext(products)}`;
    productIds = products.map((p) => p._id);

    if (intent === "compare" && products.length < 2) {
      const allProducts = await Product.find()
        .select("title price promotion specs brand category inventory images ratingsAverage")
        .limit(10)
        .lean();
      context = `\n\n--- DỮ LIỆU SẢN PHẨM TỪ CỬA HÀNG (để so sánh) ---\n${formatProductContext(allProducts)}`;
      productIds = allProducts.map((p) => p._id);
    }
  }

  // Conversational Memory: lấy 10 tin nhắn gần nhất
  const history = await ChatMessage.find({ conversation: conversation._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const chatHistory = history
    .reverse()
    .map((m) => `${m.role === "user" ? "Khách hàng" : "Trợ lý"}: ${m.content}`)
    .join("\n");

  const fullPrompt = `${SYSTEM_PROMPT}
${context}

--- LỊCH SỬ HỘI THOẠI GẦN ĐÂY ---
${chatHistory}

Khách hàng: ${message}

Trợ lý:`;

  let aiResponse = "";
  const models = ["gemini-2.5-flash", "gemini-2.0-flash"];

  for (const modelName of models) {
    let success = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = getGenAI().getGenerativeModel({ model: modelName });
        const result = await model.generateContent(fullPrompt);
        aiResponse = result.response.text();
        success = true;
        break;
      } catch (error) {
        console.error(`Gemini [${modelName}] attempt ${attempt + 1}:`, error.message?.substring(0, 150));
        if ((error.message?.includes("429") || error.message?.includes("503")) && attempt < 1) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        break;
      }
    }
    if (success) break;
  }

  if (!aiResponse) {
    aiResponse = "Xin lỗi, hệ thống AI đang gặp sự cố. Vui lòng thử lại sau hoặc liên hệ hotline để được hỗ trợ.";
  }

  const assistantMsg = await ChatMessage.create({
    conversation: conversation._id,
    role: "assistant",
    content: aiResponse,
    productRefs: productIds.slice(0, 5),
  });

  conversation.updatedAt = Date.now();
  await conversation.save({ validateBeforeSave: false });

  const referencedProducts = productIds.length > 0
    ? await Product.find({ _id: { $in: productIds.slice(0, 5) } })
        .select("_id title price promotion images slug")
        .lean()
    : [];

  res.status(200).json({
    status: "success",
    data: {
      conversationId: conversation._id,
      message: {
        role: "assistant",
        content: aiResponse,
        createdAt: assistantMsg.createdAt,
      },
      products: referencedProducts,
    },
  });
});

exports.getConversations = catchAsync(async (req, res, next) => {
  const conversations = await ChatConversation.find({ user: req.user.id })
    .sort({ updatedAt: -1 })
    .select("title createdAt updatedAt")
    .lean();

  res.status(200).json({
    status: "success",
    results: conversations.length,
    data: { conversations },
  });
});

exports.getMessages = catchAsync(async (req, res, next) => {
  const conversation = await ChatConversation.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!conversation) {
    return next(new AppError("Không tìm thấy cuộc hội thoại", 404));
  }

  const messages = await ChatMessage.find({ conversation: req.params.id })
    .sort({ createdAt: 1 })
    .select("role content productRefs createdAt")
    .lean();

  res.status(200).json({
    status: "success",
    data: {
      conversation,
      messages,
    },
  });
});

exports.deleteConversation = catchAsync(async (req, res, next) => {
  const conversation = await ChatConversation.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!conversation) {
    return next(new AppError("Không tìm thấy cuộc hội thoại", 404));
  }

  await ChatMessage.deleteMany({ conversation: req.params.id });
  await ChatConversation.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});
