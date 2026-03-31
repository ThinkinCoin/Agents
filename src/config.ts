import fs from 'fs';
import path from 'path';
import os from 'os';

export type AgentMode = 'observe_only' | 'supervised' | 'limited' | 'dao_governed';

export interface Config {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL: string;
  X_API_KEY?: string;
  X_API_SECRET?: string;
  X_ACCESS_TOKEN?: string;
  X_ACCESS_SECRET?: string;
  AGENT_NAME: string;
  PROJECT?: string;
  TOKEN?: string;
  HEARTBEAT_MS: number;
  REPLY_WINDOW_HOURS: number;
  DISABLE_HEARTBEAT: boolean;
  OPENCLAW_DIR: string;
  AGENT_MODE: AgentMode;
  LOG_LEVEL: string;
  DISABLE_LLM: boolean;
}

function parseNumber(v: string | undefined, fallback: number) {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

const env = process.env;

export const config: Config = {
  OPENAI_API_KEY: env.OPENAI_API_KEY,
  OPENAI_MODEL: env.OPENAI_MODEL || 'gpt-5-mini',
  X_API_KEY: env.X_API_KEY?.trim(),
  X_API_SECRET: env.X_API_SECRET?.trim(),
  X_ACCESS_TOKEN: env.X_ACCESS_TOKEN?.trim(),
  X_ACCESS_SECRET: env.X_ACCESS_SECRET?.trim(),
  AGENT_NAME: env.AGENT_NAME || 'AgentSmith',
  PROJECT: env.PROJECT || 'Think in Coin',
  TOKEN: env.TOKEN || 'NEURONS',
  HEARTBEAT_MS: parseNumber(env.HEARTBEAT_MS, 3 * 60 * 60 * 1000),
  REPLY_WINDOW_HOURS: parseNumber(env.REPLY_WINDOW_HOURS, 24),
  DISABLE_HEARTBEAT: env.DISABLE_HEARTBEAT === '1',
  OPENCLAW_DIR: env.OPENCLAW_DIR || path.resolve(os.homedir(), '.openclaw'),
  AGENT_MODE: (env.AGENT_MODE as AgentMode) || 'observe_only',
  LOG_LEVEL: env.LOG_LEVEL || 'info',
  DISABLE_LLM: env.DISABLE_LLM === '1'
};

// If an OPENCLAW directory exists, try to load heartbeat override from heartbeat.json
try {
  const hbPath = path.resolve(config.OPENCLAW_DIR, 'heartbeat.json');
  if (fs.existsSync(hbPath)) {
    const raw = fs.readFileSync(hbPath, 'utf8');
    const jb = JSON.parse(raw);
    if (jb && typeof jb.heartbeat_ms === 'number') {
      (config as any).HEARTBEAT_MS = jb.heartbeat_ms;
    }
  }
} catch (e) {
  // ignore
}

// Basic validation
if (process.env.NODE_ENV === 'production') {
  if (!config.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required in production');
  }
  if (!config.AGENT_NAME) {
    throw new Error('AGENT_NAME is required');
  }
}

// Ensure data dir exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export default config;
