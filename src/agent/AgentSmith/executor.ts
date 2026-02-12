import fs from 'fs';
import path from 'path';
import config from '../../config';
import { TwitterApi } from 'twitter-api-v2';

function readJSON(p: string) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

function wordsToNumber(s: string): number | null {
  const small: Record<string, number> = {
    zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9,
    ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19,
    twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90, hundred:100
  };
  const parts = s.trim().split(/\s+/);
  let total = 0; let last = 0; let found = false;
  for (const p of parts) {
    const n = small[p as keyof typeof small];
    if (n === undefined) continue;
    found = true;
    if (n === 100) { last = (last || 1) * 100; }
    else { last += n; }
  }
  if (!found) return null;
  total += last;
  return total;
}

function extractNumbersFromChallenge(ch: string): number[] {
  // try direct digits
  const digits = Array.from(ch.matchAll(/(\d+(?:\.\d+)?)/g)).map(m => parseFloat(m[1]));
  if (digits.length) return digits;

  // normalize noisy text and try to find written numbers
  const cleaned = ch.replace(/[^a-zA-Z\s]/g, ' ').toLowerCase();
  // try to capture token windows up to length 3
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const nums: number[] = [];
  for (let i=0;i<tokens.length;i++){
    for (let j=3;j>=1;j--){
      const window = tokens.slice(i,i+j).join(' ');
      const n = wordsToNumber(window);
      if (n !== null) { nums.push(n); i += j-1; break; }
    }
  }
  return nums;
}

export class Executor {
  private credPath: string;
  private statePath: string;
  constructor() {
    this.credPath = path.resolve(process.cwd(), '.agents/moltbook/agentSmith/credentials.json');
    this.statePath = path.resolve(config.OPENCLAW_DIR || path.resolve(process.cwd(), 'data'), 'moltbook', 'runtime-state.json');
  }

  private readState(): any {
    const state = readJSON(this.statePath);
    return state || {};
  }

  private writeState(next: any) {
    try {
      fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
      fs.writeFileSync(this.statePath, JSON.stringify(next, null, 2), 'utf8');
    } catch (e) {
      // ignore state write failures
    }
  }

  private getCreds() {
    // try OPENCLAW_DIR first
    const alt = path.resolve(config.OPENCLAW_DIR || '', 'moltbook', 'credentials.json');
    if (alt && fs.existsSync(alt)) {
      const cAlt = readJSON(alt);
      if (cAlt) return cAlt;
    }
    const c = readJSON(this.credPath);
    if (!c) throw new Error('Moltbook credentials not found at ' + this.credPath);
    return c as any;
  }

  private async postJson(url: string, body: any, apiKey: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, 
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const text = await res.text();
      try { return { status: res.status, body: JSON.parse(text) } } catch(e){ return { status: res.status, body: text }; }
    } finally {
      clearTimeout(timeout);
    }
  }

  private async solveAndSubmit(verification: any, apiKey: string) {
    const code = verification.code || verification.verification_code || verification.verification_code;
    const challenge = verification.challenge || '';
    const nums = extractNumbersFromChallenge(challenge);
    let answer = '';
    if (nums.length >= 2 && /slow|slows|reduce|reduces|subtract|minus|less/.test(challenge.toLowerCase())) {
      answer = (nums[0] - nums[1]).toFixed(2);
    } else if (nums.length >= 1) {
      answer = nums[0].toFixed(2);
    } else {
      // fallback: try to find first numeric token in challenge
      const d = (challenge.match(/-?\d+(?:\.\d+)?/)||[])[0];
      answer = d ? parseFloat(d).toFixed(2) : '0.00';
    }

    const resp = await this.postJson('https://www.moltbook.com/api/v1/verify', { verification_code: code, answer }, apiKey);
    return resp;
  }

  private async postToTwitter(text: string) {
    console.log('Attempting Twitter post...');
    if (!config.X_API_KEY || !config.X_API_SECRET || !config.X_ACCESS_TOKEN || !config.X_ACCESS_SECRET) {
      console.log('Twitter creds missing');
      return { success: false, error: 'Twitter/X credentials missing in environment' };
    }

    try {
      console.log('Initializing Twitter client...');
      const client = new TwitterApi({
        appKey: config.X_API_KEY,
        appSecret: config.X_API_SECRET,
        accessToken: config.X_ACCESS_TOKEN,
        accessSecret: config.X_ACCESS_SECRET,
      });

      console.log('Sending tweet to X (with 15s timeout)...');
      const tweet = await Promise.race([
        client.v2.tweet(text),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Twitter API Timeout')), 15000))
      ]) as any;
      console.log('X tweet success:', tweet.data.id);
      return { success: true, tweet_id: tweet.data.id };
    } catch (e) {
      console.error('Twitter post error:', e);
      return { success: false, error: String(e) };
    }
  }

  public async publish(candidate: any) {
    const state = this.readState();
    if (state.next_post_after && Date.now() < Number(state.next_post_after)) {
      const minutes = Math.max(1, Math.ceil((Number(state.next_post_after) - Date.now()) / 60000));
      return { posted: false, rate_limited: true, retry_after_minutes: minutes, skipped_by_state: true };
    }

    const creds = this.getCreds();
    const apiKey = creds.api_key;
    const title = candidate.title || (candidate.text ? candidate.text.slice(0, 80) : 'AgentSmith Post');
    const body = { submolt: 'core', title, content: candidate.text };

    const res = await this.postJson('https://www.moltbook.com/api/v1/posts', body, apiKey);

    // Attempt Twitter post if enabled
    let xResult: any = null;
    if (config.X_API_KEY && config.X_API_SECRET && config.X_ACCESS_TOKEN && config.X_ACCESS_SECRET) {
      xResult = await this.postToTwitter(candidate.text);
    }

    if (res.body && res.body.verification_required) {
      // attempt to solve
      try {
        const vr = await this.solveAndSubmit(res.body.verification, apiKey);
        return { posted: false, twitter: xResult, verification: res.body.verification, verify_response: vr };
      } catch (e) {
        return { posted: false, twitter: xResult, error: e };
      }
    }

    if (res.status === 201 || (res.body && res.body.success)) {
      return { posted: true, twitter: xResult, post: res.body.post || res.body };
    }

    // handle rate limit
    if (res.body && res.body.retry_after_minutes) {
      const retryMinutes = Number(res.body.retry_after_minutes);
      const nextPostAfter = Date.now() + retryMinutes * 60 * 1000;
      this.writeState({
        ...state,
        next_post_after: nextPostAfter,
        last_rate_limit_at: new Date().toISOString(),
        retry_after_minutes: retryMinutes
      });
      return { posted: false, rate_limited: true, retry_after_minutes: retryMinutes };
    }

    // clear gate when request succeeds or fails without explicit rate limit
    if (state.next_post_after) {
      this.writeState({
        ...state,
        next_post_after: null,
        retry_after_minutes: null
      });
    }

    return { posted: false, response: res };
  }
}
