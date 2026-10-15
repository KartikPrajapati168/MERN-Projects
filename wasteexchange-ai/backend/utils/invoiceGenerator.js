// backend/utils/invoiceGenerator.js
const PDFDocument = require('pdfkit');

/* =========================================================
   🎨 Brand Colors (matches landing page)
========================================================= */
const PURPLE_1 = '#6366f1';
const PURPLE_2 = '#8b5cf6';
const PURPLE_LIGHT = '#a78bfa';
const TEXT_DARK = '#0f172a';
const TEXT_MED = '#334155';
const TEXT_GRAY = '#64748b';
const TEXT_LIGHT = '#94a3b8';
const BORDER = '#e2e8f0';
const BG_LIGHT = '#f8fafc';
const BG_PURPLE_SOFT = '#f5f3ff';

/* =========================================================
   ♻️ Recycle Logo — vector drawn (no emoji!)
   Purple gradient rounded square + 3 white recycle arrows
========================================================= */
function drawLogo(doc, x, y, size) {
  // Purple gradient rounded square
  const grad = doc.linearGradient(x, y, x + size, y + size);
  grad.stop(0, PURPLE_1);
  grad.stop(1, PURPLE_2);

  doc.save();
  doc.roundedRect(x, y, size, size, size * 0.24).fill(grad);
  doc.restore();

  // White recycle arrows — 3 arrows rotated 120° apart
  doc.save();
  doc.translate(x + size / 2, y + size / 2);
  doc.scale(size / 100);

  for (let i = 0; i < 3; i++) {
    doc.save();
    doc.rotate(i * 120);
    // Arrow shape: shaft + wide head
    doc.moveTo(0, -18)
      .lineTo(-14, 4)
      .lineTo(-6, 4)
      .lineTo(-6, 16)
      .lineTo(6, 16)
      .lineTo(6, 4)
      .lineTo(14, 4)
      .closePath()
      .fill('#ffffff');
    doc.restore();
  }

  doc.restore();
}

/* =========================================================
   📏 Helper — draw horizontal line
========================================================= */
function drawLine(doc, x1, y1, x2, y2, color = BORDER, width = 1) {
  doc.save()
    .moveTo(x1, y1)
    .lineTo(x2, y2)
    .strokeColor(color)
    .lineWidth(width)
    .stroke()
    .restore();
}

