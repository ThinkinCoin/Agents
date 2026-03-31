import path from 'path';
import fs from 'fs';

// File-backed NDJSON store (pure JS, no native modules)
const DATA_DIR = path.resolve(process.cwd(), 'data');
const ACTIONS_FILE = path.resolve(DATA_DIR, 'agent-smith.actions.ndjson');
const AUDIT_FILE = path.resolve(DATA_DIR, 'agent-smith.audit.ndjson');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export type ActionRecord = {
  timestamp: string;
  type: string;
  text: string;
  rationale?: string;
  policy_result?: string;
  published?: number;
};

export class Memory {
  // In-memory cache to reduce fs reads for small datasets
  private cacheActions: ActionRecord[] | null = null;

  private ensureFiles() {
    if (!fs.existsSync(ACTIONS_FILE)) fs.writeFileSync(ACTIONS_FILE, '');
    if (!fs.existsSync(AUDIT_FILE)) fs.writeFileSync(AUDIT_FILE, '');
  }

  constructor() {
    this.ensureFiles();
  }

  recordAction(action: ActionRecord) {
    this.ensureFiles();
    const line = JSON.stringify(action) + '\n';
    try {
      fs.appendFileSync(ACTIONS_FILE, line, 'utf8');
      this.cacheActions = null; // invalidate cache
    } catch (e) {
      // best-effort: if append fails, keep in-memory
      if (!this.cacheActions) this.cacheActions = [];
      this.cacheActions.push(action);
    }
  }

  private readAllActions(): ActionRecord[] {
    this.ensureFiles();
    if (this.cacheActions) return this.cacheActions;
    try {
      const raw = fs.readFileSync(ACTIONS_FILE, 'utf8').trim();
      if (!raw) return (this.cacheActions = []);
      const lines = raw.split(/\r?\n/).filter(Boolean);
      const items = lines.map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      }).filter(Boolean) as ActionRecord[];
      this.cacheActions = items;
      return items;
    } catch (e) {
      return [];
    }
  }

  getRecentActions(n = 10) {
    const all = this.readAllActions();
    if (all.length === 0) return [];
    return all.slice(-n).reverse();
  }

  getDailyActionCount(type: string) {
    const today = new Date().toISOString().slice(0, 10);
    const all = this.readAllActions();
    return all.filter((a) => a.type === type && a.timestamp.startsWith(today)).length;
  }

  appendAudit(event: string, metadata: object) {
    this.ensureFiles();
    const entry = { timestamp: new Date().toISOString(), event, metadata };
    try {
      fs.appendFileSync(AUDIT_FILE, JSON.stringify(entry) + '\n', 'utf8');
    } catch (e) {
      // ignore failures
    }
  }
}

export default new Memory();
