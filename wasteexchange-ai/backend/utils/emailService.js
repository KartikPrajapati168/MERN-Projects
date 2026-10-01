const nodemailer = require('nodemailer');

// DEVELOPMENT KE LIYE ETHEREAL (Fake SMTP)
// Production me ise apne SendGrid/Gmail SMTP se replace karein
let transporter;

nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Failed to create a testing account. ' + err.message);
        return process.exit(1);
    }
    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: account.user,
            pass: account.pass
        }
    });
    console.log('Ethereal Email ready. Preview URL will be logged after sending.');
});

// 1. OTP Email Bhejne Ka Function
const sendOtpEmail = async (toEmail, otp) => {
    const mailOptions = {
        from: '"WasteExchange AI" <no-reply@wasteexchange.com>',
        to: toEmail,
        subject: 'Deal Acceptance OTP',
        html: `<h3>Aapka Deal Acceptance OTP hai: <b>${otp}</b></h3>
               <p>Ye OTP 10 minute ke liye valid hai. Kripya kisi ke saath share na karein.</p>`
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP Email sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info)); // Testing ke liye
};

// 2. Invoice Email Bhejne Ka Function (PDF Attach karke)
const sendInvoiceEmail = async (toEmail, pdfBuffer, invoiceId) => {
    const mailOptions = {
        from: '"WasteExchange AI" <billing@wasteexchange.com>',
        to: toEmail,
        subject: `Invoice for your transaction #${invoiceId}`,
        html: `<h3>Dhanyawad!</h3><p>Aapki transaction successful rahi. Invoice attached hai.</p>`,
        attachments: [
            {
                filename: `Invoice_${invoiceId}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('Invoice Email sent: %s', nodemailer.getTestMessageUrl(info));
};

// 3. Deal Confirmation Email
const sendDealConfirmationEmail = async (toEmail, dealId) => {
    const mailOptions = {
        from: '"WasteExchange AI" <deals@wasteexchange.com>',
        to: toEmail,
        subject: 'Deal Successfully Accepted',
        html: `<h3>Congratulations!</h3><p>Aapne deal #${dealId} successfully accept kar li hai.</p>`
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('Deal Confirmation sent: %s', nodemailer.getTestMessageUrl(info));
};

module.exports = { sendOtpEmail, sendInvoiceEmail, sendDealConfirmationEmail };