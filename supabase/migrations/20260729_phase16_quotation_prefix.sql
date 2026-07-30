-- Migration to distinguish quotation codes (QTN-) from invoice codes (INV-)
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix TEXT;
    seq_number INT;
BEGIN
    IF NEW.type = 'quotation' THEN
        year_prefix := 'QTN-' || to_char(coalesce(NEW.created_at, now()), 'YYYY') || '-';
    ELSE
        year_prefix := 'INV-' || to_char(coalesce(NEW.created_at, now()), 'YYYY') || '-';
    END IF;
    
    SELECT COUNT(*) + 1 INTO seq_number
    FROM public.invoices
    WHERE invoice_number LIKE year_prefix || '%';
    
    NEW.invoice_number := year_prefix || lpad(seq_number::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
