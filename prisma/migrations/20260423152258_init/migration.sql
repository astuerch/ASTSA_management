-- CreateTable
CREATE TABLE "roles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "role_id" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL DEFAULT '',
    "hourly_cost_cents" INTEGER,
    "qualifications" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clients" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "business_name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'AMMINISTRAZIONE',
    "billing_address" TEXT,
    "billing_email" TEXT,
    "phone" TEXT,
    "contact_name" TEXT,
    "notes" TEXT,
    "special_conditions" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "properties" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "client_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "service_frequency" TEXT,
    "expected_weekly_hours" REAL,
    "operational_notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "properties_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "services" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'ORDINARIO',
    "unit" TEXT NOT NULL DEFAULT 'ora',
    "billing_mode" TEXT NOT NULL DEFAULT 'BOTH',
    "default_hourly_rate_cents" INTEGER,
    "default_unit_rate_cents" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "custody_contracts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "client_id" INTEGER NOT NULL,
    "property_id" INTEGER NOT NULL,
    "weekly_frequency" INTEGER,
    "expected_hours_monthly" REAL,
    "monthly_price_cents" INTEGER NOT NULL,
    "included_services" TEXT,
    "excluded_services" TEXT,
    "starts_on" DATETIME,
    "ends_on" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "custody_contracts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "custody_contracts_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "custody_contract_services" (
    "contract_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,

    PRIMARY KEY ("contract_id", "service_id"),
    CONSTRAINT "custody_contract_services_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "custody_contracts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "custody_contract_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "interventions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "property_id" INTEGER NOT NULL,
    "service_id" INTEGER,
    "created_by_user_id" INTEGER NOT NULL,
    "intervention_type" TEXT NOT NULL,
    "starts_at" DATETIME,
    "ends_at" DATETIME,
    "notes" TEXT,
    "anomaly_report" TEXT,
    "is_billable_extra" BOOLEAN NOT NULL DEFAULT false,
    "validated_by_office" BOOLEAN NOT NULL DEFAULT false,
    "ready_for_sage" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "interventions_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "interventions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "interventions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "intervention_workers" (
    "intervention_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    PRIMARY KEY ("intervention_id", "user_id"),
    CONSTRAINT "intervention_workers_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "intervention_workers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "intervention_photos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "intervention_id" INTEGER NOT NULL,
    "photo_type" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "intervention_photos_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "materials" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_cost_cents" INTEGER NOT NULL,
    "stock_quantity" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "intervention_materials" (
    "intervention_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "quantity" REAL NOT NULL,
    "billable_separately" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("intervention_id", "material_id"),
    CONSTRAINT "intervention_materials_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "intervention_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "work_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "intervention_id" INTEGER NOT NULL,
    "internal_summary" TEXT,
    "client_summary" TEXT,
    "employee_total_minutes" INTEGER,
    "customer_signature_name" TEXT,
    "pdf_path" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_reports_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contract_controls" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contract_id" INTEGER NOT NULL,
    "period_start" DATETIME NOT NULL,
    "period_end" DATETIME NOT NULL,
    "expected_hours" REAL NOT NULL,
    "actual_hours" REAL NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_controls_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "custody_contracts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoice_drafts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "client_id" INTEGER NOT NULL,
    "intervention_id" INTEGER,
    "report_id" INTEGER,
    "subtotal_cents" INTEGER NOT NULL,
    "tax_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "invoice_drafts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoice_drafts_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invoice_drafts_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "work_reports" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sage_exports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "export_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "exported_by_user_id" INTEGER,
    "exported_at" DATETIME,
    "file_path" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "failure_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sage_exports_exported_by_user_id_fkey" FOREIGN KEY ("exported_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_properties_client_id" ON "properties"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_code_key" ON "services"("code");

-- CreateIndex
CREATE INDEX "idx_contracts_property_id" ON "custody_contracts"("property_id");

-- CreateIndex
CREATE INDEX "idx_interventions_property_id" ON "interventions"("property_id");

-- CreateIndex
CREATE INDEX "idx_interventions_ready_for_sage" ON "interventions"("ready_for_sage");

-- CreateIndex
CREATE UNIQUE INDEX "materials_code_key" ON "materials"("code");

-- CreateIndex
CREATE UNIQUE INDEX "work_reports_intervention_id_key" ON "work_reports"("intervention_id");

-- CreateIndex
CREATE INDEX "idx_contract_controls_contract_id" ON "contract_controls"("contract_id");

-- CreateIndex
CREATE INDEX "idx_invoice_drafts_status" ON "invoice_drafts"("status");
