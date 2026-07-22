import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { type Job } from '../hooks/shared/useJobs';

export const printVectorInvoiceHtml = (htmlContent: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 300);
};

const generatePdfFromHtml = async (htmlContent: string, fileName: string) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // Standard A4 width in px at 96 DPI
  container.style.background = '#ffffff';
  container.innerHTML = htmlContent;

  const noPrintEls = container.querySelectorAll('.no-print');
  noPrintEls.forEach(el => el.remove());

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2, // 2x scale for sharp text rendering without bloated file size
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Compress to JPEG at 85% quality to reduce file size from 38MB to ~300KB
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    const pdfFileName = `${fileName}.pdf`;

    // Only trigger navigator.share on actual Mobile / Tablet devices (iOS / Android)
    const isMobileDevice = typeof navigator !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /Macintosh|iPad/i.test(navigator.userAgent))
    );

    if (isMobileDevice && (navigator as any).canShare && (navigator as any).share) {
      try {
        const pdfBlob = pdf.output('blob');
        const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });
        if ((navigator as any).canShare({ files: [pdfFile] })) {
          await (navigator as any).share({
            title: fileName,
            files: [pdfFile]
          });
          return;
        }
      } catch (shareErr) {
        console.log('Mobile share cancelled or ignored, downloading file directly...', shareErr);
      }
    }

    // Direct instant file download for desktop computers
    pdf.save(pdfFileName);
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    printVectorInvoiceHtml(htmlContent);
  } finally {
    document.body.removeChild(container);
  }
};

