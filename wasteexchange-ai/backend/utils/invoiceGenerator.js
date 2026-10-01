const PDFDocument = require('pdfkit');

const generateInvoicePDF = (transactionData) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            let buffers = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                let pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Invoice Design
            doc.fontSize(20).text('WasteExchange AI', { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).text(`Invoice ID: ${transactionData.id}`);
            doc.text(`Date: ${new Date().toLocaleDateString()}`);
            doc.text(`Amount: ₹${transactionData.amount}`);
            doc.text(`Type: ${transactionData.type}`);
            doc.text(`Status: SUCCESS`);
            doc.moveDown();
            doc.text('Thank you for using our platform!', { align: 'center' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateInvoicePDF };