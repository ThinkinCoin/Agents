import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(process.cwd(), 'data', 'agent-smith.db');
const DB_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

export type ActionRecord = {
  id?: number;
  timestamp: string;
  type: string;
  text: string;
  rationale?: string;
  policy_result?: string;
  published?: number;
};

/**
 * Memory layer: attempts to use better-sqlite3; if unavailable, falls back to in-memory store.
 */
export class Memory {
  private db: any | null = null;
  private inMemoryActions: ActionRecord[] = [];
  private inMemoryAudit: { timestamp: string; event: string; metadata: string }[] = [];

  constructor(dbPath = DB_PATH) {
    try {
      // Dynamically require to avoid early crash when native module missing
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Database = require('better-sqlite3');
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');
      this.migrate();
    } catch (e) {
      // Fallback to in-memory store
      //console.warn('better-sqlite3 not available, using in-memory fallback:', e && e.message ? e.message : e);
      this.db = null;
    }
  }

  private migrate() {
    if (!this.db) return;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        type TEXT,
        text TEXT,
        rationale TEXT,
        policy_result TEXT,
        published INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS context_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        content TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        event TEXT,
        metadata TEXT
      );
    `);
  }

  recordAction(action: ActionRecord) {
    if (this.db) {
      const stmt = this.db.prepare(`INSERT INTO actions (timestamp, type, text, rationale, policy_result, published) VALUES (?, ?, ?, ?, ?, ?)`);
      stmt.run(action.timestamp, action.type, action.text, action.rationale || null, action.policy_result || null, action.published ? 1 : 0);
      return;
    }
    this.inMemoryActions.push(action);
  }

  getRecentActions(n = 10) {
    if (this.db) {
      const stmt = this.db.prepare(`SELECT * FROM actions ORDER BY id DESC LIMIT ?`);
      return stmt.all(n);
    }
    return this.inMemoryActions.slice(-n).reverse();
  }

  getDailyActionCount(type: string) {
    const today = new Date().toISOString().slice(0, 10);
    if (this.db) {
      const stmt = this.db.prepare(`SELECT COUNT(*) as cnt FROM actions WHERE type = ? AND timestamp LIKE ?`);
      const row = stmt.get(type, `${today}%`);
      return row?.cnt || 0;
    }
    return this.inMemoryActions.filter((a) => a.type === type && a.timestamp.startsWith(today)).length;
  }

  appendAudit(event: string, metadata: object) {
    if (this.db) {
      const stmt = this.db.prepare(`INSERT INTO audit_log (timestamp, event, metadata) VALUES (?, ?, ?)`);
      stmt.run(new Date().toISOString(), event, JSON.stringify(metadata || {}));
      return;
    }
    this.inMemoryAudit.push({ timestamp: new Date().toISOString(), event, metadata: JSON.stringify(metadata || {}) });
  }
}

export default new Memory();
