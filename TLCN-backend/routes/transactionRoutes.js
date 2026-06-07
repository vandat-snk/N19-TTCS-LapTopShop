const express = require("express");
const transactionController = require("./../controllers/transactionController");
const authController = require("./../controllers/authController");

const router = express.Router();

router.use(authController.protect);

router
  .route("/return_paypal_status")
  .post(transactionController.returnPaypalStatus);

router
  .route("/get-all-payments")
  .get(transactionController.setUser, transactionController.getListPayments);

router
  .route("/refunds")
  .get(authController.restrictTo("admin", "employee"), transactionController.getRefunds);

// [MỚI] Tạo PayPal Order → trả về approveUrl để frontend mở popup
router
  .route("/refunds/:id/create-paypal-order")
  .post(authController.restrictTo("admin", "employee"), transactionController.createRefundPaypalOrder);

// [MỚI] PayPal redirect về đây sau khi admin approve (không cần protect vì là callback từ PayPal)
router
  .route("/refunds/:id/paypal-callback")
  .get(transactionController.paypalRefundCallback);

router
  .route("/refunds/:id")
  .patch(authController.restrictTo("admin", "employee"), transactionController.updateRefundStatus);

module.exports = router;