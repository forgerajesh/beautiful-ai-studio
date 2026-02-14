const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DB_PATH || path.join(__dirname, 'qa_builder_v2.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDb() {
  await run(`CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    data_json TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    workflow_state TEXT DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS board_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    data_json TEXT NOT NULL,
    summary TEXT DEFAULT '',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(board_id) REFERENCES boards(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(board_id) REFERENCES boards(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS workflow_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    from_state TEXT,
    to_state TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(board_id) REFERENCES boards(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS jira_sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER,
    direction TEXT NOT NULL,
    mode TEXT NOT NULL,
    status TEXT NOT NULL,
    details_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(board_id) REFERENCES boards(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS collab_state (
    board_id INTEGER PRIMARY KEY,
    server_version INTEGER NOT NULL DEFAULT 0,
    last_patch_hash TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(board_id) REFERENCES boards(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS collab_ops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    op_id TEXT NOT NULL,
    actor TEXT,
    base_version INTEGER DEFAULT 0,
    op_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(board_id, op_id),
    FOREIGN KEY(board_id) REFERENCES boards(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS orgs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS provisioned_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL,
    auth_source TEXT NOT NULL,
    external_subject TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(org_id, email),
    FOREIGN KEY(org_id) REFERENCES orgs(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS provisioning_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER,
    email TEXT,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    details_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(org_id) REFERENCES orgs(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS sso_configs (
    provider TEXT PRIMARY KEY,
    protocol TEXT NOT NULL,
    issuer TEXT NOT NULL,
    client_id TEXT NOT NULL,
    client_secret TEXT,
    metadata_url TEXT,
    enabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS governance_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    stages_json TEXT NOT NULL,
    sla_hours INTEGER NOT NULL DEFAULT 24,
    exception_allowed INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS governance_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    policy_id INTEGER NOT NULL,
    current_stage_index INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(board_id) REFERENCES boards(id),
    FOREIGN KEY(policy_id) REFERENCES governance_policies(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS governance_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    actor TEXT NOT NULL,
    notes TEXT,
    sla_due_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(instance_id) REFERENCES governance_instances(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS marketplace_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    tags_json TEXT,
    approval_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS marketplace_template_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    version TEXT NOT NULL,
    board_data_json TEXT NOT NULL,
    changelog TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(template_id) REFERENCES marketplace_templates(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS marketplace_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(template_id) REFERENCES marketplace_templates(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS integration_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    direction TEXT NOT NULL,
    mapping_json TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(board_id, provider),
    FOREIGN KEY(board_id) REFERENCES boards(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS integration_sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(board_id) REFERENCES boards(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS integration_conflict_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    queue_id INTEGER NOT NULL,
    board_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    conflict_json TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(queue_id) REFERENCES integration_sync_queue(id),
    FOREIGN KEY(board_id) REFERENCES boards(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS compliance_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    framework TEXT NOT NULL,
    control_id TEXT NOT NULL,
    control_title TEXT,
    mapping_status TEXT NOT NULL,
    evidence_links_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(board_id) REFERENCES boards(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS integration_settings (
    provider TEXT PRIMARY KEY,
    base_url TEXT NOT NULL,
    project_key TEXT,
    api_version TEXT,
    enabled INTEGER NOT NULL DEFAULT 0,
    field_mapping_json TEXT,
    secret_refs_json TEXT,
    updated_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
}

module.exports = { db, run, get, all, initDb };
