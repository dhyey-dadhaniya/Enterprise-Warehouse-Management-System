-- Rename document type PO -> PURCHASE_ORDER for clarity
ALTER TABLE inbound_documents DROP CONSTRAINT chk_inbound_document_type;
UPDATE inbound_documents SET document_type = 'PURCHASE_ORDER' WHERE document_type = 'PO';
ALTER TABLE inbound_documents ADD CONSTRAINT chk_inbound_document_type
    CHECK (document_type IN ('ASN', 'PURCHASE_ORDER'));
