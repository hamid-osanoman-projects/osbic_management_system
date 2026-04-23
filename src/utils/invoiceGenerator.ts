import { type Job } from '../hooks/shared/useJobs';

export const downloadInvoice = (job: Job) => {
  const isFullyPaid = job.remaining_paid;
  const isAdvancePaid = job.advance_paid;
  
  // Decide which amount to focus on based on current progress
  const displayAmount = isFullyPaid ? job.total_fee : job.advance_due_amount;
  const invoiceType = isFullyPaid ? 'Final Tax Invoice' : 'Advance Payment Receipt';
  const paymentStatus = isFullyPaid ? 'PAID IN FULL' : 'PARTIAL / ADVANCE ONLY';

  const invoiceHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${invoiceType} - ${job.job_code}</title>
        <style>
            body { font-family: 'Inter', sans-serif; color: #0A0F1E; margin: 0; padding: 40px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #D4AF37; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 800; color: #D4AF37; letter-spacing: -1px; }
            .invoice-title { font-size: 24px; font-weight: 900; text-transform: uppercase; color: #0A0F1E; }
            .details { margin-top: 40px; display: flex; justify-content: space-between; }
            .section-title { font-size: 9px; font-weight: 900; color: #94A3B8; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.1em; }
            .info-box { background: #F8FAFC; border: 1px solid #F1F5F9; padding: 25px; border-radius: 12px; }
            .table { width: 100%; margin-top: 40px; border-collapse: collapse; overflow: hidden; border-radius: 12px; }
            .table th { text-align: left; background: #F8FAFC; padding: 15px; font-size: 10px; text-transform: uppercase; color: #64748B; border-bottom: 1px solid #E2E8F0; }
            .table td { padding: 15px; border-bottom: 1px solid #F1F5F9; font-size: 13px; color: #1E293B; }
            .total-row { background: #0A0F1E; color: white; }
            .footer { margin-top: 80px; text-align: center; color: #94A3B8; font-size: 10px; font-weight: 500; }
            .status-badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 10px; font-weight: 900; letter-spacing: 0.05em; margin-top: 5px; }
            .status-paid { background: #ECFDF5; color: #059669; border: 1px solid #D1FAE5; }
            .status-partial { background: #FFFBEB; color: #D97706; border: 1px solid #FEF3C7; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <div class="logo">OSBIC OS</div>
                <div style="font-size: 11px; font-weight: 700; color: #64748B; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.1em;">Global Operations Center</div>
            </div>
            <div style="text-align: right;">
                <div class="invoice-title">${invoiceType}</div>
                <div class="status-badge ${isFullyPaid ? 'status-paid' : 'status-partial'}">${paymentStatus}</div>
            </div>
        </div>

        <div class="details">
            <div style="width: 46%;">
                <div class="section-title">Recipient Identity</div>
                <div class="info-box">
                    <div style="font-weight: 900; font-size: 18px; color: #0F172A;">${job.client_name}</div>
                    <div style="font-size: 11px; font-weight: 600; color: #64748B; margin-top: 6px; font-mono;">ID-REF: ${job.client_id.slice(0, 8).toUpperCase()}</div>
                </div>
            </div>
            <div style="width: 46%;">
                <div class="section-title">Metadata & Ref</div>
                <div class="info-box">
                    <div style="font-weight: 700; font-size: 13px;">Job Registry: <span style="font-mono; font-weight: 400;">${job.job_code}</span></div>
                    <div style="font-size: 12px; color: #64748B; margin-top: 4px;">Generation Date: ${new Date().toLocaleDateString()}</div>
                </div>
            </div>
        </div>

        <table class="table">
            <thead>
                <tr>
                    <th>Service Segment</th>
                    <th>Payment Category</th>
                    <th style="text-align: right;">Segment Total</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="font-weight: 700; color: #0F172A;">${job.service_name}</td>
                    <td style="font-weight: 500;">${isFullyPaid ? 'Full Service Fulfillment' : 'Mandatory Advance Retention'}</td>
                    <td style="text-align: right; font-weight: 700;">${displayAmount.toLocaleString()} OMR</td>
                </tr>
                <tr class="total-row">
                    <td colspan="2" style="font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding-left: 20px;">Net Amount Settlement</td>
                    <td style="text-align: right; font-weight: 900; font-size: 18px; padding-right: 20px;">${displayAmount.toLocaleString()} OMR</td>
                </tr>
            </tbody>
        </table>

        ${!isFullyPaid ? `
        <div style="margin-top: 30px; padding: 20px; border-radius: 12px; border: 1px solid #E2E8F0; background: #F8FAFC;">
            <div class="section-title">Pending Settlement Reconciliation</div>
            <div style="font-size: 14px; font-weight: 700; color: #0F172A;">Outstanding Balance: ${job.remaining_due_amount.toLocaleString()} OMR</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Full Tax Invoice will be generated upon final fulfillment of the outstanding balance.</div>
        </div>
        ` : ''}

        <div style="margin-top: 40px; padding: 20px; border-radius: 12px; border: 1px dashed #D4AF37; background: #FFFBEB; font-size: 11px; color: #92400E;">
            <strong>System Verification Notice:</strong> This document is notarized and officially logged in the OSBIC SLM Hub. It serves as a valid receipt for the amounts specified above.
        </div>

        <div class="footer">
            OSBIC OS • Muscat, Oman • 72229827 • slm-hub.osan.om <br/>
            &copy; ${new Date().getFullYear()} OSBIC Development Team. All rights reserved.
        </div>

        <div class="no-print" style="position: fixed; bottom: 30px; right: 30px;">
           <button onclick="window.print()" style="background: #0A0F1E; color: white; border: none; padding: 16px 32px; border-radius: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 25px rgba(10,15,30,0.3); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Secure Export to PDF</button>
        </div>
    </body>
    </html>
  `;

  const blob = new Blob([invoiceHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
};
