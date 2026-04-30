-- AlterTable: aggiungiamo i campi retry e parent_log_id su email_logs
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_email_logs" (
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
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" DATETIME,
    "parent_log_id" TEXT,
    "sent_by_id" INTEGER NOT NULL,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_logs_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "email_logs_parent_log_id_fkey" FOREIGN KEY ("parent_log_id") REFERENCES "email_logs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_email_logs" (
    "id", "type", "status", "reference_id", "recipient_email", "cc_emails",
    "subject", "locale", "error_message", "provider_message_id", "attachment_name",
    "sent_by_id", "sent_at"
)
SELECT
    "id", "type", "status", "reference_id", "recipient_email", "cc_emails",
    "subject", "locale", "error_message", "provider_message_id", "attachment_name",
    "sent_by_id", "sent_at"
FROM "email_logs";

DROP TABLE "email_logs";
ALTER TABLE "new_email_logs" RENAME TO "email_logs";

CREATE INDEX "idx_email_logs_type" ON "email_logs"("type");
CREATE INDEX "idx_email_logs_status" ON "email_logs"("status");
CREATE INDEX "idx_email_logs_sent_at" ON "email_logs"("sent_at");
CREATE INDEX "idx_email_logs_reference_id" ON "email_logs"("reference_id");
CREATE INDEX "idx_email_logs_next_retry_at" ON "email_logs"("next_retry_at");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
