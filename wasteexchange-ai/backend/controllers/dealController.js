const Deal = require('../models/Deal');
const User = require('../models/User');
const { sendOtpEmail, sendDealConfirmationEmail } = require('../utils/emailService');

// Step 1: Buyer clicks "Accept Deal" -> Request OTP
exports.requestDealOtp = async (req, res) => {
    try {
        const { dealId } = req.body;
        const buyerId = req.user.id;

        const deal = await Deal.findById(dealId);
        if (!deal) return res.status(404).json({ message: 'Deal not found' });
        if (deal.buyerId.toString() !== buyerId) return res.status(403).json({ message: 'Unauthorized' });
        if (deal.status === 'accepted') return res.status(400).json({ message: 'Deal already accepted' });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins valid

        deal.otp = otp;
        deal.otpExpires = otpExpires;
        deal.status = 'otp_sent';
        await deal.save();

        // Get Buyer Email
        const buyer = await User.findById(buyerId);
        
        // Send OTP Email
        await sendOtpEmail(buyer.email, otp);

        res.status(200).json({ message: 'OTP sent to your email!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Step 2: Buyer submits OTP -> Verify & Accept
exports.verifyOtpAndAcceptDeal = async (req, res) => {
    try {
        const { dealId, otp } = req.body;
        const buyerId = req.user.id;

        const deal = await Deal.findById(dealId);
        if (!deal) return res.status(404).json({ message: 'Deal not found' });
        if (deal.buyerId.toString() !== buyerId) return res.status(403).json({ message: 'Unauthorized' });

        // Verify OTP and Expiry
        if (deal.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP!' });
        }
        if (new Date() > deal.otpExpires) {
            return res.status(400).json({ message: 'OTP has expired!' });
        }

        // OTP Valid -> Accept Deal
        deal.status = 'accepted';
        deal.otp = undefined; // Clear OTP
        deal.otpExpires = undefined;
        await deal.save();

        // Send Confirmation Email
        const buyer = await User.findById(buyerId);
        await sendDealConfirmationEmail(buyer.email, deal._id);

        res.status(200).json({ message: 'Deal accepted successfully! Confirmation email sent.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};