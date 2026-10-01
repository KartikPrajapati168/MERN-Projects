const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateInvoicePDF } = require('../utils/invoiceGenerator');
const { sendInvoiceEmail } = require('../utils/emailService');

exports.addMoney = async (req, res) => {
    try {
        const { amount, pin } = req.body;
        const userId = req.user.id; // Auth middleware se aayega

        // 1. Validate Amount
        if (amount < 100) return res.status(400).json({ message: 'Minimum amount is ₹100' });

        // 2. Verify PIN
        const user = await User.findById(userId);
        if (!user.paymentPin) {
            return res.status(400).json({ message: 'Pehle apna Payment PIN set karein.' });
        }
        
        const isPinValid = await bcrypt.compare(pin, user.paymentPin);
        if (!isPinValid) {
            return res.status(400).json({ message: 'Invalid Payment PIN!' });
        }

        // 3. Process Payment (Yahan aap Razorpay/Stripe integrate karenge)
        // Filhal hum maan rahe hain payment success ho gaya
        const transactionId = 'TXN' + Date.now();
        
        // 4. Generate Invoice PDF
        const pdfBuffer = await generateInvoicePDF({
            id: transactionId,
            amount: amount,
            type: 'Add Money'
        });

        // 5. Send Invoice via Email
        await sendInvoiceEmail(user.email, pdfBuffer, transactionId);

        // 6. Update Balance in DB (Optional, agar wallet system hai)
        // user.balance += amount; await user.save();

        res.status(200).json({ 
            message: 'Payment successful, Invoice emailed!', 
            transactionId,
            newBalance: 11053 + amount // Dummy calculation for UI
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Payment PIN Set Karne Ka Function
exports.setPaymentPin = async (req, res) => {
    try {
        const { pin } = req.body;
        const userId = req.user.id;
        
        if (pin.length !== 4) return res.status(400).json({ message: 'PIN must be 4 digits' });

        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(pin, salt);

        await User.findByIdAndUpdate(userId, { paymentPin: hashedPin });
        res.status(200).json({ message: 'Payment PIN set successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};