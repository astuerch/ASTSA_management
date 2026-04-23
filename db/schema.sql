PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  role_id INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  hourly_cost_cents INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_name TEXT,
  billing_email TEXT,
  billing_address TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY,
  client_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  service_frequency TEXT,
  operational_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  billing_mode TEXT NOT NULL CHECK (billing_mode IN ('CONTRACT', 'EXTRA', 'BOTH')),
  default_hourly_rate_cents INTEGER,
  default_unit_rate_cents INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS custody_contracts (
  id INTEGER PRIMARY KEY,
  client_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  -- Number of planned service executions per week (1..7).
  weekly_frequency INTEGER CHECK (weekly_frequency IS NULL OR (weekly_frequency >= 1 AND weekly_frequency <= 7)),
  expected_hours_monthly REAL,
  monthly_price_cents INTEGER NOT NULL,
  included_services TEXT,
  excluded_services TEXT,
  starts_on TEXT,
  ends_on TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (property_id) REFERENCES properties(id)
);

CREATE TABLE IF NOT EXISTS interventions (
  id INTEGER PRIMARY KEY,
  property_id INTEGER NOT NULL,
  service_id INTEGER,
  created_by_user_id INTEGER NOT NULL,
  intervention_type TEXT NOT NULL CHECK (intervention_type IN ('ORDINARY', 'EXTRA', 'EMERGENCY')),
  starts_at TEXT,
  ends_at TEXT,
  notes TEXT,
  anomaly_report TEXT,
  is_billable_extra INTEGER NOT NULL DEFAULT 0,
  validated_by_office INTEGER NOT NULL DEFAULT 0,
  ready_for_sage INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id),
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS intervention_workers (
  intervention_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (intervention_id, user_id),
  FOREIGN KEY (intervention_id) REFERENCES interventions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS intervention_photos (
  id INTEGER PRIMARY KEY,
  intervention_id INTEGER NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('BEFORE', 'AFTER', 'OTHER')),
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (intervention_id) REFERENCES interventions(id)
);

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_cost_cents INTEGER NOT NULL,
  stock_quantity REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS intervention_materials (
  intervention_id INTEGER NOT NULL,
  material_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  billable_separately INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (intervention_id, material_id),
  FOREIGN KEY (intervention_id) REFERENCES interventions(id),
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

CREATE TABLE IF NOT EXISTS work_reports (
  id INTEGER PRIMARY KEY,
  intervention_id INTEGER NOT NULL UNIQUE,
  internal_summary TEXT,
  client_summary TEXT,
  employee_total_minutes INTEGER,
  customer_signature_name TEXT,
  pdf_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (intervention_id) REFERENCES interventions(id)
);

CREATE TABLE IF NOT EXISTS contract_controls (
  id INTEGER PRIMARY KEY,
  contract_id INTEGER NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  expected_hours REAL NOT NULL,
  actual_hours REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (contract_id) REFERENCES custody_contracts(id)
);

CREATE TABLE IF NOT EXISTS invoice_drafts (
  id INTEGER PRIMARY KEY,
  client_id INTEGER NOT NULL,
  intervention_id INTEGER,
  report_id INTEGER,
  subtotal_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'VALIDATED', 'EXPORTED_TO_SAGE')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (intervention_id IS NOT NULL AND report_id IS NULL)
    OR
    (intervention_id IS NULL AND report_id IS NOT NULL)
  ),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (intervention_id) REFERENCES interventions(id),
  FOREIGN KEY (report_id) REFERENCES work_reports(id)
);

CREATE TABLE IF NOT EXISTS sage_exports (
  id INTEGER PRIMARY KEY,
  export_type TEXT NOT NULL CHECK (export_type IN ('CSV', 'EXCEL', 'PDF')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('INVOICE_DRAFT', 'REPORT', 'CONTRACT_CONTROL')),
  entity_id INTEGER NOT NULL,
  exported_by_user_id INTEGER,
  exported_at TEXT,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  failure_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (exported_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_properties_client_id ON properties(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_property_id ON custody_contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_interventions_property_id ON interventions(property_id);
CREATE INDEX IF NOT EXISTS idx_interventions_ready_for_sage ON interventions(ready_for_sage);
CREATE INDEX IF NOT EXISTS idx_invoice_drafts_status ON invoice_drafts(status);
CREATE INDEX IF NOT EXISTS idx_contract_controls_contract_id ON contract_controls(contract_id);