/* =========================================================
   🧾 MAIN — Generate single-page invoice PDF
========================================================= */
const generateInvoicePDF = (invoice, res) => {
  // A4 = 595.28 x 841.89 pt, zero margin (we handle layout manually)
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    autoFirstPage: true,
    bufferPages: false,
    info: {
      Title: `Invoice ${invoice.invoiceId}`,
      Author: 'WasteExchange AI',
      Subject: 'Deal Payment Invoice',
    },
  });

  doc.pipe(res);

  const PW = 595.28;                 // page width
  const PH = 841.89;                 // page height
  const M = 40;                      // side margin
  const CW = PW - M * 2;             // content width (515.28)

  /* ============ TOP ACCENT BAR ============ */
  doc.rect(0, 0, PW, 5).fill(PURPLE_1);

  /* ============ HEADER ============ */
  drawLogo(doc, M, 28, 46);

  // Brand name
  doc.font('Helvetica-Bold').fontSize(18).fillColor(TEXT_DARK);
  doc.text('WasteExchange AI', M + 58, 34, { lineBreak: false });

  // Tagline
  doc.font('Helvetica').fontSize(8.5).fillColor(TEXT_GRAY);
  doc.text('Smart Waste Marketplace  ·  wasteexchange.ai', M + 58, 58, { lineBreak: false });

  // INVOICE label (right-aligned)
  doc.font('Helvetica-Bold').fontSize(26).fillColor(PURPLE_2);
  doc.text('INVOICE', 0, 30, { width: PW - M, align: 'right', lineBreak: false });

  // Invoice ID under title
  doc.font('Helvetica').fontSize(8.5).fillColor(TEXT_GRAY);
  doc.text(`#${invoice.invoiceId}`, 0, 62, { width: PW - M, align: 'right', lineBreak: false });

  // Divider
  drawLine(doc, M, 96, PW - M, 96, BORDER, 1);

  /* ============ INVOICE DETAILS (3-column) ============ */
  let y = 112;

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(PURPLE_2);
  doc.text('INVOICE DETAILS', M, y, { lineBreak: false });

  y += 14;
  const detCol = CW / 3;

  doc.font('Helvetica').fontSize(8).fillColor(TEXT_GRAY);
  doc.text('INVOICE ID', M, y, { width: detCol, lineBreak: false });
  doc.text('DATE', M + detCol, y, { width: detCol, lineBreak: false });
  doc.text('TYPE', M + detCol * 2, y, { width: detCol, lineBreak: false });

  y += 12;
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(TEXT_DARK);
  doc.text(invoice.invoiceId, M, y, { width: detCol - 10, lineBreak: false });
  doc.text(invoice.date, M + detCol, y, { width: detCol - 10, lineBreak: false });
  doc.text(invoice.type || 'DEAL PAYMENT', M + detCol * 2, y, { width: detCol, lineBreak: false });

  /* ============ BILL TO / FROM (2-column boxes) ============ */
  y += 34;
  const boxW = (CW - 12) / 2;
  const boxH = 96;

  // --- BILL TO box ---
  doc.save();
  doc.roundedRect(M, y, boxW, boxH, 6).fill(BG_LIGHT);
  doc.restore();

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(PURPLE_2);
  doc.text('BILL TO', M + 12, y + 10, { lineBreak: false });

  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(TEXT_DARK);
  doc.text(invoice.buyer.name || '—', M + 12, y + 26, { width: boxW - 24, lineBreak: false });

  doc.font('Helvetica').fontSize(8.5).fillColor(TEXT_GRAY);
  let by = y + 42;
  if (invoice.buyer.email) {
    doc.text(invoice.buyer.email, M + 12, by, { width: boxW - 24, lineBreak: false });
    by += 12;
  }
  if (invoice.buyer.company) {
    doc.text(invoice.buyer.company, M + 12, by, { width: boxW - 24, lineBreak: false });
    by += 12;
  }
  if (invoice.buyer.location) {
    doc.text(invoice.buyer.location, M + 12, by, { width: boxW - 24, lineBreak: false });
  }

  // --- FROM box ---
  const fromX = M + boxW + 12;
  doc.save();
  doc.roundedRect(fromX, y, boxW, boxH, 6).fill(BG_LIGHT);
  doc.restore();

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(PURPLE_2);
  doc.text('FROM', fromX + 12, y + 10, { lineBreak: false });

  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(TEXT_DARK);
  doc.text(invoice.seller.name || '—', fromX + 12, y + 26, { width: boxW - 24, lineBreak: false });

  doc.font('Helvetica').fontSize(8.5).fillColor(TEXT_GRAY);
  let sy = y + 42;
  if (invoice.seller.email) {
    doc.text(invoice.seller.email, fromX + 12, sy, { width: boxW - 24, lineBreak: false });
    sy += 12;
  }
  // Verified badge
  const badgeText = invoice.seller.tag || 'WasteExchange Verified Generator';
  const badgeW = doc.widthOfString(badgeText) + 16;
  doc.save();
  doc.roundedRect(fromX + 12, sy + 2, badgeW, 15, 7.5).fill(BG_PURPLE_SOFT);
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(PURPLE_2);
  doc.text(badgeText, fromX + 20, sy + 6, { lineBreak: false });

  /* ============ DEAL DETAILS ============ */
  y += boxH + 24;

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(PURPLE_2);
  doc.text('DEAL DETAILS', M, y, { lineBreak: false });

  y += 16;

  // Table header
  const rowH = 26;
  doc.save();
  doc.rect(M, y, CW, rowH).fill(BG_LIGHT);
  doc.restore();

  doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_GRAY);
  doc.text('DESCRIPTION', M + 12, y + 9, { width: 260, lineBreak: false });
  doc.text('QTY', M + 280, y + 9, { width: 60, align: 'center', lineBreak: false });
  doc.text('PRICE / UNIT', M + 350, y + 9, { width: 80, align: 'right', lineBreak: false });
  doc.text('TOTAL', M + CW - 92, y + 9, { width: 80, align: 'right', lineBreak: false });

  y += rowH;

  // Line item row
  doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_DARK);
  doc.text(invoice.deal.description || '—', M + 12, y + 12, { width: 260, lineBreak: false });

  doc.font('Helvetica').fontSize(10).fillColor(TEXT_MED);
  doc.text(`${invoice.deal.qty} kg`, M + 280, y + 14, { width: 60, align: 'center', lineBreak: false });
  doc.text(`₹${Number(invoice.deal.pricePerUnit).toLocaleString('en-IN')}`, M + 350, y + 14, { width: 80, align: 'right', lineBreak: false });
  doc.font('Helvetica-Bold').fillColor(TEXT_DARK);
  doc.text(`₹${Number(invoice.deal.subtotal).toLocaleString('en-IN')}`, M + CW - 92, y + 14, { width: 80, align: 'right', lineBreak: false });

  y += 42;
  drawLine(doc, M, y, PW - M, y, BORDER, 1);

  /* ============ PAYMENT METHOD + TOTALS ============ */
  y += 18;

  // Payment method (left)
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(PURPLE_2);
  doc.text('PAYMENT METHOD', M, y, { lineBreak: false });

  y += 14;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_DARK);
  doc.text(invoice.paymentMethod || 'WALLET', M, y, { lineBreak: false });

  // Totals box (right)
  const totalsX = M + CW - 240;
  const totalsW = 240;
  let ty = y - 30;

  // Subtotal
  doc.font('Helvetica').fontSize(9.5).fillColor(TEXT_GRAY);
  doc.text('Subtotal', totalsX, ty, { width: 130, lineBreak: false });
  doc.font('Helvetica-Bold').fillColor(TEXT_DARK);
  doc.text(`₹${Number(invoice.deal.subtotal).toLocaleString('en-IN')}`, totalsX + 130, ty, { width: 110, align: 'right', lineBreak: false });

  ty += 18;

  // Platform fee
  doc.font('Helvetica').fontSize(9.5).fillColor(TEXT_GRAY);
  doc.text('Platform Fee (2%)', totalsX, ty, { width: 130, lineBreak: false });
  doc.font('Helvetica-Bold').fillColor(TEXT_DARK);
  doc.text(`₹${Number(invoice.platformFee).toLocaleString('en-IN')}`, totalsX + 130, ty, { width: 110, align: 'right', lineBreak: false });

  ty += 22;

  // TOTAL PAID — highlighted
  doc.save();
  doc.roundedRect(totalsX - 12, ty - 6, totalsW + 12, 36, 8).fill(PURPLE_1);
  doc.restore();

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff');
  doc.text('TOTAL PAID', totalsX, ty + 8, { width: 120, lineBreak: false });
  doc.fontSize(14).text(`₹${Number(invoice.totalPaid).toLocaleString('en-IN')}`, totalsX + 130, ty + 6, { width: 110, align: 'right', lineBreak: false });

  /* ============ FOOTER (single-page pinned) ============ */
  const footerY = PH - 62;
  drawLine(doc, M, footerY, PW - M, footerY, BORDER, 1);

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(PURPLE_2);
  doc.text('Thank you for using WasteExchange AI', 0, footerY + 12, { width: PW, align: 'center', lineBreak: false });

  doc.font('Helvetica').fontSize(7).fillColor(TEXT_LIGHT);
  doc.text(
    'This is a computer-generated invoice — no signature required.  ·  For queries: support@wasteexchange.ai  ·  wasteexchange.ai',
    0,
    footerY + 26,
    { width: PW, align: 'center', lineBreak: false }
  );

  doc.end();
};

module.exports = { generateInvoicePDF };