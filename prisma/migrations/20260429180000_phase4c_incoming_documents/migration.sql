-- CreateTable
CREATE TABLE "incoming_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DA_VALIDARE',
    "file_url" TEXT NOT NULL,
    "file_public_id" TEXT,
    "mime_type" TEXT,
    "raw_ocr_data" TEXT,
    "extracted" TEXT,
    "verified_data" TEXT,
    "ocr_confidence" REAL,
    "ocr_provider" TEXT,
    "supplier_name" TEXT,
    "supplier_vat" TEXT,
    "doc_number" TEXT,
    "doc_date" DATETIME,
    "due_date" DATETIME,
    "currency" TEXT DEFAULT 'CHF',
    "subtotal_cents" INTEGER,
    "vat_cents" INTEGER,
    "total_cents" INTEGER,
    "iban" TEXT,
    "client_id" INTEGER,
    "property_id" INTEGER,
    "intervention_id" INTEGER,
    "category" TEXT,
    "notes" TEXT,
    "discard_reason" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "validated_by_id" INTEGER,
    "validated_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "incoming_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "incoming_documents_validated_by_id_fkey" FOREIGN KEY ("validated_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "incoming_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "incoming_documents_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "incoming_documents_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "idx_incoming_documents_status" ON "incoming_documents"("status");

-- CreateIndex
CREATE INDEX "idx_incoming_documents_type" ON "incoming_documents"("type");

-- CreateIndex
CREATE INDEX "idx_incoming_documents_doc_date" ON "incoming_documents"("doc_date");

-- CreateIndex
CREATE INDEX "idx_incoming_documents_client_id" ON "incoming_documents"("client_id");
