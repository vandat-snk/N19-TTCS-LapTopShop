const express = require("express");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");
// const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const engine = require("ejs-mate");

const AppError = require("./utils/appError");

// ROUTES
const productRouter = require("./routes/productRoutes");
const userRouter = require("./routes/userRoutes");
const categoryRouter = require("./routes/categoryRoutes");
const brandRouter = require("./routes/brandRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const orderRouter = require("./routes/orderRoutes");
const importRouter = require("./routes/importRoutes");
const commentRouter = require("./routes/commentRoutes");
const viewRouter = require("./routes/viewRoutes");
const transactionRouter = require("./routes/transactionRoutes");
const locationRouter = require("./routes/locationRoutes");
const chatRouter = require("./routes/chatRoutes");
const productApi = require("./routes/apiProduct");

const app = express();

// ================= VIEW ENGINE =================
app.engine("ejs", engine);
app.set("view engine", "ejs");

// ================= CORS =================
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

// ================= STATIC FILES =================
app.use(
  "/bootstrap",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist"))
);

app.use(
  "/text",
  express.static(path.join(__dirname, "node_modules/tinymce"))
);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "views")));

// ================= GLOBAL MIDDLEWARE =================

// app.use(helmet());

app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate limit
const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});

app.use("/api", limiter);

// Body parser
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));

// Security
app.use(mongoSanitize());
app.use(xss());

app.use(
  hpp({
    whitelist: ["ratingsQuantity", "ratingsAverage", "price"],
  })
);

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ================= ROUTES =================

app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/brands", brandRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/imports", importRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/payments", transactionRouter);
app.use("/api/v1/locations", locationRouter);
app.use("/api/v1/chat", chatRouter);

app.use("/api", productApi);

app.use("/", viewRouter);

// ================= 404 HANDLER =================

app.all("*", (req, res, next) => {
  return res.status(404).render("404");
});

// ================= GLOBAL ERROR HANDLER =================

app.use((err, req, res, next) => {

  console.error("========== ERROR DETAIL ==========");
  console.error(err);
  console.error("message:", err?.message);
  console.error("stack:", err?.stack);
  console.error("==================================");

  const statusCode =
    Number.isInteger(err?.statusCode) && err.statusCode >= 100 && err.statusCode <= 599
      ? err.statusCode
      : 500;

  res.status(statusCode).json({
    status: err?.status || "error",
    message: err?.message || String(err) || "Đã có lỗi xảy ra",
    stack: err?.stack,
    fullError: err,
  });
});

module.exports = app;