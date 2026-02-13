import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import memory, { ActionRecord } from './memory';
import config from '../../config';

type Policy = {
  forbid_keywords?: string[];
  allow_topics?: string[];
  reply_only_if?: any;
  rate_limit?: { posts_per_day?: number; replies_per_day?: number };
  emergency?: any;
  escalation_flow?: string[];
};

const POLICY_LOCATIONS = [
  // user-specific OpenClaw directory takes precedence
  path.resolve(config.OPENCLAW_DIR, 'policy.yaml'),
  path.resolve(process.cwd(), '.agents', process.env.AGENT_NAME || 'AgentSmith', 'policy.yaml'),
  path.resolve(process.cwd(), 'policy.yaml')
];

function loadPolicy(): Policy {
  for (const p of POLICY_LOCATIONS) {
    try {
      const raw = fs.readFileSync(p, 'utf8');
      return yaml.load(raw) as Policy;
    } catch (e) {
      // continue
    }
  }
  return {};
}

const policy = loadPolicy();

export function checkForbiddenKeywords(text: string): string[] {
  const forbidden = (policy.forbid_keywords || []).map((s) => s.toLowerCase());
  const found: string[] = [];
  const low = text.toLowerCase();
  for (const kw of forbidden) {
    if (kw && low.includes(kw)) found.push(kw);
  }
  return found;
}

export function checkAllowedTopics(text: string): boolean {
  const topics = policy.allow_topics || [];
  if (topics.length === 0) return true;
  const low = text.toLowerCase();
  return topics.some((t) => low.includes((t as string).toLowerCase()));
}

export function checkRateLimit(type: 'post' | 'reply') {
  const rl = policy.rate_limit || {};
  if (type === 'post') {
    const limit = rl.posts_per_day ?? Infinity;
    const count = memory.getDailyActionCount('post');
    return count < limit;
  }
  const limit = rl.replies_per_day ?? Infinity;
  const count = memory.getDailyActionCount('reply');
  return count < limit;
}

export function isDAOPaused(): boolean {
  // check environment flag first
  if (process.env.DAO_PAUSE === '1') return true;
  // fallback to policy emergency config
  return !!(policy.emergency && policy.emergency.dao_pause_flag && process.env[policy.emergency.dao_pause_flag] === '1');
}

/**
 * Validates that the candidate aligns with the core Think in Coin constitution.
 * 1. No hype/shill.
 * 2. Philosophical tone.
 * 3. Includes the motto or reference to connectivity if appropriate.
 */
export function validateConstitutionAlignment(text: string): { aligned: boolean; reason?: string } {
  const hypeKeywords = ['moon', '100x', 'pump', 'profit', 'guarantee'];
  const low = text.toLowerCase();
  
  if (hypeKeywords.some(kw => low.includes(kw))) {
    return { aligned: false, reason: 'Candidate contains hype/shill keywords forbidden by constitution.' };
  }
  
  // Basic analytical tone check (naive: check for lack of emojis and presence of system terminology)
  const hasEmoji = /\p{Emoji}/u.test(text);
  if (hasEmoji) {
    return { aligned: false, reason: 'Constitution forbids use of emojis in institutional communication.' };
  }

  return { aligned: true };
}

export function enforceEscalation(violation: string, meta: object = {}) {
  // ABORT -> LOG -> PAUSE -> ESCALATE
  const ts = new Date().toISOString();
  const entry = `${ts} ESCALATION: ${violation} ${JSON.stringify(meta)}\n`;
  try {
    const logPath = path.resolve(process.cwd(), policy.emergency?.transparency_log || 'transparency.log');
    fs.appendFileSync(logPath, entry);
  } catch (e) {
    // ignore
  }
  memory.appendAudit('escalation', { violation, meta, ts });
}

export default {
  policy,
  checkForbiddenKeywords,
  checkAllowedTopics,
  checkRateLimit,
  isDAOPaused,
  validateConstitutionAlignment,
  enforceEscalation
};
