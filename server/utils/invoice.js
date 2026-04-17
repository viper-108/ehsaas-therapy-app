/**
 * Generate HTML invoice for a payment
 */
export const generateInvoiceHTML = (payment, client, therapist, session) => {
  const invoiceNum = payment.invoiceNumber || `INV-${payment._id.toString().slice(-8).toUpperCase()}`;
  const date = new Date(payment.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const sessionDate = session ? new Date(session.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoiceNum}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: #E78824; }
    .logo-sub { font-size: 12px; color: #666; }
    .invoice-title { font-size: 28px; color: #2d3748; text-align: right; }
    .invoice-num { font-size: 14px; color: #666; text-align: right; }
    .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .details-section { width: 45%; }
    .details-section h3 { font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 8px; }
    .details-section p { margin: 4px 0; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    th { background: #f7f7f7; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 2px solid #ddd; }
    td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
    .total-row td { font-weight: bold; font-size: 16px; border-top: 2px solid #333; }
    .discount-row td { color: #16a34a; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
    .paid-stamp { color: #16a34a; font-size: 18px; font-weight: bold; border: 3px solid #16a34a; padding: 5px 15px; display: inline-block; transform: rotate(-5deg); }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Ehsaas Therapy Centre</div>
      <div class="logo-sub">Healing minds, one session at a time</div>
      <div class="logo-sub" style="margin-top:8px">Email: sessions.ehsaas@gmail.com</div>
      <div class="logo-sub">WhatsApp: +91-7411948161</div>
    </div>
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-num">${invoiceNum}</div>
      <div class="invoice-num">Date: ${date}</div>
      ${payment.status === 'completed' ? '<div class="paid-stamp" style="margin-top:10px">PAID</div>' : ''}
    </div>
  </div>

  <div class="details">
    <div class="details-section">
      <h3>Billed To</h3>
      <p><strong>${client?.name || 'Client'}</strong></p>
      <p>${client?.email || ''}</p>
      <p>${client?.phone || ''}</p>
    </div>
    <div class="details-section">
      <h3>Therapist</h3>
      <p><strong>${therapist?.name || 'Therapist'}</strong></p>
      <p>${therapist?.title || ''}</p>
      <p>${therapist?.email || ''}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Session Date</th>
        <th>Duration</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Therapy Session — ${session?.sessionType || 'Individual'}</td>
        <td>${sessionDate}${session ? ` at ${session.startTime}` : ''}</td>
        <td>${session?.duration || 'N/A'} minutes</td>
        <td style="text-align:right">₹${payment.amount + (payment.discountAmount || 0)}</td>
      </tr>
      ${payment.discountAmount > 0 ? `
      <tr class="discount-row">
        <td>Discount${payment.discountCode ? ` (${payment.discountCode})` : ''}</td>
        <td></td>
        <td></td>
        <td style="text-align:right">-₹${payment.discountAmount}</td>
      </tr>` : ''}
      <tr class="total-row">
        <td colspan="3">Total</td>
        <td style="text-align:right">₹${payment.amount}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; font-size: 12px;">
    <strong>Payment Details</strong><br>
    Method: ${payment.paymentMethod || 'Online'}<br>
    Status: ${payment.status}<br>
    Transaction ID: ${payment.stripePaymentIntentId || payment._id}
  </div>

  <div class="footer">
    <p>This is a computer-generated invoice and does not require a signature.</p>
    <p>Ehsaas Therapy Centre | sessions.ehsaas@gmail.com | +91-7411948161</p>
  </div>
</body>
</html>`;
};
