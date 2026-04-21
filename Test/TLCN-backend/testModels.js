const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  try {
    const res = await model.embedContent("Hello world");
    console.log(res.embedding.values.length);
  } catch(e) { console.log(e.message); }
}
run();
