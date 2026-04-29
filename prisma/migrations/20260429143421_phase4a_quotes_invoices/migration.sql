/*
  Warnings:

  - The primary key for the `invoice_drafts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `intervention_id` on the `invoice_drafts` table. All the data in the column will be lost.
  - You are about to drop the column `report_id` on the `invoice_drafts` table. All the data in the column will be lost.
  - You are about to drop the column `tax_cents` on the `invoice_drafts` table. All the data in the column will be lost.
  - Added the required column `created_by_id` to the `invoice_drafts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `document_date` to the `invoice_drafts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `due_date` to the `invoice_drafts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `number` to the `invoice_drafts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequence` to the `invoice_drafts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject` to the `invoice_drafts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `invoice_drafts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "clients" ADD COLUMN "sage_customer_number" TEXT;

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoice_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "discount_cents" INTEGER NOT NULL DEFAULT 0,
    "vat_code" TEXT NOT NULL DEFAULT 'STANDARD',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "source_ref_id" TEXT,
    "net_amount_cents" INTEGER NOT NULL,
    "vat_amount_cents" INTEGER NOT NULL,
    "total_amount_cents" INTEGER NOT NULL,
    CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice_drafts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "client_id" INTEGER NOT NULL,
    "property_id" INTEGER,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOZZA',
    "valid_until" DATETIME,
    "notes" TEXT,
    "subtotal_cents" INTEGER NOT NULL DEFAULT 0,
    "vat_total_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "locale" TEXT NOT NULL DEFAULT 'it',
    "pdf_url" TEXT,
    "pdf_public_id" TEXT,
    "sent_at" DATETIME,
    "accepted_at" DATETIME,
    "rejected_at" DATETIME,
    "converted_to_invoice_id" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quotes_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quotes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quote_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quote_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "discount_cents" INTEGER NOT NULL DEFAULT 0,
    "vat_code" TEXT NOT NULL DEFAULT 'STANDARD',
    "net_amount_cents" INTEGER NOT NULL,
    "vat_amount_cents" INTEGER NOT NULL,
    "total_amount_cents" INTEGER NOT NULL,
    CONSTRAINT "quote_lines_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "vat_code" TEXT NOT NULL DEFAULT 'STANDARD',
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "numbering_counters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_invoice_drafts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "client_id" INTEGER NOT NULL,
    "property_id" INTEGER,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOZZA',
    "document_date" DATETIME NOT NULL,
    "due_date" DATETIME NOT NULL,
    "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "from_quote_id" TEXT,
    "from_intervention_id" INTEGER,
    "subtotal_cents" INTEGER NOT NULL DEFAULT 0,
    "vat_total_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "locale" TEXT NOT NULL DEFAULT 'it',
    "pdf_url" TEXT,
    "pdf_public_id" TEXT,
    "exported_at" DATETIME,
    "exported_batch_id" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "invoice_drafts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoice_drafts_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invoice_drafts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoice_drafts_from_intervention_id_fkey" FOREIGN KEY ("from_intervention_id") REFERENCES "interventions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- NOTE: no data migration needed (table was empty in dev; phase 4a introduces new structure)
DROP TABLE "invoice_drafts";
ALTER TABLE "new_invoice_drafts" RENAME TO "invoice_drafts";
CREATE UNIQUE INDEX "invoice_drafts_number_key" ON "invoice_drafts"("number");
CREATE INDEX "idx_invoice_drafts_status" ON "invoice_drafts"("status");
CREATE INDEX "idx_invoice_drafts_client_id" ON "invoice_drafts"("client_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "idx_invoice_lines_invoice_id" ON "invoice_lines"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_number_key" ON "quotes"("number");

-- CreateIndex
CREATE INDEX "idx_quotes_client_id" ON "quotes"("client_id");

-- CreateIndex
CREATE INDEX "idx_quotes_status" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "idx_quote_lines_quote_id" ON "quote_lines"("quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_list_items_code_key" ON "price_list_items"("code");

-- CreateIndex
CREATE INDEX "idx_price_list_active" ON "price_list_items"("active");

-- CreateIndex
CREATE UNIQUE INDEX "numbering_counters_prefix_year_key" ON "numbering_counters"("prefix", "year");
