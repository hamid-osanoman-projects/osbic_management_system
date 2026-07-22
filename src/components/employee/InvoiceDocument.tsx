import React, { forwardRef } from 'react';
import type { Invoice } from '../../hooks/employee/useInvoices';
import { format } from 'date-fns';

interface InvoiceDocumentProps {
  invoice: Invoice;
}

// Helper to convert numbers to words (simplified for OMR)
const numberToWords = (amount: number) => {
  const whole = Math.floor(amount);
  // Very simplified English conversion for the sake of the invoice model
  const units = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  if (whole <= 10) return `${units[whole]} Rials only`;
  return `${whole} Rials only`; // A robust converter would be larger, keeping it simple
};

export const InvoiceDocument = forwardRef<HTMLDivElement, InvoiceDocumentProps>(({ invoice }, ref) => {
  const isPaid = invoice.status === 'paid';
  const isQuotation = invoice.type === 'quotation';
  const themeColor = '#8b85f9'; // The purple/indigo color from the model

  return (
    <div ref={ref} className="bg-white text-black p-10 min-h-[1056px] w-[794px] max-w-full mx-auto shadow-2xl relative overflow-hidden font-sans text-[11px] leading-relaxed print:w-full print:min-h-0 print:h-auto print:shadow-none print:p-0 print:m-0 print:overflow-visible">
      
      {/* PAID Watermark Sticker */}
      {isPaid && (
        <div style={{ position: 'absolute', top: '35%', left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', transform: 'rotate(-12deg)', opacity: 0.12, pointerEvents: 'none', zIndex: 0 }}>
          <svg width="360" height="150" viewBox="0 0 360 150" style={{ overflow: 'visible' }}>
            <rect x="8" y="8" width="344" height="134" rx="28" ry="28" fill="none" stroke="#16a34a" strokeWidth="8" />
            <text x="180" y="75" textAnchor="middle" dominantBaseline="central" fill="#16a34a" fontSize="80" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="6">PAID</text>
          </svg>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start relative z-10 print:mb-2">
        <div>
          <h1 className="text-[13px] font-bold text-gray-900 mb-1">OSBIC INTERNATIONAL LLC (OMAN)</h1>
          <p>Building No: 271, Office No: 8, 99 Street, Al Jami Al Akbar Street,</p>
          <p>Muscat, Oman. Landmark ASAS SERVICE CENTER</p>
          <p>Ghala Industrial Area Muscat Sultanate of Oman</p>
          <p className="mt-1">Phone no. : +968 72596531, 72229827</p>
          <p>Email : Ayoob@osangroupoman.com</p>
        </div>
        
        {/* Blue OSBIC Box */}
        <div className="w-20 h-20 bg-[#0088cc] flex items-center justify-center text-white text-[10px] font-bold tracking-widest">
          OSBIC
        </div>
      </div>

      <div className="w-full border-t border-gray-300 mt-4 mb-4 print:my-2" />

      {/* Title */}
      <div className="text-center relative z-10 mb-6 print:mb-2">
        <h2 className="text-xl font-bold" style={{ color: themeColor }}>
          {isQuotation ? 'Quotation' : 'Invoice'}
        </h2>
      </div>

      {/* Client Info & Invoice Details */}
      <div className="flex justify-between items-start mb-6 print:mb-3 relative z-10">
        <div>
          <h3 className="font-bold text-gray-900 mb-2 print:mb-1">Bill To</h3>
          <p className="font-bold text-gray-900 text-xs">{invoice.client?.full_name || 'Client Name'}</p>
        </div>
        <div className="text-right">
          <h3 className="font-bold text-gray-900 mb-2 print:mb-1">Invoice Details</h3>
          <p><span className="text-gray-600">Invoice No. :</span> {invoice.invoice_number || 'DRAFT'}</p>
          <p><span className="text-gray-600">Date :</span> {format(new Date(invoice.issue_date || new Date()), 'dd-MM-yyyy')}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="relative z-10 mb-6 print:mb-3">
        <table className="w-full text-left border-collapse text-[11px] print:text-[10px]">
          <thead>
            <tr className="text-white font-bold" style={{ backgroundColor: themeColor }}>
              <th className="py-1 px-2 w-8">#</th>
              <th className="py-1 px-2">Service Name</th>
              <th className="py-1 px-2 text-center w-16">Quantity</th>
              <th className="py-1 px-2 text-right w-24">Price/ Unit</th>
              <th className="py-1 px-2 text-center w-16">VAT %</th>
              <th className="py-1 px-2 text-right w-24">Final Rate</th>
              <th className="py-1 px-2 text-right w-24">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-300">
                <td className="py-1.5 px-2 print:py-1">{idx + 1}</td>
                <td className="py-1.5 px-2 print:py-1 font-bold">{item.description}</td>
                <td className="py-1.5 px-2 print:py-1 text-center">{item.quantity}</td>
                <td className="py-1.5 px-2 print:py-1 text-right">OMR {item.unit_price.toFixed(3)}</td>
                <td className="py-1.5 px-2 print:py-1 text-center">{invoice.tax_percentage}%</td>
                <td className="py-1.5 px-2 print:py-1 text-right">{item.unit_price.toFixed(3)}</td>
                <td className="py-1.5 px-2 print:py-1 text-right">OMR {item.total.toFixed(3)}</td>
              </tr>
            ))}
            {(!invoice.items || invoice.items.length === 0) && (
              <tr>
                <td colSpan={7} className="py-3 text-center text-gray-400 italic">No items added yet.</td>
              </tr>
            )}
            {/* Total Row */}
            <tr className="border-b-2 border-black font-bold">
              <td className="py-1.5 px-2 print:py-1"></td>
              <td className="py-1.5 px-2 print:py-1">Total</td>
              <td className="py-1.5 px-2 print:py-1 text-center">{invoice.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}</td>
              <td className="py-1.5 px-2 print:py-1"></td>
              <td className="py-1.5 px-2 print:py-1"></td>
              <td className="py-1.5 px-2 print:py-1"></td>
              <td className="py-1.5 px-2 print:py-1 text-right">OMR {invoice.subtotal.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Description & Financial Summary Grid */}
      <div className="grid grid-cols-2 gap-8 relative z-10 mb-4 print:mb-2 text-[11px] print:text-[10px]">
        
        {/* Left Side: Description & Words */}
        <div className="space-y-2 print:space-y-1">
           <div>
             <h4 className="font-bold mb-1">Description</h4>
             <p className="text-gray-600 uppercase">{invoice.notes || ' '}</p>
           </div>
           <div>
             <h4 className="font-bold mb-1">Invoice Amount In Words</h4>
             <p className="text-gray-600">{numberToWords(invoice.total_amount)}</p>
           </div>
        </div>

        {/* Right Side: Totals Table */}
        <div className="w-full flex justify-end">
           <table className="w-full max-w-[250px] text-right">
             <tbody>
               <tr>
                 <td className="py-1 px-2 text-gray-600 print:py-0.5">Sub Total</td>
                 <td className="py-1 px-2 print:py-0.5">OMR {invoice.subtotal.toFixed(3)}</td>
               </tr>
               <tr className="text-white font-bold" style={{ backgroundColor: themeColor }}>
                 <td className="py-1 px-2 print:py-0.5">Total</td>
                 <td className="py-1 px-2 print:py-0.5">OMR {invoice.total_amount.toFixed(3)}</td>
               </tr>
               <tr>
                 <td className="py-1 px-2 text-gray-600 border-b border-gray-200 print:py-0.5">Received</td>
                 <td className="py-1 px-2 border-b border-gray-200 print:py-0.5">OMR {(isPaid ? invoice.total_amount : 0).toFixed(3)}</td>
               </tr>
               <tr>
                 <td className="py-1 px-2 text-gray-600 border-b border-gray-200 print:py-0.5">Balance</td>
                 <td className="py-1 px-2 border-b border-gray-200 print:py-0.5">OMR {(isPaid ? 0 : invoice.total_amount).toFixed(3)}</td>
               </tr>
               <tr>
                 <td className="py-1 px-2 text-gray-600 border-b border-gray-200 print:py-0.5">
                   {isPaid ? 'Payment mode' : 'Payment Terms'}
                 </td>
                 <td className="py-1 px-2 border-b border-gray-200 print:py-0.5">
                   {invoice.terms || (isPaid ? 'Bank Transfer' : 'Payment is due within 10 days.')}
                 </td>
               </tr>
             </tbody>
           </table>
        </div>

      </div>

      {/* Terms and Conditions */}
      <div className="relative z-10 space-y-1 mb-6 print:mb-2 text-[10px] print:text-[8.5px]">
        <h4 className="font-bold print:mb-0.5">Terms and Conditions</h4>
        <p className="mb-1 text-[10px] print:text-[8px] print:mb-0.5">Thanks for doing business with us!</p>
        
        <div className="space-y-0.5 leading-tight text-[10px] print:text-[8px]" dir="rtl" style={{ textAlign: 'right', fontFamily: 'Arial, sans-serif' }}>
          <p className="font-bold">ملاحظة: تم إنجاز المعاملة</p>
          <p>- عدم تحمل الشركة أي قرارات وزارية مفاجئة.</p>
          <p>- لن تتحمل الشركة أي تأخير صدر من قبل العميل.</p>
          <p>- لن يتم إسترجاع مبلغ المكتب إذا تم البدء في المعاملة.</p>
          <p>- لن يتحمل المكتب أي رسوم إضافية تفرض من قبل الحكومة.</p>
        </div>

        <div className="space-y-0.5 mt-2 print:mt-1 leading-tight text-[10px] print:text-[8px]">
          <p>The company shall not bear responsibility for any sudden ministerial decisions.</p>
          <p>- The company shall not be held liable for any delays caused by the client.</p>
          <p>- The clearance fee is non-refundable once the transaction has commenced.</p>
          <p>- The office will not bear any additional fees imposed by the government.</p>
        </div>
      </div>

      {/* Pay To & Signature Block */}
      <div className="grid grid-cols-2 gap-8 relative z-10 text-[10px] print:text-[8.5px]">
        <div>
          <h4 className="font-bold mb-1">Pay To:</h4>
          <div className="space-y-0.5 print:space-y-0">
            <p>Bank Name : BANK MUSCAT</p>
            <p>Bank Account No. : 0423081077790019</p>
            <p>Bank SWIFT code : BMUSOMRXXX</p>
            <p>Account holder's name : OSBIC INTERNATIONAL LLC</p>
            <p>IBAN : OM550270423081077790019</p>
          </div>
        </div>
        
        <div className="text-right flex flex-col justify-end pt-4 print:pt-1">
          <p className="mt-2 print:mt-0 font-bold">For :OSBIC INTERNATIONAL LLC (OMAN)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 mt-12 print:mt-4 relative z-10 text-center font-bold text-[10px] print:text-[8.5px]">
        <div>Customer Signatory</div>
        <div>Authorized Signatory</div>
      </div>

    </div>
  );
});

InvoiceDocument.displayName = 'InvoiceDocument';
