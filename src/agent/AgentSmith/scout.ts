import fs from 'fs';
import path from 'path';
import config from '../../config';
import { Executor, TwitterMention } from './executor';

type ScoutState = {
  since_id?: string;
  replied_to_ids?: string[];
  updated_at?: string;
};

export class Scout {
  private statePath: string;

  constructor() {
    this.statePath = path.resolve(config.OPENCLAW_DIR || path.resolve(process.cwd(), 'data'), 'twitter', 'scout-state.json');
  }

  private readState(): ScoutState {
    try {
      const raw = fs.readFileSync(this.statePath, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed || {};
    } catch (_) {
      return {};
    }
  }

  private writeState(next: ScoutState) {
    try {
      fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
      fs.writeFileSync(this.statePath, JSON.stringify(next, null, 2), 'utf8');
    } catch (_) {
      // ignore scout state write failures
    }
  }

  async collectNewMentions(executor: Executor): Promise<TwitterMention[]> {
    const state = this.readState();
    const sinceId = state.since_id;
    const replied = new Set(state.replied_to_ids || []);
    const replyWindowHours = Math.max(1, Number(config.REPLY_WINDOW_HOURS || 24));
    const lowerBound = Date.now() - replyWindowHours * 60 * 60 * 1000;

    const result = await executor.fetchTwitterMentions(sinceId, 10);
    if (result.error) {
      return [];
    }

    const mentions = (result.mentions || []).filter((m) => {
      if (!m.created_at) return false;
      const ts = Date.parse(m.created_at);
      if (Number.isNaN(ts)) return false;
      return ts >= lowerBound;
    });
    const ordered = mentions.slice().reverse();
    const unseen = ordered.filter((m) => !replied.has(m.id));

    this.writeState({
      ...state,
      since_id: result.newestId || sinceId,
      updated_at: new Date().toISOString()
    });

    return unseen;
  }

  markReplied(tweetId: string) {
    const state = this.readState();
    const list = state.replied_to_ids || [];
    if (!list.includes(tweetId)) {
      list.push(tweetId);
    }

    const bounded = list.slice(-500);
    this.writeState({
      ...state,
      replied_to_ids: bounded,
      updated_at: new Date().toISOString()
    });
  }
}

export default Scout;