import fs from 'fs';
import path from 'path';
import config from '../../config';

export interface ScheduledPost {
  id: string;
  title: string;
  text: string;
  submolt: string;
  status: 'pending' | 'published' | 'failed';
  scheduled_for: string;
  published_at: string | null;
  error?: string;
}

export interface ScheduleState {
  scheduled_posts: ScheduledPost[];
  rate_limit_ms: number;
  created_at: string;
  last_check: string | null;
}

export class PostScheduler {
  private schedulePath: string;

  constructor() {
    this.schedulePath = path.resolve(
      config.OPENCLAW_DIR || path.resolve(process.cwd(), 'data'),
      'moltbook',
      'scheduled-posts.json'
    );
  }

  private readSchedule(): ScheduleState {
    try {
      if (fs.existsSync(this.schedulePath)) {
        const data = fs.readFileSync(this.schedulePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to read scheduled posts:', e);
    }
    return { scheduled_posts: [], rate_limit_ms: 1860000, created_at: new Date().toISOString(), last_check: null };
  }

  private writeSchedule(state: ScheduleState) {
    try {
      const dir = path.dirname(this.schedulePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.schedulePath, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
      console.warn('Failed to write scheduled posts:', e);
    }
  }

  /**
   * Get posts that are ready to publish (scheduled_for <= now, status = pending)
   */
  getReadyPosts(): ScheduledPost[] {
    const state = this.readSchedule();
    const now = new Date();

    return state.scheduled_posts.filter((post) => {
      if (post.status !== 'pending') return false;
      const scheduledFor = new Date(post.scheduled_for);
      return scheduledFor <= now;
    });
  }

  /**
   * Mark a post as published
   */
  markPublished(postId: string, publishedAt: string | null = null) {
    const state = this.readSchedule();
    const post = state.scheduled_posts.find((p) => p.id === postId);
    if (post) {
      post.status = 'published';
      post.published_at = publishedAt || new Date().toISOString();
      state.last_check = new Date().toISOString();
      this.writeSchedule(state);
    }
  }

  /**
   * Mark a post as failed
   */
  markFailed(postId: string, error: string) {
    const state = this.readSchedule();
    const post = state.scheduled_posts.find((p) => p.id === postId);
    if (post) {
      post.status = 'failed';
      post.error = error;
      state.last_check = new Date().toISOString();
      this.writeSchedule(state);
    }
  }

  /**
   * Get all pending posts
   */
  getPendingPosts(): ScheduledPost[] {
    const state = this.readSchedule();
    return state.scheduled_posts.filter((p) => p.status === 'pending');
  }

  /**
   * Get all published posts
   */
  getPublishedPosts(): ScheduledPost[] {
    const state = this.readSchedule();
    return state.scheduled_posts.filter((p) => p.status === 'published');
  }

  /**
   * Update last_check timestamp
   */
  updateLastCheck() {
    const state = this.readSchedule();
    state.last_check = new Date().toISOString();
    this.writeSchedule(state);
  }
}

export default new PostScheduler();
