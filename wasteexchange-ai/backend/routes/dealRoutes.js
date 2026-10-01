const express = require('express');
const router = express.Router();
const { requestDealOtp, verifyOtpAndAcceptDeal } = require('../controllers/dealController');
const auth = require('../middleware/auth'); // Aapka JWT middleware

router.post('/request-otp', auth, requestDealOtp);
router.post('/verify-otp', auth, verifyOtpAndAcceptDeal);

module.exports = router;