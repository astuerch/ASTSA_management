/*
  Warnings:

  - The primary key for the `intervention_materials` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `id` to the `intervention_materials` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN "team_id" INTEGER;

-- CreateTable
CREATE TABLE "intervention_audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "intervention_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "changed_field" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "intervention_audit_logs_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "intervention_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_intervention_materials" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "intervention_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "quantity" REAL NOT NULL,
    "unit_cost_cents" INTEGER,
    "notes" TEXT,
    "billable_separately" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "intervention_materials_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "intervention_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_intervention_materials" ("billable_separately", "intervention_id", "material_id", "quantity") SELECT "billable_separately", "intervention_id", "material_id", "quantity" FROM "intervention_materials";
DROP TABLE "intervention_materials";
ALTER TABLE "new_intervention_materials" RENAME TO "intervention_materials";
CREATE TABLE "new_intervention_photos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "intervention_id" INTEGER NOT NULL,
    "photo_type" TEXT NOT NULL DEFAULT 'OTHER',
    "kind" TEXT NOT NULL DEFAULT 'DOPO',
    "file_path" TEXT,
    "url" TEXT NOT NULL DEFAULT '',
    "public_id" TEXT,
    "uploaded_by_id" INTEGER,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "intervention_photos_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "intervention_photos_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_intervention_photos" ("created_at", "file_path", "id", "intervention_id", "photo_type") SELECT "created_at", "file_path", "id", "intervention_id", "photo_type" FROM "intervention_photos";
DROP TABLE "intervention_photos";
ALTER TABLE "new_intervention_photos" RENAME TO "intervention_photos";
CREATE TABLE "new_intervention_workers" (
    "intervention_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "is_lead" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("intervention_id", "user_id"),
    CONSTRAINT "intervention_workers_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "intervention_workers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_intervention_workers" ("intervention_id", "user_id") SELECT "intervention_id", "user_id" FROM "intervention_workers";
DROP TABLE "intervention_workers";
ALTER TABLE "new_intervention_workers" RENAME TO "intervention_workers";
CREATE TABLE "new_interventions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "property_id" INTEGER NOT NULL,
    "service_id" INTEGER,
    "created_by_user_id" INTEGER NOT NULL,
    "intervention_type" TEXT NOT NULL DEFAULT 'ORDINARY',
    "work_type" TEXT NOT NULL DEFAULT 'ORDINARIO',
    "status" TEXT NOT NULL DEFAULT 'IN_CORSO',
    "starts_at" DATETIME,
    "ends_at" DATETIME,
    "started_at" DATETIME,
    "ended_at" DATETIME,
    "duration_minutes" INTEGER,
    "notes" TEXT,
    "anomaly_report" TEXT,
    "anomaly" TEXT,
    "is_billable_extra" BOOLEAN NOT NULL DEFAULT false,
    "is_extra" BOOLEAN NOT NULL DEFAULT false,
    "validated_by_office" BOOLEAN NOT NULL DEFAULT false,
    "ready_for_sage" BOOLEAN NOT NULL DEFAULT false,
    "start_lat" REAL,
    "start_lng" REAL,
    "start_accuracy" REAL,
    "end_lat" REAL,
    "end_lng" REAL,
    "client_signature_url" TEXT,
    "client_signer_name" TEXT,
    "validated_by_id" INTEGER,
    "validated_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "interventions_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "interventions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "interventions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "interventions_validated_by_id_fkey" FOREIGN KEY ("validated_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_interventions" ("anomaly_report", "created_at", "created_by_user_id", "ends_at", "id", "intervention_type", "is_billable_extra", "notes", "property_id", "ready_for_sage", "service_id", "starts_at", "updated_at", "validated_by_office") SELECT "anomaly_report", "created_at", "created_by_user_id", "ends_at", "id", "intervention_type", "is_billable_extra", "notes", "property_id", "ready_for_sage", "service_id", "starts_at", "updated_at", "validated_by_office" FROM "interventions";
DROP TABLE "interventions";
ALTER TABLE "new_interventions" RENAME TO "interventions";
CREATE INDEX "idx_interventions_property_id" ON "interventions"("property_id");
CREATE INDEX "idx_interventions_ready_for_sage" ON "interventions"("ready_for_sage");
CREATE INDEX "idx_interventions_status" ON "interventions"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "idx_audit_logs_intervention_id" ON "intervention_audit_logs"("intervention_id");
