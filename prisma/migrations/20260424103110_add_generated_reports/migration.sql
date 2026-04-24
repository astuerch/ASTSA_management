-- CreateTable
CREATE TABLE "generated_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "variant" TEXT,
    "intervention_id" INTEGER,
    "property_id" INTEGER,
    "worker_id" INTEGER,
    "period_from" DATETIME,
    "period_to" DATETIME,
    "pdf_url" TEXT NOT NULL,
    "pdf_public_id" TEXT,
    "generated_by_id" INTEGER NOT NULL,
    "generated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "generated_reports_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "idx_generated_reports_kind" ON "generated_reports"("kind");

-- CreateIndex
CREATE INDEX "idx_generated_reports_generated_by" ON "generated_reports"("generated_by_id");
