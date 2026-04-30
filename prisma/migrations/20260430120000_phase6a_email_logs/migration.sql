-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "cc_emails" TEXT,
    "subject" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'it',
    "error_message" TEXT,
    "provider_message_id" TEXT,
    "attachment_name" TEXT,
    "sent_by_id" INTEGER NOT NULL,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_logs_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "idx_email_logs_type" ON "email_logs"("type");

-- CreateIndex
CREATE INDEX "idx_email_logs_status" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "idx_email_logs_sent_at" ON "email_logs"("sent_at");

-- CreateIndex
CREATE INDEX "idx_email_logs_reference_id" ON "email_logs"("reference_id");
