const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Brand = require("../models/brandModel");
const User = require("../models/userModel");

// Load env vars
dotenv.config({ path: "./config.env" });

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateProductText = (product) => {
  // Combine all static specs into a rich descriptive text for embedding
  const brandName = product.brand?.name || "Unknown Brand";
  const catName = product.category?.name || "Unknown Category";
  
  return `
    Tên sản phẩm: ${product.title || ""}
    Thương hiệu: ${brandName}
    Danh mục: ${catName}
    CPU: ${product.cpu || ""}
    RAM: ${product.ram || ""}
    Màn hình: ${product.screen || ""}
    Card đồ họa (GPU): ${product.graphicCard || ""}
    Pin: ${product.battery || ""}
    Nhu cầu sử dụng: ${product.demand || ""}
    Hệ điều hành: ${product.os || ""}
    Trọng lượng: ${product.weight ? product.weight + " kg" : ""}
  `.trim().replace(/\n\s+/g, '\n');
};

const embedProducts = async () => {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("DB connection successful!");

    console.log("Fetching products...");
    // Find products without an embedding (or all if we want to overwrite)
    const products = await Product.find({ embedding: { $exists: false } }).select("+embedding");
    
    console.log(`Found ${products.length} products to embed.`);

    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`Embedding product ${i + 1}/${products.length}: ${product.title}`);
      
      const textToEmbed = generateProductText(product);
      
      // Use Gemini to get embedding
      const result = await model.embedContent(textToEmbed);
      const embedding = result.embedding.values;
      
      product.embedding = embedding;
      await product.save({ validateBeforeSave: false }); // Skip validation
      
      // Rate limiting prevention for Gemini API
      await new Promise(resolve => setTimeout(resolve, 500)); 
    }

    console.log("All products embedded successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error generating embeddings:", err);
    process.exit(1);
  }
};

embedProducts();
