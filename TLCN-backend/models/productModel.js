const mongoose = require("mongoose");
const domPurifier = require("dompurify");
const { JSDOM } = require("jsdom");
const htmlPurify = domPurifier(new JSDOM().window);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Sản phẩm phải có tên phân biệt"],
      unique: true,
      trim: true,
      maxlength: [200, "Tên sản phẩm tối đa 200 kí tự"],
      minlength: [10, "Tên sản phẩm tối thiểu 10 kí tự"],
    },
    price: {
      type: Number,
      required: [true, "Vui lòng cung cấp giá sản phẩm"],
    },
    promotion: {
      type: Number,
      validate: {
        validator: function (val) {
          if (val == null || val === "") return true;

          let price = this.price;

          if (!price && typeof this.getUpdate === "function") {
            const update = this.getUpdate();
            price = update.price || update.$set?.price;
          }

          if (!price) return true;

          return Number(val) <= Number(price);
        },
        message: "Giá sau giảm phải nhỏ hơn hoặc bằng giá gốc",
      },
    },
    description: String,

    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Đánh giá từ 1 sao trở lên"],
      max: [5, "Đánh giá tối đa 5 sao"],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    eachRating: {
      "1_star": { type: Number, default: 0 },
      "2_star": { type: Number, default: 0 },
      "3_star": { type: Number, default: 0 },
      "4_star": { type: Number, default: 0 },
      "5_star": { type: Number, default: 0 }
    },
    
    images: [String],
    inventory: {
      type: Number,
      default: 0,
    },
    specs: {
      color: String,
      cpu: String,
      ram: String,
      os: String,
      weight: String,
      screen: String,
      graphicCard: String,
      storage: String,
      battery: String,
      demand: String
    },

    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    
    embedding: [Number],

  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.index({ price: 1, ratingsAverage: -1 });
productSchema.index({ "$**": "text" });

productSchema.virtual("percent").get(function () {
  return !this.promotion
    ? 0
    : Number((((this.price - this.promotion) * 100) / this.price).toFixed());
});

// Virtual populate
productSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "product",
  localField: "_id",
});

productSchema.pre("save", function (next) {
  if (this.description) {
    this.description = htmlPurify.sanitize(this.description);
  }
  next();
});

productSchema.pre(/^find/, function (next) {
  this.populate({
    path: "category",
    select: "name",
  })
    .populate({
      path: "brand",
      select: "name",
    })
    .populate({
      path: "createdBy",
      select: "name",
    });
  next();
});

// === AUTO-EMBED HELPER: Tách biệt logic tạo Vector Embedding tái sử dụng ===
const generateProductEmbedding = async function (doc) {
  try {
    if (!doc) return;
    
    // Nạp thêm thông tin brand & category để tối ưu hóa tìm kiếm ngữ nghĩa
    await doc.populate("brand category");
    const s = doc.specs || {};
    const text = `
      Tên: ${doc.title || ""}
      Thương hiệu: ${doc.brand?.name || ""}
      Danh mục: ${doc.category?.name || ""}
      CPU: ${s.cpu || ""} RAM: ${s.ram || ""} 
      Màn hình: ${s.screen || ""} GPU: ${s.graphicCard || ""}
      Ổ cứng: ${s.storage || ""} Pin: ${s.battery || ""}
      Nhu cầu: ${s.demand || ""} OS: ${s.os || ""}
    `.trim();

    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    const embedModel = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
    const response = await fetch(`${ollamaUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: embedModel,
        prompt: text,
      }),
    });

    if (!response.ok) throw new Error("Ollama embedding failed");
    const result = await response.json();

    // Dùng updateOne trực tiếp để tránh kích hoạt lại save/update hook vô hạn
    await mongoose.model("Product").updateOne(
      { _id: doc._id },
      { $set: { embedding: result.embedding } }
    );
    console.log(`[Auto-Embed] ✅ ${doc.title}`);
  } catch (err) {
    console.error(`[Auto-Embed] ❌ ${doc?.title || "Sản phẩm"}:`, err.message);
  }
};

// Hook chạy khi Thêm mới sản phẩm (create / save)
productSchema.post("save", async function (doc) {
  await generateProductEmbedding(doc);
});

// Hook chạy khi Cập nhật sản phẩm (findByIdAndUpdate / findOneAndUpdate)
productSchema.post("findOneAndUpdate", async function (doc) {
  await generateProductEmbedding(doc);
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
