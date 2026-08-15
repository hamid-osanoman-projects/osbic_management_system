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

const generatePdfFromHtml = async (htmlContent: string, fileName: string, action: 'download' | 'view' = 'download') => {
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

    // Handle view action by opening in a new tab
    if (action === 'view') {
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
      return;
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

export const downloadInvoice = (
  job: Job, 
  typeOrAction: 'advance' | 'remaining' | 'full' | 'download' | 'view' = 'full', 
  actionParam: 'download' | 'view' = 'download'
) => {
  let type: 'advance' | 'remaining' | 'full' = 'full';
  let action: 'download' | 'view' = actionParam;

  if (typeOrAction === 'download' || typeOrAction === 'view') {
    action = typeOrAction;
    type = 'full';
  } else {
    type = typeOrAction;
  }

  const isPaid = type === 'advance' ? job.advance_paid : (type === 'remaining' ? job.remaining_paid : job.remaining_paid);
  const themeColor = '#3b98d3'; // Brand blue theme color for invoices/quotes
  const dateStr = job.started_date 
    ? new Date(job.started_date).toLocaleDateString()
    : new Date().toLocaleDateString();

  // If job has a list of services (often in job.services), map them. Otherwise fallback to the main service.
  const services = (job as any).services || [];
  const items = services.length > 0 
    ? services.map((s: any) => {
        const basePrice = s.total_fee || ((s.ministry_fee || 0) + (s.work_fee || 0)) || job.total_fee;
        const price = type === 'advance' ? basePrice * 0.5 : (type === 'remaining' ? basePrice * 0.5 : basePrice);
        return {
          description: `${type === 'advance' ? 'Advance Payment - ' : (type === 'remaining' ? 'Final Payment - ' : '')}${s.service_name || s.name_en || job.service_name}`,
          quantity: s.quantity || 1,
          unit_price: price,
          total: price * (s.quantity || 1)
        };
      })
    : [{
        description: `${type === 'advance' ? 'Advance Payment - ' : (type === 'remaining' ? 'Final Payment - ' : '')}${job.service_name || 'Standard Service'}`,
        quantity: 1,
        unit_price: type === 'advance' ? (job.advance_due_amount || job.total_fee * 0.5) : (type === 'remaining' ? (job.remaining_due_amount || job.total_fee * 0.5) : job.total_fee),
        total: type === 'advance' ? (job.advance_due_amount || job.total_fee * 0.5) : (type === 'remaining' ? (job.remaining_due_amount || job.total_fee * 0.5) : job.total_fee)
      }];

  const itemsHtml = items.map((item: any, idx: number) => `
    <tr class="border-b border-gray-300">
      <td class="py-3 px-2 align-middle">${idx + 1}</td>
      <td class="py-3 px-2 align-middle font-bold">${item.description}</td>
      <td class="py-3 px-2 align-middle text-center">${item.quantity}</td>
      <td class="py-3 px-2 align-middle text-right">OMR ${Number(item.unit_price).toFixed(3)}</td>
      <td class="py-3 px-2 align-middle text-center">0%</td>
      <td class="py-3 px-2 align-middle text-right">OMR ${Number(item.unit_price).toFixed(3)}</td>
      <td class="py-3 px-2 align-middle text-right">OMR ${Number(item.total).toFixed(3)}</td>
    </tr>
  `).join('');

  const totalQuantity = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

  const subtotal = type === 'advance' 
    ? (job.advance_due_amount || job.total_fee * 0.5) 
    : (type === 'remaining' ? (job.remaining_due_amount || job.total_fee * 0.5) : job.total_fee);
  
  const totalAmount = subtotal;
  const received = isPaid ? subtotal : (type === 'full' ? (job.total_fee - job.remaining_due_amount) : 0);
  const balance = isPaid ? 0 : (type === 'full' ? job.remaining_due_amount : subtotal);

  const numberToWords = (amount: number) => {
    const whole = Math.floor(amount);
    const units = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
    if (whole <= 10) return `${units[whole]} Rials only`;
    return `${whole} Rials only`;
  };

  let documentTitle = 'Tax Invoice';
  if (type === 'advance') documentTitle = 'Advance Payment Invoice';
  if (type === 'remaining') documentTitle = 'Final Balance Invoice';

  const invoiceHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${documentTitle} - ${job.job_code}</title>
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
            ${documentTitle}
          </h2>
        </div>

        <!-- Client Info & Invoice Details -->
        <div class="flex justify-between items-start mb-6 relative z-10">
          <div>
            <h3 class="font-bold text-gray-900 mb-2">Bill To</h3>
            <p class="font-bold text-gray-900 text-xs">${job.client_name}</p>
          </div>
          <div class="text-right">
            <h3 class="font-bold text-gray-900 mb-2">Invoice Details</h3>
            <p><span class="text-gray-600">Invoice No. :</span> ${job.job_code}</p>
            <p><span class="text-gray-600">Date :</span> ${dateStr}</p>
          </div>
        </div>

        <!-- Items Table -->
        <div class="relative z-10 mb-6">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-white font-bold" style="background-color: ${themeColor}; height: 40px;">
                <th class="px-2 align-middle w-8" style="height: 40px; line-height: 40px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">#</th>
                <th class="px-2 align-middle" style="height: 40px; line-height: 40px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">Service Name</th>
                <th class="px-2 align-middle text-center w-16" style="height: 40px; line-height: 40px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">Quantity</th>
                <th class="px-2 align-middle text-right w-24" style="height: 40px; line-height: 40px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">Price/ Unit</th>
                <th class="px-2 align-middle text-center w-16" style="height: 40px; line-height: 40px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">VAT %</th>
                <th class="px-2 align-middle text-right w-24" style="height: 40px; line-height: 40px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">Final Rate</th>
                <th class="px-2 align-middle text-right w-24" style="height: 40px; line-height: 40px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <!-- Total Row -->
              <tr class="border-b-2 border-black font-bold">
                <td></td>
                <td class="py-2.5 px-2 align-middle">Total</td>
                <td class="py-2.5 px-2 align-middle text-center">${totalQuantity}</td>
                <td></td>
                <td></td>
                <td></td>
                <td class="py-2.5 px-2 align-middle text-right">OMR ${Number(totalAmount).toFixed(3)}</td>
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
               <p class="text-gray-600 uppercase">${job.notes || 'THANK YOU FOR YOUR BUSINESS.'}</p>
             </div>
             <div>
               <h4 class="font-bold mb-1">Invoice Amount In Words</h4>
               <p class="text-gray-600">${numberToWords(totalAmount)}</p>
             </div>
          </div>

          <!-- Right Side: Totals Table -->
          <div class="w-full flex justify-end">
             <table class="w-full max-w-[250px] text-right border-collapse">
               <tbody>
                 <tr>
                   <td class="py-2.5 px-2 align-middle text-gray-600 font-bold">Sub Total</td>
                   <td class="py-2.5 px-2 align-middle font-bold">OMR ${Number(subtotal).toFixed(3)}</td>
                 </tr>
                 <tr class="text-white font-bold" style="background-color: ${themeColor}; height: 36px;">
                   <td class="px-2 align-middle" style="height: 36px; line-height: 36px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">Total</td>
                   <td class="px-2 align-middle" style="height: 36px; line-height: 36px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">OMR ${Number(totalAmount).toFixed(3)}</td>
                 </tr>
                 <tr>
                   <td class="py-2.5 px-2 align-middle text-gray-600 border-b border-gray-200">Received</td>
                   <td class="py-2.5 px-2 align-middle border-b border-gray-200 font-bold">OMR ${Number(received).toFixed(3)}</td>
                 </tr>
                 <tr>
                   <td class="py-2.5 px-2 align-middle text-gray-600 border-b border-gray-200">Balance</td>
                   <td class="py-2.5 px-2 align-middle border-b border-gray-200 font-bold text-red-500">OMR ${Number(balance).toFixed(3)}</td>
                 </tr>
                 <tr>
                    <td class="py-2.5 px-2 align-middle text-gray-600 border-b border-gray-200">Payment Status</td>
                    <td class="py-2.5 px-2 align-middle border-b border-gray-200 font-bold">${isPaid ? 'PAID IN FULL' : 'PARTIAL / ADVANCE ONLY'}</td>
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
         <button onclick="window.print()" style="background: #3b98d3; color: white; border: none; padding: 16px 32px; border-radius: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 25px rgba(59,152,211,0.3); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Print Invoice</button>
      </div>
    </body>
    </html>
  `;

  generatePdfFromHtml(invoiceHtml, `Invoice_${job.job_code}`, action);
};

export const downloadCustomInvoice = (invoice: any, action: 'download' | 'view' = 'download') => {
  const isPaid = invoice.status === 'paid';
  const isQuotation = invoice.type === 'quotation';
  const themeColor = '#3b98d3';
  const dateStr = invoice.issue_date 
    ? new Date(invoice.issue_date).toLocaleDateString()
    : new Date().toLocaleDateString();

  const itemsHtml = (invoice.items || []).map((item: any, idx: number) => `
    <tr class="border-b border-gray-300">
      <td class="py-3 px-2 align-middle">${idx + 1}</td>
      <td class="py-3 px-2 align-middle font-bold">${item.description}</td>
      <td class="py-3 px-2 align-middle text-center">${item.quantity}</td>
      <td class="py-3 px-2 align-middle text-right">OMR ${Number(item.unit_price).toFixed(3)}</td>
      <td class="py-3 px-2 align-middle text-center">${invoice.tax_percentage || 0}%</td>
      <td class="py-3 px-2 align-middle text-right">OMR ${Number(item.unit_price).toFixed(3)}</td>
      <td class="py-3 px-2 align-middle text-right">OMR ${Number(item.total).toFixed(3)}</td>
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
              <tr class="text-white font-bold" style="background-color: ${themeColor}; height: 40px;">
                <th class="px-2 align-middle w-8" style="height: 40px; line-height: 40px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">#</th>
                <th class="px-2 align-middle" style="height: 40px; line-height: 40px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">Service Name</th>
                <th class="px-2 align-middle text-center w-16" style="height: 40px; line-height: 40px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">Quantity</th>
                <th class="px-2 align-middle text-right w-24" style="height: 40px; line-height: 40px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">Price/ Unit</th>
                <th class="px-2 align-middle text-center w-16" style="height: 40px; line-height: 40px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">VAT %</th>
                <th class="px-2 align-middle text-right w-24" style="height: 40px; line-height: 40px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">Final Rate</th>
                <th class="px-2 align-middle text-right w-24" style="height: 40px; line-height: 40px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">Amount</th>
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
                <td class="py-2.5 px-2 align-middle">Total</td>
                <td class="py-2.5 px-2 align-middle text-center">${totalQuantity}</td>
                <td></td>
                <td></td>
                <td></td>
                <td class="py-2.5 px-2 align-middle text-right">OMR ${Number(invoice.subtotal).toFixed(3)}</td>
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
             <table class="w-full max-w-[250px] text-right border-collapse">
               <tbody>
                 <tr>
                   <td class="py-2.5 px-2 align-middle text-gray-600 font-bold">Sub Total</td>
                   <td class="py-2.5 px-2 align-middle font-bold">OMR ${Number(invoice.subtotal).toFixed(3)}</td>
                 </tr>
                 <tr class="text-white font-bold" style="background-color: ${themeColor}; height: 36px;">
                   <td class="px-2 align-middle" style="height: 36px; line-height: 36px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">Total</td>
                   <td class="px-2 align-middle" style="height: 36px; line-height: 36px; padding-top: 0; padding-bottom: 0; vertical-align: middle;">OMR ${Number(invoice.total_amount).toFixed(3)}</td>
                 </tr>
                 <tr>
                   <td class="py-2.5 px-2 align-middle text-gray-600 border-b border-gray-200">Received</td>
                   <td class="py-2.5 px-2 align-middle border-b border-gray-200 font-bold">OMR ${Number(isPaid ? invoice.total_amount : 0).toFixed(3)}</td>
                 </tr>
                 <tr>
                   <td class="py-2.5 px-2 align-middle text-gray-600 border-b border-gray-200">Balance</td>
                   <td class="py-2.5 px-2 align-middle border-b border-gray-200 font-bold text-red-500">OMR ${Number(isPaid ? 0 : invoice.total_amount).toFixed(3)}</td>
                 </tr>
                 <tr>
                    <td class="py-2.5 px-2 align-middle text-gray-600 border-b border-gray-200">${isPaid ? 'Payment mode' : 'Payment Terms'}</td>
                    <td class="py-2.5 px-2 align-middle border-b border-gray-200 font-bold">${invoice.terms || (isPaid ? 'Bank Transfer' : 'Payment is due within 10 days.')}</td>
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
         <button onclick="window.print()" style="background: #3b98d3; color: white; border: none; padding: 16px 32px; border-radius: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 25px rgba(59,152,211,0.3); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Print Custom Invoice</button>
      </div>
    </body>
    </html>
  `;

  generatePdfFromHtml(invoiceHtml, `Invoice_${invoice.invoice_number || 'DRAFT'}`, action);
};

export const downloadReceipt = (job: any, payment: any, action: 'download' | 'view' = 'download') => {
  const themeColor = '#3b98d3'; // Use the requested light blue for receipts
  const dateStr = payment.created_at 
    ? new Date(payment.created_at).toLocaleDateString()
    : new Date().toLocaleDateString();

  const numberToWords = (amount: number) => {
    const whole = Math.floor(amount);
    const units = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
    if (whole <= 10) return `${units[whole]} Rials only`;
    return `${whole} Rials only`;
  };

  const totalBilled = Number(job.total_fee || 0);
  const amountReceived = Number(payment.amount || 0);

  // Calculate total verified payments to determine the true remaining balance
  const verifiedPayments = (job.payments || []).filter((p: any) => p.status === 'verified');
  let totalPaidOverall = verifiedPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  
  // Ensure the current payment is included in total paid if it's not yet in the list or has a different status locally
  const hasCurrentPayment = verifiedPayments.some((p: any) => p.id === payment.id);
  if (!hasCurrentPayment && payment.status === 'verified') {
    totalPaidOverall += amountReceived;
  }

  // Fallback to job.advance_amount if payments array is missing
  if (!job.payments || job.payments.length === 0) {
    totalPaidOverall = Number(job.advance_amount || amountReceived);
  }

  const remainingBalance = Math.max(0, totalBilled - totalPaidOverall);
  const receiptNumber = payment.reference_number || `REC-${job.job_code || Math.floor(Math.random() * 10000)}`;

  // Determine payment stage: Advance, Partial, or Full Payment
  let paymentStage = 'Partial Payment';
  if (amountReceived >= totalBilled || totalPaidOverall >= totalBilled) {
    paymentStage = 'Full Payment';
  } else if (totalPaidOverall - amountReceived === 0) {
    paymentStage = 'Advance Payment';
  }

  const jobTitle = job.custom_name || job.service_name || 'Business Setup Package';
  const itemsHtml = `
    <tr class="border-b border-gray-300">
      <td class="py-3 px-2 align-middle">1</td>
      <td class="py-3 px-2 align-middle font-bold">${jobTitle}</td>
      <td class="py-3 px-2 align-middle text-center">1</td>
      <td class="py-3 px-2 align-middle text-right">OMR ${totalBilled.toFixed(3)}</td>
      <td class="py-3 px-2 align-middle text-center">0%</td>
      <td class="py-3 px-2 align-middle text-right">OMR ${totalBilled.toFixed(3)}</td>
      <td class="py-3 px-2 align-middle text-right">OMR ${totalBilled.toFixed(3)}</td>
    </tr>
  `;

  const receiptHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Receipt - ${receiptNumber}</title>
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
        <div style="position: absolute; top: 35%; left: 0; right: 0; display: flex; justify-content: center; align-items: center; transform: rotate(-12deg); opacity: 0.12; pointer-events: none; z-index: 0;">
          <svg width="360" height="150" viewBox="0 0 360 150" style="overflow: visible;">
            <rect x="8" y="8" width="344" height="134" rx="28" ry="28" fill="none" stroke="#16a34a" stroke-width="8" />
            <text x="180" y="75" text-anchor="middle" dominant-baseline="central" fill="#16a34a" font-size="80" font-weight="900" font-family="system-ui, -apple-system, sans-serif" letter-spacing="6">PAID</text>
          </svg>
        </div>

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
          <div class="w-20 h-20 flex items-center justify-center text-white text-[10px] font-bold tracking-widest" style="background-color: ${themeColor}">
            OSBIC
          </div>
        </div>

        <div class="w-full border-t border-gray-300 mt-4 mb-4"></div>

        <!-- Title -->
        <div class="text-center relative z-10 mb-6">
          <h2 class="text-xl font-bold uppercase tracking-widest" style="color: ${themeColor}">
            Official Receipt
          </h2>
        </div>

        <!-- Client Info & Receipt Details -->
        <div class="flex justify-between items-start mb-6 relative z-10">
          <div>
            <h3 class="font-bold text-gray-900 mb-2">Received From</h3>
            <p class="font-bold text-gray-900 text-xs">${job.client?.full_name || 'Client Name'}</p>
            <p class="text-gray-600">${job.client?.company_name || ''}</p>
          </div>
          <div class="text-right">
            <h3 class="font-bold text-gray-900 mb-2">Receipt Details</h3>
            <p><span class="text-gray-600">Receipt No. :</span> ${receiptNumber}</p>
            <p><span class="text-gray-600">Date :</span> ${dateStr}</p>
            <p><span class="text-gray-600">Job Code :</span> ${job.job_code || '-'}</p>
            <p><span class="text-gray-600">Payment Stage :</span> <span class="font-bold text-emerald-600">${paymentStage}</span></p>
            <p><span class="text-gray-600">Sales Representative :</span> <span class="font-bold">${job.sales_employee_name || 'N/A'}</span></p>
            <p><span class="text-gray-600">Recorded By :</span> ${payment.recorder?.full_name || 'Admin'}</p>
          </div>
        </div>

        <!-- Items Table -->
        <div class="relative z-10 mb-6">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-white font-bold" style="background-color: ${themeColor}">
                <th class="py-2.5 px-2 align-middle w-8">#</th>
                <th class="py-2.5 px-2 align-middle">Item / Particulars</th>
                <th class="py-2.5 px-2 align-middle text-center w-16">Quantity</th>
                <th class="py-2.5 px-2 align-middle text-right w-24">Price/ Unit</th>
                <th class="py-2.5 px-2 align-middle text-center w-16">VAT %</th>
                <th class="py-2.5 px-2 align-middle text-right w-24">Final Rate</th>
                <th class="py-2.5 px-2 align-middle text-right w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <!-- Total Row -->
              <tr class="border-b-2 border-black font-bold">
                <td></td>
                <td class="py-2.5 px-2 align-middle">Total</td>
                <td class="py-2.5 px-2 align-middle text-center">1</td>
                <td></td>
                <td></td>
                <td></td>
                <td class="py-2.5 px-2 align-middle text-right">OMR ${totalBilled.toFixed(3)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Description & Financial Summary Grid -->
        <div class="grid grid-cols-2 gap-8 relative z-10 mb-4">
          <!-- Left Side: Description & Words -->
          <div class="space-y-2">
             <div>
               <h4 class="font-bold mb-1">Description / Notes</h4>
               <p class="text-gray-600 uppercase">${payment.notes || 'Payment received for services rendered.'}</p>
             </div>
             <div>
               <h4 class="font-bold mb-1">Amount Received In Words</h4>
               <p class="text-gray-600">${numberToWords(amountReceived)}</p>
             </div>
          </div>

          <!-- Right Side: Totals Table -->
          <div class="w-full flex justify-end">
             <table class="w-full max-w-[250px] text-right border-collapse">
               <tbody>
                 <tr>
                   <td class="py-2.5 px-2 align-middle text-gray-600 font-bold">Total Job Fee</td>
                   <td class="py-2.5 px-2 align-middle font-bold">OMR ${totalBilled.toFixed(3)}</td>
                 </tr>
                 <tr class="text-white font-bold" style="background-color: ${themeColor}">
                   <td class="py-2.5 px-2 align-middle">Amount Received</td>
                   <td class="py-2.5 px-2 align-middle font-bold">OMR ${amountReceived.toFixed(3)}</td>
                 </tr>
                 <tr>
                   <td class="py-2.5 px-2 align-middle text-gray-600 border-b border-gray-200">Balance Due</td>
                   <td class="py-2.5 px-2 align-middle border-b border-gray-200 font-bold text-red-500">OMR ${remainingBalance.toFixed(3)}</td>
                 </tr>
                 <tr>
                    <td class="py-2.5 px-2 align-middle text-gray-600 border-b border-gray-200">Payment mode</td>
                    <td class="py-2.5 px-2 align-middle border-b border-gray-200 font-bold capitalize">${payment.payment_method?.replace('_', ' ') || 'Bank Transfer'}</td>
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
            <h4 class="font-bold mb-1">Received To:</h4>
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
         <button onclick="window.print()" style="background: ${themeColor}; color: white; border: none; padding: 16px 32px; border-radius: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 25px rgba(59,152,211,0.3); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Print Receipt</button>
      </div>
    </body>
    </html>
  `;

  generatePdfFromHtml(receiptHtml, `Receipt_${receiptNumber}`, action);
};
