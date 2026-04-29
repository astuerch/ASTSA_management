/*
  Warnings:

  - The primary key for the `sage_exports` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `sage_exports` table. All the data in the column will be lost.
  - You are about to drop the column `entity_id` on the `sage_exports` table. All the data in the column will be lost.
  - You are about to drop the column `entity_type` on the `sage_exports` table. All the data in the column will be lost.
  - You are about to drop the column `export_type` on the `sage_exports` table. All the data in the column will be lost.
  - You are about to drop the column `exported_by_user_id` on the `sage_exports` table. All the data in the column will be lost.
  - You are about to drop the column `failure_reason` on the `sage_exports` table. All the data in the column will be lost.
  - You are about to drop the column `file_path` on the `sage_exports` table. All the data in the column will be lost.
  - Added the required column `batchNumber` to the `sage_exports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `csv_file_name` to the `sage_exports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exported_by_id` to the `sage_exports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoice_count` to the `sage_exports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_amount_cents` to the `sage_exports` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "accounting_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "updated_by_id" INTEGER
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
    CONSTRAINT "invoice_drafts_exported_batch_id_fkey" FOREIGN KEY ("exported_batch_id") REFERENCES "sage_exports" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invoice_drafts_from_intervention_id_fkey" FOREIGN KEY ("from_intervention_id") REFERENCES "interventions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_invoice_drafts" ("client_id", "created_at", "created_by_id", "currency", "document_date", "due_date", "exported_at", "exported_batch_id", "from_intervention_id", "from_quote_id", "id", "locale", "notes", "number", "payment_terms_days", "pdf_public_id", "pdf_url", "property_id", "sequence", "status", "subject", "subtotal_cents", "total_cents", "updated_at", "vat_total_cents", "year") SELECT "client_id", "created_at", "created_by_id", "currency", "document_date", "due_date", "exported_at", "exported_batch_id", "from_intervention_id", "from_quote_id", "id", "locale", "notes", "number", "payment_terms_days", "pdf_public_id", "pdf_url", "property_id", "sequence", "status", "subject", "subtotal_cents", "total_cents", "updated_at", "vat_total_cents", "year" FROM "invoice_drafts";
DROP TABLE "invoice_drafts";
ALTER TABLE "new_invoice_drafts" RENAME TO "invoice_drafts";
CREATE UNIQUE INDEX "invoice_drafts_number_key" ON "invoice_drafts"("number");
CREATE INDEX "idx_invoice_drafts_status" ON "invoice_drafts"("status");
CREATE INDEX "idx_invoice_drafts_client_id" ON "invoice_drafts"("client_id");
CREATE TABLE "new_sage_exports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchNumber" TEXT NOT NULL,
    "exported_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exported_by_id" INTEGER NOT NULL,
    "invoice_count" INTEGER NOT NULL,
    "total_amount_cents" INTEGER NOT NULL,
    "csv_file_name" TEXT NOT NULL,
    "zip_url" TEXT,
    "zip_public_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "imported_at" DATETIME,
    "imported_by_id" INTEGER,
    "notes" TEXT,
    CONSTRAINT "sage_exports_exported_by_id_fkey" FOREIGN KEY ("exported_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sage_exports_imported_by_id_fkey" FOREIGN KEY ("imported_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_sage_exports" ("exported_at", "id", "status") SELECT coalesce("exported_at", CURRENT_TIMESTAMP) AS "exported_at", "id", "status" FROM "sage_exports";
DROP TABLE "sage_exports";
ALTER TABLE "new_sage_exports" RENAME TO "sage_exports";
CREATE UNIQUE INDEX "sage_exports_batchNumber_key" ON "sage_exports"("batchNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "accounting_configs_key_key" ON "accounting_configs"("key");
