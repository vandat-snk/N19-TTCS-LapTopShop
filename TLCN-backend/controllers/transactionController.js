const Transaction = require("./../models/transactionModel");
const factory = require("./handlerFactory");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const moment = require("moment");


exports.returnPaypalStatus = catchAsync(async (req, res, next) => {
  const newRecord = {
    user: req.user,
    amount: req.body.amount,
    payments: "paypal",
    invoicePayment: req.body.invoicePayment,
  };
  await Transaction.create(newRecord);
  res.status(201).json({ message: "success" });
});

exports.getListPayments = factory.getAll(Transaction);
exports.setUser = catchAsync(async (req, res, next) => {
  if (req.user.role !== "admin") req.query.user = req.user.id;
  next();
});
