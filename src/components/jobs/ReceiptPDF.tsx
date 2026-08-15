import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';

// ─── STYLING (Neo-Brutalist Industrial) ──────────────────────────────
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    color: '#0A0F1E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    borderBottom: '4pt solid #0A0F1E',
    paddingBottom: 20,
  },
  logoSection: {
    flexDirection: 'column',
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -1,
    color: '#0A0F1E',
  },
  subLogo: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: '#3B82F6',
    fontWeight: 'bold',
    marginTop: 2,
  },
  receiptMeta: {
    textAlign: 'right',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  label: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#888',
    marginBottom: 2,
  },
  value: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  section: {
    marginBottom: 30,
  },
  billTo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#F4F4F4',
    border: '2pt solid #0A0F1E',
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0A0F1E',
    padding: 10,
    color: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #EEEEEE',
    padding: 12,
    alignItems: 'center',
  },
  colDesc: { flex: 3, fontSize: 10, fontWeight: 'bold' },
  colQty: { flex: 1, textAlign: 'center', fontSize: 10 },
  colPrice: { flex: 1, textAlign: 'right', fontSize: 10 },
  colTotal: { flex: 1, textAlign: 'right', fontSize: 10, fontWeight: 'bold' },
  totals: {
    marginTop: 20,
    borderTop: '2pt solid #0A0F1E',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: 5,
  },
  grandTotal: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#3B82F6',
    color: '#0A0F1E',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 250,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTop: '1pt solid #EEEEEE',
    paddingTop: 20,
  },
  bankInfo: {
    fontSize: 8,
    color: '#888',
    lineHeight: 1.5,
  },
  stamp: {
    position: 'absolute',
    top: 150,
    right: 50,
    border: '4pt solid #00C853',
    color: '#00C853',
    padding: 10,
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    transform: 'rotate(-15deg)',
    opacity: 0.5,
  }
});

interface ReceiptProps {
  job: any;
  type?: 'advance' | 'remaining' | 'full';
  date?: string;
  paymentAmount?: number;
}

const ReceiptPDF = ({ job, type, date = format(new Date(), 'dd MMMM yyyy'), paymentAmount }: ReceiptProps) => {
  const isPaid = true;
  
  const subtotal = paymentAmount ? Number(paymentAmount) : Number(job.total_fee);
  const vat = 0; // Receipts usually show the exact amount paid; we'll leave VAT 0 for the receipt of partials unless specified.
  const grandTotal = subtotal;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Paid Stamp */}
        {isPaid && (
          <View style={styles.stamp}>
            <Text>PAID</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Text style={styles.logo}>OSBIC CONNECT</Text>
            <Text style={styles.subLogo}>Operational Service Blueprint</Text>
          </View>
          <View style={styles.receiptMeta}>
            <Text style={styles.title}>PAYMENT RECEIPT</Text>
            <Text style={styles.label}>PAYMENT RECEIPT Number</Text>
            <Text style={styles.value}>INV-{job.job_code}-{type.toUpperCase().slice(0, 3)}</Text>
            <Text style={styles.label}>Date of Issue</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.section}>
          <View style={styles.billTo}>
            <View>
              <Text style={styles.label}>Billed To:</Text>
              <Text style={styles.value}>{job.client_name || 'Client ID: ' + job.client_id}</Text>
              <Text style={{ fontSize: 9, color: '#666' }}>Oman Territory</Text>
            </View>
            <View style={{ textAlign: 'right' }}>
              <Text style={styles.label}>Project Ref:</Text>
              <Text style={styles.value}>{job.service_name}</Text>
              <Text style={{ fontSize: 9, color: '#666' }}>{job.job_code}</Text>
            </View>
          </View>
        </View>

        {/* Item Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>DESCRIPTION</Text>
            <Text style={styles.colQty}>QTY</Text>
            <Text style={styles.colPrice}>RATE</Text>
            <Text style={styles.colTotal}>AMOUNT</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colDesc}>
              {job.service_name} 
              {type === 'advance' ? ' (Advance Payment 50%)' : (type === 'remaining' ? ' (Final Balance Settlement)' : '')}
            </Text>
            <Text style={styles.colQty}>1</Text>
            <Text style={styles.colPrice}>{subtotal.toLocaleString()} OMR</Text>
            <Text style={styles.colTotal}>{subtotal.toLocaleString()} OMR</Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={{ fontSize: 10, color: '#666' }}>Subtotal:</Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{subtotal.toLocaleString()} OMR</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ fontSize: 10, color: '#666' }}>VAT (5%):</Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{vat.toLocaleString()} OMR</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' }}>Grand Total:</Text>
            <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{grandTotal.toLocaleString()} OMR</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.bankInfo}>
            OSBIC CONNECT - MUSCAT OFFICE | SULTANATE OF OMAN{"\n"}
            BANK: MUSCAT BANK | IBAN: OMXX XXXX XXXX XXXX XXXX XXXX{"\n"}
            TERMS: Please pay within 7 days. This is a computer-generated document.
          </Text>
          <View style={{ marginTop: 20, borderTop: '2pt solid #3B82F6', paddingTop: 10 }}>
            <Text style={{ fontSize: 7, textTransform: 'uppercase', color: '#AAA', letterSpacing: 2 }}>
              Powered by OSBIC Service Lifecycle Management Platform
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptPDF;