export const downloadInvoice = (job: Job) => {
  const isFullyPaid = job.remaining_paid;
  
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
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <div class="logo">OSBIC CONNECT</div>
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
            OSBIC CONNECT • Muscat, Oman • 72229827 • slm-hub.osan.om <br/>
            &copy; ${new Date().getFullYear()} OSBIC Development Team. All rights reserved.
        </div>
    </body>
    </html>
  `;

  generatePdfFromHtml(invoiceHtml, `Invoice_${job.job_code}`);
};

export const downloadCustomInvoice = (invoice: any) => {
  const isPaid = invoice.status === 'paid';
  const isQuotation = invoice.type === 'quotation';
  const themeColor = '#8b85f9';
  const dateStr = invoice.issue_date 
    ? new Date(invoice.issue_date).toLocaleDateString()
    : new Date().toLocaleDateString();

  const itemsHtml = (invoice.items || []).map((item: any, idx: number) => `
    <tr class="border-b border-gray-300">
      <td class="py-1.5 px-2">${idx + 1}</td>
      <td class="py-1.5 px-2 font-bold">${item.description}</td>
      <td class="py-1.5 px-2 text-center">${item.quantity}</td>
      <td class="py-1.5 px-2 text-right">OMR ${Number(item.unit_price).toFixed(3)}</td>
      <td class="py-1.5 px-2 text-center">${invoice.tax_percentage || 0}%</td>
      <td class="py-1.5 px-2 text-right">OMR ${Number(item.unit_price).toFixed(3)}</td>
      <td class="py-1.5 px-2 text-right">OMR ${Number(item.total).toFixed(3)}</td>
    </tr>
  `).join('');

  const totalQuantity = (invoice.items || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

  const numberToWords = (amount: number) => {
    const whole = Math.floor(amount);
    const units = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
    if (whole <= 10) return `${units[whole]} Rials only`;
    return `${whole} Rials only`;
  };

  const invoiceHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${isQuotation ? 'Quotation' : 'Invoice'} - ${invoice.invoice_number || 'DRAFT'}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
        </style>
    </head>
    <body class="bg-gray-100 p-8 flex justify-center items-center">
      <div class="bg-white text-black p-10 min-h-[1056px] w-[794px] max-w-full mx-auto shadow-2xl relative overflow-hidden font-sans text-[11px] leading-relaxed print:shadow-none print:p-0 print:w-full">
        
        <!-- PAID Watermark Sticker -->
        ${isPaid ? `
        <div style="position: absolute; top: 35%; left: 0; right: 0; display: flex; justify-content: center; align-items: center; transform: rotate(-12deg); opacity: 0.12; pointer-events: none; z-index: 0;">
          <svg width="360" height="150" viewBox="0 0 360 150" style="overflow: visible;">
            <rect x="8" y="8" width="344" height="134" rx="28" ry="28" fill="none" stroke="#16a34a" stroke-width="8" />
            <text x="180" y="75" text-anchor="middle" dominant-baseline="central" fill="#16a34a" font-size="80" font-weight="900" font-family="system-ui, -apple-system, sans-serif" letter-spacing="6">PAID</text>
          </svg>
        </div>
        ` : ''}

        <!-- Header -->
        <div class="flex justify-between items-start relative z-10">
          <div>
            <h1 class="text-[13px] font-bold text-gray-900 mb-1">OSBIC INTERNATIONAL LLC (OMAN)</h1>
            <p>Building No: 271, Office No: 8, 99 Street, Al Jami Al Akbar Street,</p>
            <p>Muscat, Oman. Landmark ASAS SERVICE CENTER</p>
            <p>Ghala Industrial Area Muscat Sultanate of Oman</p>
            <p class="mt-1">Phone no. : +968 72596531, 72229827</p>
            <p>Email : Ayoob@osangroupoman.com</p>
          </div>
          
          <!-- Blue OSBIC Box -->
          <div class="w-20 h-20 bg-[#0088cc] flex items-center justify-center text-white text-[10px] font-bold tracking-widest">
            OSBIC
          </div>
        </div>

        <div class="w-full border-t border-gray-300 mt-4 mb-4"></div>

        <!-- Title -->
        <div class="text-center relative z-10 mb-6">
          <h2 class="text-xl font-bold" style="color: ${themeColor}">
            ${isQuotation ? 'Quotation' : 'Invoice'}
          </h2>
        </div>

        <!-- Client Info & Invoice Details -->
        <div class="flex justify-between items-start mb-6 relative z-10">
          <div>
            <h3 class="font-bold text-gray-900 mb-2">Bill To</h3>
            <p class="font-bold text-gray-900 text-xs">${invoice.client?.full_name || 'Client Name'}</p>
          </div>
          <div class="text-right">
            <h3 class="font-bold text-gray-900 mb-2">Invoice Details</h3>
            <p><span class="text-gray-600">Invoice No. :</span> ${invoice.invoice_number || 'DRAFT'}</p>
            <p><span class="text-gray-600">Date :</span> ${dateStr}</p>
          </div>
        </div>

        <!-- Items Table -->
        <div class="relative z-10 mb-6">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-white font-bold" style="background-color: ${themeColor}">
                <th class="py-1 px-2 w-8">#</th>
                <th class="py-1 px-2">Service Name</th>
                <th class="py-1 px-2 text-center w-16">Quantity</th>
                <th class="py-1 px-2 text-right w-24">Price/ Unit</th>
                <th class="py-1 px-2 text-center w-16">VAT %</th>
                <th class="py-1 px-2 text-right w-24">Final Rate</th>
                <th class="py-1 px-2 text-right w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              ${(invoice.items || []).length === 0 ? `
                <tr>
                  <td colspan="7" class="py-3 text-center text-gray-400 italic">No items added yet.</td>
                </tr>
              ` : ''}
              <!-- Total Row -->
              <tr class="border-b-2 border-black font-bold">
                <td></td>
                <td class="py-1.5 px-2">Total</td>
                <td class="py-1.5 px-2 text-center">${totalQuantity}</td>
                <td></td>
                <td></td>
                <td></td>
                <td class="py-1.5 px-2 text-right">OMR ${Number(invoice.subtotal).toFixed(3)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Description & Financial Summary Grid -->
        <div class="grid grid-cols-2 gap-8 relative z-10 mb-4">
          <!-- Left Side: Description & Words -->
          <div class="space-y-2">
             <div>
               <h4 class="font-bold mb-1">Description</h4>
               <p class="text-gray-600 uppercase">${invoice.notes || ''}</p>
             </div>
             <div>
               <h4 class="font-bold mb-1">Invoice Amount In Words</h4>
               <p class="text-gray-600">${numberToWords(invoice.total_amount)}</p>
             </div>
          </div>

          <!-- Right Side: Totals Table -->
          <div class="w-full flex justify-end">
             <table class="w-full max-w-[250px] text-right">
               <tbody>
                 <tr>
                   <td class="py-1 px-2 text-gray-600 font-bold">Sub Total</td>
                   <td class="py-1 px-2 font-bold">OMR ${Number(invoice.subtotal).toFixed(3)}</td>
                 </tr>
                 <tr class="text-white font-bold" style="background-color: ${themeColor}">
                   <td class="py-1 px-2">Total</td>
                   <td class="py-1 px-2">OMR ${Number(invoice.total_amount).toFixed(3)}</td>
                 </tr>
                 <tr>
                   <td class="py-1 px-2 text-gray-600 border-b border-gray-200">Received</td>
                   <td class="py-1 px-2 border-b border-gray-200 font-bold">OMR ${Number(isPaid ? invoice.total_amount : 0).toFixed(3)}</td>
                 </tr>
                 <tr>
                   <td class="py-1 px-2 text-gray-600 border-b border-gray-200">Balance</td>
                   <td class="py-1 px-2 border-b border-gray-200 font-bold text-red-500">OMR ${Number(isPaid ? 0 : invoice.total_amount).toFixed(3)}</td>
                 </tr>
                 <tr>
                    <td class="py-1 px-2 text-gray-600 border-b border-gray-200">${isPaid ? 'Payment mode' : 'Payment Terms'}</td>
                    <td class="py-1 px-2 border-b border-gray-200 font-bold">${invoice.terms || (isPaid ? 'Bank Transfer' : 'Payment is due within 10 days.')}</td>
                 </tr>
               </tbody>
             </table>
          </div>
        </div>

        <!-- Terms and Conditions -->
        <div class="relative z-10 space-y-1 mb-6">
          <h4 class="font-bold">Terms and Conditions</h4>
          <p class="mb-1 text-[10px]">Thanks for doing business with us!</p>
          
          <div class="space-y-0.5 leading-tight text-[9px]" dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
            <p class="font-bold">ملاحظة: تم إنجاز المعاملة</p>
            <p>- عدم تحمل الشركة أي قرارات وزارية مفاجئة.</p>
            <p>- لن تتحمل الشركة أي تأخير صدر من قبل العميل.</p>
            <p>- لن يتم إسترجاع مبلغ المكتب إذا تم البدء في المعاملة.</p>
            <p>- لن يتحمل المكتب أي رسوم إضافية تفرض من قبل الحكومة.</p>
          </div>

          <div class="space-y-0.5 mt-2 leading-tight text-[9px]">
            <p>The company shall not bear responsibility for any sudden ministerial decisions.</p>
            <p>- The company shall not be held liable for any delays caused by the client.</p>
            <p>- The clearance fee is non-refundable once the transaction has commenced.</p>
            <p>- The office will not bear any additional fees imposed by the government.</p>
          </div>
        </div>

        <!-- Pay To & Signature Block -->
        <div class="grid grid-cols-2 gap-8 relative z-10 text-[9px]">
          <div>
            <h4 class="font-bold mb-1">Pay To:</h4>
            <div class="space-y-0.5">
              <p>Bank Name : BANK MUSCAT</p>
              <p>Bank Account No. : 0423081077790019</p>
              <p>Bank SWIFT code : BMUSOMRXXX</p>
              <p>Account holder's name : OSBIC INTERNATIONAL LLC</p>
              <p>IBAN : OM550270423081077790019</p>
            </div>
          </div>
          
          <div class="text-right flex flex-col justify-end pt-4">
            <p class="mt-2 font-bold">For :OSBIC INTERNATIONAL LLC (OMAN)</p>
          </div>
        </div>

        <div class="grid grid-cols-2 mt-12 relative z-10 text-center font-bold text-[9px]">
          <div>Customer Signatory</div>
          <div>Authorized Signatory</div>
        </div>

      </div>

      <div class="no-print" style="position: fixed; bottom: 30px; right: 30px;">
         <button onclick="window.print()" style="background: #8b85f9; color: white; border: none; padding: 16px 32px; border-radius: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 25px rgba(139,133,249,0.3); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Print Custom Invoice</button>
      </div>
    </body>
    </html>
  `;

  generatePdfFromHtml(invoiceHtml, `Invoice_${invoice.invoice_number || 'DRAFT'}`);
};
