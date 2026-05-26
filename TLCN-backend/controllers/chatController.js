const { GoogleGenerativeAI } = require("@google/generative-ai");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const ChatConversation = require("../models/chatConversationModel");
const ChatMessage = require("../models/chatMessageModel");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const Category = require("../models/categoryModel");
const Brand = require("../models/brandModel");

function normalizeVietnameseSlang(text) {
  if (!text) return "";
  let norm = text.toLowerCase();

  // 1. Thay thế các cụm từ tiếng lóng/viết tắt ghép trước (tránh lỗi chia sai từ đơn)
  const phraseDict = {
    "áp rai": "aspire",
    "áp do": "aspire",
    "mắc búc": "macbook",
    "mắc book": "macbook",
    "lê nổ vô": "lenovo",
    "lê nô vô": "lenovo",
    "ác xơ": "acer",
    "a xớt": "asus",
    "a sút": "asus",
    "ly dần": "legion",
    "li dần": "legion",
    "ly dan": "legion",
    "li dan": "legion",
    "víc tớt": "victus",
    "vic tớt": "victus",
    "víc tơ": "victus",
    "vic tơ": "victus",
    "víc tus": "victus",
    "vic tus": "victus",
    "zen búc": "zenbook",
    "zen book": "zenbook",
    "vi vô búc": "vivobook",
    "vi vo búc": "vivobook",
    "vi vô book": "vivobook",
    "rốc strix": "rog strix",
    rốc: "rog",
    róc: "rog",
    "sờ trích": "strix",
    "ô men": "omen",
    "o men": "omen",
    "pre đa to": "predator",
    "pờ re đa tơ": "predator",
    "hê li ót": "helios",
    "he li ot": "helios",
    "la ti tút": "latitude",
    "la ti tud": "latitude",
    "thin bát": "thinkpad",
    "thinh bát": "thinkpad",
    "thin pad": "thinkpad",
    "thinh pad": "thinkpad",
    "ai đi a bát": "ideapad",
    "ai đi a pad": "ideapad",
  };

  Object.keys(phraseDict).forEach((k) => {
    norm = norm.split(k).join(phraseDict[k]);
  });

  // 2. Tách từ đơn để thay thế chính xác tuyệt đối (tránh đè chữ như "k" trong "macbook")
  const singleDict = {
    đeo: "dell",
    túp: "tuf",
    táp: "tuf",
    củ: "triệu",
    lít: "trăm",
    tr: "triệu",
    k: "ngàn",
  };

  const words = norm.split(/\s+/);
  const mappedWords = words.map((word) => {
    // Loại bỏ tạm thời dấu câu ở hai bên để so khớp chính xác
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    if (singleDict[cleanWord]) {
      return word.replace(cleanWord, singleDict[cleanWord]);
    }
    return word;
  });

  return mappedWords.join(" ");
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
- CHỈ sử dụng thông tin sản phẩm từ [DỮ LIỆU CỬA HÀNG] trong tin nhắn cuối cùng để trả lời. Tuyệt đối không sử dụng thông số kỹ thuật của các sản phẩm ở câu hỏi trước trong lịch sử nếu chúng không xuất hiện trong [DỮ LIỆU CỬA HÀNG] mới nhất.
- Khi tư vấn sản phẩm, luôn nêu rõ: tên, giá, cấu hình chính (CPU, RAM, GPU, màn hình)
- Khi so sánh, trình bày dạng bảng rõ ràng sử dụng cú pháp bảng Markdown tiêu chuẩn
- Nếu không có sản phẩm phù hợp trong dữ liệu, nói rõ là không tìm thấy
- Không bịa thông tin sản phẩm, chỉ dùng dữ liệu được cung cấp
- TUYỆT ĐỐI KHÔNG tự tạo link website (URL) hay link Markdown. Hệ thống đã có giao diện hiển thị sản phẩm riêng.
- Khi đề cập sản phẩm, format giá tiền dạng VNĐ (ví dụ: 15.990.000đ)
- Trả lời ngắn gọn, đi vào trọng tâm
- Nếu khách hàng hỏi những vấn đề không liên quan đến laptop, công nghệ hoặc cửa hàng, hãy từ chối lịch sự
- ĐẶC BIỆT: Khi khách hàng quyết định mua (chốt sale), hãy luôn dặn khách: "Vui lòng nhấn vào sản phẩm đang hiển thị ở bên dưới để xem chi tiết và tiến hành đặt hàng nhé!"`;

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
    "asus",
    "dell",
    "hp",
    "lenovo",
    "acer",
    "msi",
    "apple",
    "macbook",
    "thinkpad",
    "razer",
    "samsung",
    "lg",
    "gigabyte",
  ];
  brands.forEach((b) => {
    if (msg.includes(b)) keywords.push(b);
  });

  const models = [
    "aspire",
    "nitro",
    "legion",
    "rog",
    "strix",
    "zenbook",
    "latitude",
    "xps",
    "pavilion",
    "victus",
  ];
  models.forEach((m) => {
    if (msg.includes(m)) keywords.push(m);
  });

  const demands = [
    "gaming",
    "văn phòng",
    "đồ họa",
    "sinh viên",
    "lập trình",
    "mỏng nhẹ",
    "doanh nhân",
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

// === RETRIEVAL: Hybrid RAG (Vector Search + Keyword Boost) ===
async function retrieveProducts(message, keywords) {
  const filter = {};
  const textKws = [];
  
  keywords.forEach((kw) => {
    if (typeof kw === "object" && kw.type === "price") filter.price = { $lte: kw.value };
    else if (typeof kw === "string") textKws.push(kw);
  });

  const selectFields =
    "title price promotion specs brand category inventory images ratingsAverage";

  try {
    // 1. Semantic Vector Search
    const response = await fetch(`${process.env.OLLAMA_URL || "http://localhost:11434"}/api/embeddings`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text", prompt: normalizeVietnameseSlang(message) })
    });
    
    if (response.ok) {
      const { embedding } = await response.json();
      const searchResults = await Product.aggregate([
        { $vectorSearch: { index: "vector_index", path: "embedding", queryVector: embedding, numCandidates: 100, limit: 20 } },
        { $project: { score: { $meta: "vectorSearchScore" } } }
      ]);

      const candidateIds = searchResults.filter(p => p.score >= 0.6).map(p => p._id);
      
      if (candidateIds.length > 0) {
        // 2. Real-time Hydration
        const hydratedProducts = await Product.find({ _id: { $in: candidateIds }, ...filter })
          .populate("brand category").select(selectFields).lean();

        // 3. Xếp hạng: Ưu tiên đẩy các sản phẩm chứa từ khóa (Brand/Series) lên đầu để AI dễ so sánh
        let sorted = candidateIds.map(id => hydratedProducts.find(p => p._id.toString() === id.toString())).filter(Boolean);
        
        if (textKws.length > 0) {
          const kwRegex = new RegExp(textKws.join("|"), "i");
          
          const exactMatches = sorted.filter(p => {
            return kwRegex.test(p.title) || 
                   (p.brand && kwRegex.test(p.brand.name)) || 
                   (p.specs && kwRegex.test(p.specs.demand));
          });

          if (exactMatches.length > 0) {
            // Đẩy các sản phẩm khớp từ khóa lên đầu
            sorted = [...exactMatches, ...sorted.filter(p => !exactMatches.includes(p))];
          } else {
            // QUAN TRỌNG: Nếu Vector Search trả về toàn bộ kết quả không chứa keyword nào -> Hủy để ép Fallback
            sorted = [];
          }
        }
        
        if (sorted.length > 0) return sorted.slice(0, 4);
      }
    }
  } catch (error) {
    console.error("Vector Search failed:", error.message);
  }

  // --- FALLBACK: Regex Search nếu Ollama lỗi hoặc không tìm thấy Vector ---
  if (textKws.length > 0) {
    const regexConditions = textKws.flatMap(kw => [
      { title: { $regex: kw, $options: "i" } },
      { "specs.demand": { $regex: kw, $options: "i" } }
    ]);
    
    const fallback = await Product.find({ ...filter, $or: regexConditions })
      .populate("brand category").select(selectFields).limit(4).lean();
    
    // Trả về kết quả (kể cả rỗng) để ép AI báo "Không tìm thấy", tuyệt đối không bốc đại máy khác gây ảo giác
    return fallback;
  }

  // Mặc định (Không có từ khóa): Trả về sản phẩm ngẫu nhiên rẻ nhất
  return Product.find(filter).populate("brand category").select(selectFields).sort({ price: 1 }).limit(4).lean();
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
  if (!products || products.length === 0) return "Không tìm thấy sản phẩm phù hợp";

  return products
    .map((p, i) => {
      const priceStr = p.promotion 
        ? `${p.promotion.toLocaleString("vi-VN")}đ` 
        : `${p.price?.toLocaleString("vi-VN")}đ`;
        
      const s = p.specs || {};
      const descParts = [];
      if (s.cpu) descParts.push(s.cpu);
      if (s.ram) descParts.push(s.ram);
      if (s.graphicCard && s.graphicCard.toLowerCase() !== 'onboard') descParts.push(s.graphicCard);
      if (s.screen) descParts.push(s.screen);
      if (s.storage) descParts.push(s.storage);
      
      const desc = descParts.length > 0 ? descParts.join(", ") : (p.category?.name || "Laptop");
      
      return `- Tên: ${p.title} | Giá: ${priceStr} | Mô tả: ${desc}`;
    })
    .join("\n");
}

function formatOrderContext(orders) {
  if (!orders || orders.length === 0) return "Không tìm thấy đơn hàng nào.";

  return orders
    .map((o, i) => {
      const items =
        o.cart?.map((c) => c.product?.title || "Sản phẩm").join(", ") || "N/A";
      return `[Đơn hàng ${i + 1}] Mã: ${o._id}
- Sản phẩm: ${items}
- Tổng tiền: ${o.totalPrice?.toLocaleString("vi-VN")}đ
- Thanh toán: ${o.payments}
- Trạng thái: ${o.status}
- Ngày đặt: ${new Date(o.createdAt).toLocaleDateString("vi-VN")}`;
    })
    .join("\n\n");
}

exports.sendMessage = catchAsync(async (req, res, next) => {
  const { message, conversationId } = req.body;
  const userId = req.user.id;

  if (!message || message.trim() === "") {
    return next(new AppError("Vui lòng nhập tin nhắn", 400));
  }

  const normMessage = normalizeVietnameseSlang(message);

  let conversation;
  if (conversationId) {
    conversation = await ChatConversation.findOne({
      _id: conversationId,
      user: userId,
    });
    if (!conversation)
      return next(new AppError("Không tìm thấy cuộc hội thoại", 404));
  } else {
    const title =
      message.length > 50 ? message.substring(0, 50) + "..." : message;
    conversation = await ChatConversation.create({ user: userId, title });
  }

  const userMsgDoc = await ChatMessage.create({
    conversation: conversation._id,
    role: "user",
    content: message,
  });

  const intent = detectIntent(normMessage);
  const keywords = extractKeywords(normMessage);

  let context = "";
  let productIds = [];

  // Lấy tin nhắn phản hồi gần nhất của Bot để biết Bot đang tư vấn máy gì
  const lastAssistantMsg = await ChatMessage.findOne({
    conversation: conversation._id,
    role: "assistant",
  }).sort({ createdAt: -1 }).lean();

  const isShortReply = normMessage.length <= 30 && keywords.length === 0;
  const isContinuation = ["có", "ok", "dạ", "vâng", "chốt", "lấy", "đúng", "tuyệt", "oke", "rồi", "máy này", "con này", "thế còn", "còn"].some(w => normMessage.includes(w));

  if (intent === "order") {
    const orders = await retrieveOrders(userId);
    context = `\n\n[DỮ LIỆU CỬA HÀNG]\n${formatOrderContext(orders)}`;
  } else if (intent === "policy") {
    context = "\n\n[DỮ LIỆU CỬA HÀNG]\nChính sách cửa hàng đã có trong phần hệ thống.";
  } else if ((isShortReply || isContinuation) && lastAssistantMsg && lastAssistantMsg.productRefs && lastAssistantMsg.productRefs.length > 0) {
    // RAG MEMORY: Nếu khách chỉ chat ngắn gọn tiếp nối, bốc lại chính xác con máy cũ nhồi vào não AI
    const products = await Product.find({ _id: { $in: lastAssistantMsg.productRefs } })
      .populate("brand category")
      .lean();
    
    // Bảo toàn đúng thứ tự cũ
    const sortedProducts = lastAssistantMsg.productRefs
      .map(id => products.find(p => p._id.toString() === id.toString()))
      .filter(Boolean);

    context = `\n\n[DỮ LIỆU CỬA HÀNG]\n${formatProductContext(sortedProducts)}`;
    productIds = sortedProducts.map((p) => p._id);
  } else {
    const products = await retrieveProducts(normMessage, keywords);
    context = `\n\n[DỮ LIỆU CỬA HÀNG]\n${formatProductContext(products)}`;
    productIds = products.map((p) => p._id);
  }

  // Lấy lịch sử cũ (loại trừ tin nhắn hiện tại vừa gửi)
  const history = await ChatMessage.find({
    conversation: conversation._id,
    _id: { $ne: userMsgDoc._id },
  })
    .sort({ createdAt: -1 })
    .limit(9)
    .lean();

  const messages = [{ role: "system", content: SYSTEM_PROMPT }];

  // Đưa lịch sử cũ vào (theo thứ tự thời gian tăng dần)
  history.reverse().forEach((m) => {
    messages.push({ role: m.role, content: m.content });
  });

  // Đưa tin nhắn hiện tại kèm context vào cuối danh sách tin nhắn gửi đi
  messages.push({ role: "user", content: message + context });

  // Cấu hình headers cho SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const firstEvent = {
    conversationId: conversation._id,
    products: [], // Gửi rỗng lúc đầu để chưa hiển thị gợi ý sản phẩm
  };
  res.write(`data: ${JSON.stringify(firstEvent)}\n\n`);

  try {
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    const chatModel = process.env.OLLAMA_CHAT_MODEL || "laptop-chatbot";
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000); // 40 seconds timeout
    
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: chatModel,
        messages: messages,
        stream: true,
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ollama Response Error: ${response.status} - ${errorText}`);
      throw new Error(`Ollama API failed: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullAiResponse = "";
    let backendBuffer = "";

    // Đọc stream từ Node.js response dùng getReader() chuẩn hóa
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      backendBuffer += decoder.decode(value, { stream: true });
      const lines = backendBuffer.split("\n");
      backendBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.message && parsed.message.content) {
            fullAiResponse += parsed.message.content;
            res.write(
              `data: ${JSON.stringify({ chunk: parsed.message.content })}\n\n`
            );
          }
        } catch (e) {
          // ignore parse error
        }
      }
    }

    if (backendBuffer.trim()) {
      try {
        const parsed = JSON.parse(backendBuffer.trim());
        if (parsed.message && parsed.message.content) {
          fullAiResponse += parsed.message.content;
          res.write(
            `data: ${JSON.stringify({ chunk: parsed.message.content })}\n\n`
          );
        }
      } catch (e) {}
    }

    // Hủy bỏ các link Markdown ảo giác do AI tự bịa ra (Ví dụ: [Dell](https://...))
    let cleanAiResponse = fullAiResponse.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1");
    // Đảm bảo tin nhắn lưu vào DB không được để trống
    let savedResponse = cleanAiResponse.trim() || "Xin lỗi, hiện tại mình đang gặp lỗi xử lý. Bạn có thể hỏi lại được không?";

    // Post-processing: Ép AI chèn thêm câu kêu gọi click vào sản phẩm nếu đang chốt sale
    const botTriggerWords = ["lên đơn", "chốt", "thanh toán", "đặt hàng", "gửi đơn", "lấy mẫu", "gửi bạn link"];
    const userTriggerWords = ["chốt", "lấy con", "mua con", "mua máy", "lấy máy", "lấy em", "đặt con", "đặt hàng", "đặt máy"];
    
    const shouldAppendInstruction = 
      botTriggerWords.some(w => savedResponse.toLowerCase().includes(w)) || 
      userTriggerWords.some(w => message.toLowerCase().includes(w));
    
    if (shouldAppendInstruction) {
      const instruction = "\n\n👉 **Vui lòng nhấn vào sản phẩm đang hiển thị ở bên dưới để xem chi tiết và tiến hành đặt hàng nhé!**";
      res.write(`data: ${JSON.stringify({ chunk: instruction })}\n\n`);
      savedResponse += instruction;
    }

    await ChatMessage.create({
      conversation: conversation._id,
      role: "assistant",
      content: savedResponse,
      productRefs: productIds.slice(0, 4),
    });

    conversation.updatedAt = Date.now();
    await conversation.save({ validateBeforeSave: false });
  } catch (error) {
    console.error("Lỗi gọi Ollama:", error);
    const fallbackMsg =
      "Xin lỗi, hệ thống AI đang gặp sự cố. Vui lòng thử lại sau.";
    res.write(`data: ${JSON.stringify({ chunk: fallbackMsg })}\n\n`);

    await ChatMessage.create({
      conversation: conversation._id,
      role: "assistant",
      content: fallbackMsg,
      productRefs: [],
    });
  }

  // Gửi danh sách sản phẩm gợi ý cuối cùng sau khi đã stream hoàn tất câu trả lời của AI
  let finalProducts = [];
  if (productIds.length > 0) {
    const targetIds = productIds.slice(0, 4);
    const fetchedProds = await Product.find({ _id: { $in: targetIds } })
      .select("_id title price promotion images slug")
      .lean();

    // Bảo toàn thứ tự sắp xếp (Boost / Vector ranking)
    finalProducts = targetIds
      .map((id) => fetchedProds.find((p) => p._id.toString() === id.toString()))
      .filter(Boolean);
  }

  const finalEvent = {
    products: finalProducts,
  };
  res.write(`data: ${JSON.stringify(finalEvent)}\n\n`);

  res.write("data: [DONE]\n\n");
  res.end();
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
