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
    <div ref={ref} className="bg-white text-black p-10 min-h-[1056px] w-[794px] max-w-full mx-auto shadow-2xl relative overflow-hidden font-sans text-[11px] leading-relaxed print:w-[210mm] print:min-h-[297mm] print:m-0 print:shadow-none print:p-10">
      
      {/* PAID Watermark Sticker */}
      {isPaid && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-10 pointer-events-none z-0">
          <div className="border-8 border-green-600 rounded-3xl p-6 text-8xl font-black text-green-600 tracking-widest uppercase">
            PAID
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start relative z-10">
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

      <div className="w-full border-t border-gray-300 mt-4 mb-4" />

      {/* Title */}
      <div className="text-center relative z-10 mb-6">
        <h2 className="text-xl font-bold" style={{ color: themeColor }}>
          {isQuotation ? 'Quotation' : 'Invoice'}
        </h2>
      </div>

      {/* Client Info & Invoice Details */}
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <h3 className="font-bold text-gray-900 mb-2">Bill To</h3>
          <p className="font-bold text-gray-900 text-xs">{invoice.client?.full_name || 'Client Name'}</p>
        </div>
        <div className="text-right">
          <h3 className="font-bold text-gray-900 mb-2">Invoice Details</h3>
          <p><span className="text-gray-600">Invoice No. :</span> {invoice.invoice_number || 'DRAFT'}</p>
          <p><span className="text-gray-600">Date :</span> {format(new Date(invoice.issue_date || new Date()), 'dd-MM-yyyy')}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="relative z-10 mb-6">
        <table className="w-full text-left border-collapse">
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
                <td className="py-1.5 px-2">{idx + 1}</td>
                <td className="py-1.5 px-2 font-bold">{item.description}</td>
                <td className="py-1.5 px-2 text-center">{item.quantity}</td>
                <td className="py-1.5 px-2 text-right">OMR {item.unit_price.toFixed(3)}</td>
                <td className="py-1.5 px-2 text-center">{invoice.tax_percentage}%</td>
                <td className="py-1.5 px-2 text-right">{item.unit_price.toFixed(3)}</td>
                <td className="py-1.5 px-2 text-right">OMR {item.total.toFixed(3)}</td>
              </tr>
            ))}
            {(!invoice.items || invoice.items.length === 0) && (
              <tr>
                <td colSpan={7} className="py-3 text-center text-gray-400 italic">No items added yet.</td>
              </tr>
            )}
            {/* Total Row */}
            <tr className="border-b-2 border-black font-bold">
              <td className="py-1.5 px-2"></td>
              <td className="py-1.5 px-2">Total</td>
              <td className="py-1.5 px-2 text-center">{invoice.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}</td>
              <td className="py-1.5 px-2"></td>
              <td className="py-1.5 px-2"></td>
              <td className="py-1.5 px-2"></td>
              <td className="py-1.5 px-2 text-right">OMR {invoice.subtotal.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Description & Financial Summary Grid */}
      <div className="grid grid-cols-2 gap-8 relative z-10 mb-4">
        
        {/* Left Side: Description & Words */}
        <div className="space-y-2">
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
                 <td className="py-1 px-2 text-gray-600">Sub Total</td>
                 <td className="py-1 px-2">OMR {invoice.subtotal.toFixed(3)}</td>
               </tr>
               <tr className="text-white font-bold" style={{ backgroundColor: themeColor }}>
                 <td className="py-1 px-2">Total</td>
                 <td className="py-1 px-2">OMR {invoice.total_amount.toFixed(3)}</td>
               </tr>
               <tr>
                 <td className="py-1 px-2 text-gray-600 border-b border-gray-200">Received</td>
                 <td className="py-1 px-2 border-b border-gray-200">OMR {(isPaid ? invoice.total_amount : 0).toFixed(3)}</td>
               </tr>
               <tr>
                 <td className="py-1 px-2 text-gray-600 border-b border-gray-200">Balance</td>
                 <td className="py-1 px-2 border-b border-gray-200">OMR {(isPaid ? 0 : invoice.total_amount).toFixed(3)}</td>
               </tr>
               <tr>
                 <td className="py-1 px-2 text-gray-600 border-b border-gray-200">Payment mode</td>
                 <td className="py-1 px-2 border-b border-gray-200">{invoice.terms || 'Credit'}</td>
               </tr>
             </tbody>
           </table>
        </div>

      </div>

      {/* Terms and Conditions */}
      <div className="relative z-10 space-y-1 mb-6">
        <h4 className="font-bold">Terms and Conditions</h4>
        <p className="mb-1 text-[10px]">Thanks for doing business with us!</p>
        
        <div className="space-y-0.5 leading-tight text-[10px]" dir="rtl" style={{ textAlign: 'right', fontFamily: 'Arial, sans-serif' }}>
          <p className="font-bold">ملاحظة: تم إنجاز المعاملة</p>
          <p>- عدم تحمل الشركة أي قرارات وزارية مفاجئة.</p>
          <p>- لن تتحمل الشركة أي تأخير صدر من قبل العميل.</p>
          <p>- لن يتم إسترجاع مبلغ المكتب إذا تم البدء في المعاملة.</p>
          <p>- لن يتحمل المكتب أي رسوم إضافية تفرض من قبل الحكومة.</p>
        </div>

        <div className="space-y-0.5 mt-2 leading-tight text-[10px]">
          <p>The company shall not bear responsibility for any sudden ministerial decisions.</p>
          <p>- The company shall not be held liable for any delays caused by the client.</p>
          <p>- The clearance fee is non-refundable once the transaction has commenced.</p>
          <p>- The office will not bear any additional fees imposed by the government.</p>
        </div>
      </div>

      {/* Pay To & Signature Block */}
      <div className="grid grid-cols-2 gap-8 relative z-10 text-[10px]">
        <div>
          <h4 className="font-bold mb-1">Pay To:</h4>
          <div className="space-y-0.5">
            <p>Bank Name : BANK MUSCAT</p>
            <p>Bank Account No. : 0423081077790019</p>
            <p>Bank SWIFT code : BMUSOMRXXX</p>
            <p>Account holder's name : OSBIC INTERNATIONAL LLC</p>
            <p>IBAN : OM550270423081077790019</p>
          </div>
        </div>
        
        <div className="text-right flex flex-col justify-end pt-4">
          <p className="mt-2 font-bold">For :OSBIC INTERNATIONAL LLC (OMAN)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 mt-12 relative z-10 text-center font-bold text-[10px]">
        <div>Customer Signatory</div>
        <div>Authorized Signatory</div>
      </div>

    </div>
  );
});

InvoiceDocument.displayName = 'InvoiceDocument';
