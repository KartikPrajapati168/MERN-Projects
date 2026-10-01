const express = require('express');
const router = express.Router();
const { addMoney, setPaymentPin } = require('../controllers/paymentController');
const auth = require('../middleware/auth'); // Aapka JWT middleware

router.post('/set-pin', auth, setPaymentPin);
router.post('/add-money', auth, addMoney);

module.exports = router;