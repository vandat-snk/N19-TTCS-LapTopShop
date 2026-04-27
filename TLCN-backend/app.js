const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
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

app.use("/api/v1", chatRouter);
const chatRouter = require("./routes/chatRoutes");

const app = express();

/* ================= VIEW ENGINE ================= */
app.engine("ejs", engine);
app.set("view engine", "ejs");

/* ================= CORS ================= */
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

/* ================= STATIC ================= */
app.use("/bootstrap", express.static(__dirname + "/node_modules/bootstrap/dist/"));
app.use("/text", express.static(__dirname + "/node_modules/tinymce/"));
app.use(express.static(`${__dirname}/views`));
app.use(express.static(`${__dirname}/public`));

/* ================= SECURITY ================= */
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again later!",
});
app.use("/api", limiter);

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));

app.use(mongoSanitize());
app.use(xss());

app.use(
  hpp({
    whitelist: ["price", "ratingsAverage", "ratingsQuantity"],
  })
);

/* ================= TEST MIDDLEWARE ================= */
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

/* ================= ROUTES ================= */

// MAIN API
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

// 🔥 CHAT ROUTE FIX 404
app.use("/api/v1/chat", chatRouter);

// VIEW ROUTES
app.use("/", viewRouter);

/* ================= 404 ================= */
app.all("*", (req, res) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server`,
  });
});

/* ================= ERROR HANDLER ================= */
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});

module.exports = app;