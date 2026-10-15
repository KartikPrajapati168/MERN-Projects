// backend/utils/pdfGenerator.js
const PDFDocument = require('pdfkit');

/**
 * Generate a beautifully designed PDF invoice
 * @param {Object} invoice - Invoice document
 * @param {Object} user - User (buyer) document
 * @returns {PDFDocument} pdfkit document stream
 */
const generateInvoicePDF = (invoice, user = {}) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  // ─── Colors ───
  const PURPLE = '#6366f1';
  const PURPLE_LIGHT = '#a78bfa';
  const DARK = '#0f0f17';
  const GRAY = '#6b7280';
  const LIGHT_BG = '#f5f3ff';
  const GREEN = '#22c55e';
  const BORDER = '#e5e7eb';

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // ─────────────────────────────────────────────
  // HEADER — Purple gradient bar
  // ─────────────────────────────────────────────
  doc.rect(0, 0, pageWidth, 140).fill(PURPLE);

  // Decorative circle
  doc.circle(pageWidth - 60, 40, 80).fill('#8b5cf6').opacity(0.4);
  doc.circle(pageWidth - 130, 120, 55).fill('#a78bfa').opacity(0.3);
  doc.opacity(1);

  // Logo circle
  doc.circle(margin + 22, 55, 22).fill('#ffffff');
  doc.fillColor(PURPLE).fontSize(20).font('Helvetica-Bold')
    .text('♻', margin + 10, 44, { width: 24, align: 'center' });

  // Company name
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
    .text('WasteExchange AI', margin + 55, 42);
  doc.fontSize(10).font('Helvetica')
    .text('Smart Waste Marketplace', margin + 55, 68);

  // INVOICE title (right side)
  doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold')
    .text('INVOICE', margin, 45, { width: contentWidth, align: 'right' });
  doc.fontSize(9).font('Helvetica')
    .text('wasteexchange.ai', margin, 78, { width: contentWidth, align: 'right' });

  // ─────────────────────────────────────────────
  // INVOICE META — left: invoice id / date / status
  // ─────────────────────────────────────────────
  const metaY = 165;

  // Left block
  doc.fillColor(GRAY).fontSize(9).font('Helvetica-Bold')
    .text('INVOICE DETAILS', margin, metaY);

  doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold')
    .text('Invoice ID:', margin, metaY + 18);
  doc.fillColor('#111827').font('Helvetica')
    .text(invoice._id.toString(), margin + 70, metaY + 18, { width: 200 });

  doc.fillColor(DARK).font('Helvetica-Bold')
    .text('Date:', margin, metaY + 34);
  doc.fillColor('#111827').font('Helvetica')
    .text(new Date(invoice.createdAt).toLocaleString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }), margin + 70, metaY + 34);

  doc.fillColor(DARK).font('Helvetica-Bold')
    .text('Type:', margin, metaY + 50);
  doc.fillColor('#111827').font('Helvetica')
    .text((invoice.type || '—').replace(/_/g, ' ').toUpperCase(), margin + 70, metaY + 50);

  // Right block — Status badge
  const statusX = pageWidth - margin - 130;
  doc.roundedRect(statusX, metaY + 10, 130, 34, 17).fill(GREEN);
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
    .text('✓ ' + (invoice.status || 'SUCCESS').toUpperCase(), statusX, metaY + 22, { width: 130, align: 'center' });

  // ─────────────────────────────────────────────
  // BILL TO / FROM SECTION
  // ─────────────────────────────────────────────
  const sectionY = metaY + 90;

  // ─── Bill To (Buyer) ───
  doc.fillColor(GRAY).fontSize(9).font('Helvetica-Bold')
    .text('BILL TO', margin, sectionY);

  doc.roundedRect(margin, sectionY + 16, contentWidth / 2 - 12, 90, 8)
    .fillAndStroke(LIGHT_BG, BORDER);

  doc.fillColor(PURPLE).fontSize(12).font('Helvetica-Bold')
    .text(invoice.buyerName || user.name || 'Buyer', margin + 15, sectionY + 30, { width: contentWidth / 2 - 40 });

  doc.fillColor('#374151').fontSize(9).font('Helvetica')
    .text(invoice.buyerEmail || user.email || '', margin + 15, sectionY + 50, { width: contentWidth / 2 - 40 })
    .text(user.companyName || '', margin + 15, sectionY + 64, { width: contentWidth / 2 - 40 })
    .text(user.companyCity ? `${user.companyCity}, ${user.companyState || ''}` : '', margin + 15, sectionY + 78, { width: contentWidth / 2 - 40 });

  // ─── From (Generator) ───
  doc.fillColor(GRAY).fontSize(9).font('Helvetica-Bold')
    .text('FROM', margin + contentWidth / 2 + 12, sectionY);

  doc.roundedRect(margin + contentWidth / 2 + 12, sectionY + 16, contentWidth / 2 - 12, 90, 8)
    .fillAndStroke('#f0fdf4', '#bbf7d0');

  doc.fillColor('#16a34a').fontSize(12).font('Helvetica-Bold')
    .text(invoice.generatorName || 'Generator', margin + contentWidth / 2 + 27, sectionY + 30, { width: contentWidth / 2 - 40 });

  doc.fillColor('#374151').fontSize(9).font('Helvetica')
    .text(invoice.generatorEmail || '', margin + contentWidth / 2 + 27, sectionY + 50, { width: contentWidth / 2 - 40 })
    .text('WasteExchange Verified Generator', margin + contentWidth / 2 + 27, sectionY + 64, { width: contentWidth / 2 - 40 });

  // ─────────────────────────────────────────────
  // DEAL DETAILS TABLE
  // ─────────────────────────────────────────────
  const tableY = sectionY + 130;

  // Section title
  doc.fillColor(GRAY).fontSize(9).font('Helvetica-Bold')
    .text('DEAL DETAILS', margin, tableY);

  // Table header
  const headerY = tableY + 16;
  const rowHeight = 26;

  doc.rect(margin, headerY, contentWidth, rowHeight).fill(PURPLE);

  const col1 = margin + 15;             // Description
  const col2 = margin + contentWidth * 0.5;  // Qty
  const col3 = margin + contentWidth * 0.65; // Price
  const col4 = margin + contentWidth * 0.82; // Total

  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
    .text('DESCRIPTION', col1, headerY + 9, { width: contentWidth * 0.45 })
    .text('QTY', col2, headerY + 9, { width: 80, align: 'right' })
    .text('PRICE/UNIT', col3, headerY + 9, { width: 90, align: 'right' })
    .text('TOTAL', col4, headerY + 9, { width: 90, align: 'right' });

  // Table row
  const row1Y = headerY + rowHeight;
  doc.rect(margin, row1Y, contentWidth, rowHeight + 6).fillAndStroke('#fafafa', BORDER);

  const materialText = invoice.material || 'Material'
    + (invoice.materialSubtype ? ` (${invoice.materialSubtype})` : '');
  const qtyText = invoice.quantity ? `${invoice.quantity} kg` : '—';
  const priceText = invoice.pricePerUnit ? `₹${invoice.pricePerUnit}` : '—';
  const totalText = invoice.subtotal ? `₹${invoice.subtotal.toLocaleString('en-IN')}` : '—';

  doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold')
    .text(materialText, col1, row1Y + 11, { width: contentWidth * 0.45 })
    .font('Helvetica')
    .text(qtyText, col2, row1Y + 11, { width: 80, align: 'right' })
    .text(priceText, col3, row1Y + 11, { width: 90, align: 'right' })
    .font('Helvetica-Bold')
    .text(totalText, col4, row1Y + 11, { width: 90, align: 'right' });

  // ─────────────────────────────────────────────
  // TOTALS BOX (right aligned)
  // ─────────────────────────────────────────────
  const totalsY = row1Y + 55;

  // Left side: Location / notes
  if (invoice.location) {
    doc.fillColor(GRAY).fontSize(8).font('Helvetica-Bold')
      .text('LOCATION', margin, totalsY);
    doc.fillColor('#374151').fontSize(9).font('Helvetica')
      .text(invoice.location, margin, totalsY + 14, { width: contentWidth * 0.5 });
  }

  const boxW = 220;
  const boxX = pageWidth - margin - boxW;
  let lineY = totalsY;

  const drawLine = (label, value, bold = false, color = '#111827') => {
    doc.fillColor(GRAY).fontSize(9).font('Helvetica')
      .text(label, boxX + 15, lineY);
    doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .text(value, boxX + 15, lineY, { width: boxW - 30, align: 'right' });
    lineY += 20;
  };

  drawLine('Subtotal', `₹${(invoice.subtotal || 0).toLocaleString('en-IN')}`);
  drawLine('Platform Fee (2%)', `₹${(invoice.platformFee || 0).toLocaleString('en-IN')}`);

  // Divider
  doc.moveTo(boxX + 15, lineY).lineTo(boxX + boxW - 15, lineY).strokeColor(BORDER).stroke();
  lineY += 10;

  // Total box
  doc.rect(boxX, lineY, boxW, 40).fill(PURPLE);
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
    .text('TOTAL PAID', boxX + 15, lineY + 14);
  doc.fontSize(14).font('Helvetica-Bold')
    .text(`₹${Math.abs(invoice.amount).toLocaleString('en-IN')}`, boxX + 15, lineY + 12, { width: boxW - 30, align: 'right' });

  // ─────────────────────────────────────────────
  // PAYMENT METHOD BOX
  // ─────────────────────────────────────────────
  const paymentY = lineY + 70;

  doc.roundedRect(margin, paymentY, contentWidth, 50, 8)
    .fillAndStroke('#eff6ff', '#bfdbfe');

  doc.fillColor('#1d4ed8').fontSize(9).font('Helvetica-Bold')
    .text('PAYMENT METHOD', margin + 15, paymentY + 12);

  doc.fillColor('#374151').fontSize(10).font('Helvetica')
    .text((invoice.method || 'wallet').toUpperCase() + (invoice.razorpayPaymentId ? ` • ${invoice.razorpayPaymentId}` : ''), margin + 15, paymentY + 28);

  // ─────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────
  const footerY = pageHeight - 80;

  // Divider line
  doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).strokeColor(BORDER).stroke();

  doc.fillColor(GRAY).fontSize(8).font('Helvetica')
    .text('Thank you for using WasteExchange AI! ♻️', margin, footerY + 12, { width: contentWidth, align: 'center' });

  doc.fontSize(7)
    .text('This is a computer-generated invoice. No signature required.', margin, footerY + 26, { width: contentWidth, align: 'center' })
    .text('For queries: support@wasteexchange.ai | +91 98765 43210', margin, footerY + 38, { width: contentWidth, align: 'center' });

  doc.end();
  return doc;
};

module.exports = { generateInvoicePDF };