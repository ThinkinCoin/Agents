import { Brain } from './brain';
import fs from 'fs';
import path from 'path';
import { Executor } from './executor';
import Scout from './scout';
import memory from './memory';
import governance from './governance';
import config from '../../config';

export class Agent {
  private brain: Brain;
  private nextHeartbeat: Date | null = null;

  constructor() {
    this.brain = new Brain();
  }

  private updateRuntimeState() {
    try {
      const statePath = path.resolve(config.OPENCLAW_DIR, 'agentSmith', 'runtime-state.json');
      const dir = path.dirname(statePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const state = {
        last_check: new Date().toISOString(),
        next_heartbeat: this.nextHeartbeat ? this.nextHeartbeat.toISOString() : null,
        heartbeat_interval_ms: config.HEARTBEAT_MS,
        agent_mode: config.AGENT_MODE
      };
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    } catch (e) {
      console.warn('Failed to update runtime state:', e);
    }
  }

  async start() {
    console.log('Agent Smith starting (local dev mode)');
    console.log('OpenClaw directory:', config.OPENCLAW_DIR);
    const executor = new Executor();
    const scout = new Scout();

    const runOnce = async () => {
      // Update next heartbeat estimate
      if (config.HEARTBEAT_MS > 0) {
        this.nextHeartbeat = new Date(Date.now() + config.HEARTBEAT_MS);
      }
      this.updateRuntimeState();

      // Check DAO pause flag before doing anything
      if (governance.isDAOPaused()) {
        console.log('DAO_PAUSE is active — skipping this heartbeat.');
        return;
      }

      try {
        // 1) Collect and respond to mentions first
        const mentions = await scout.collectNewMentions(executor);
        for (const mention of mentions) {
          try {
            const replyCandidate = await this.brain.proposeReply({
              mentionId: mention.id,
              mentionText: mention.text,
              authorId: mention.author_id
            });

            if (replyCandidate && !replyCandidate.requires_human_approval) {
              const replyResult = await executor.replyToTwitter(mention.id, replyCandidate.text || 'Thanks for the mention.');
              memory.recordAction({
                timestamp: new Date().toISOString(),
                type: 'reply',
                text: replyCandidate.text || '',
                rationale: replyCandidate.rationale || '',
                policy_result: replyResult.success ? 'ok' : 'error',
                published: replyResult.success ? 1 : 0
              });
              if (replyResult.success) {
                scout.markReplied(mention.id);
              }
              console.log('Reply result:', { mention_id: mention.id, ...replyResult });
            }
          } catch (e) {
            console.error('Reply pipeline error:', e);
            memory.recordAction({
              timestamp: new Date().toISOString(),
              type: 'reply_error',
              text: mention.text,
              rationale: String(e),
              policy_result: 'error',
              published: 0
            });
          }
        }

        // 2) Then continue normal publication flow
        const candidate = await this.brain.propose();
        console.log('Candidate action (dev):', candidate);

        // If candidate is allowed to run automatically, attempt to publish
        if (candidate && !((candidate as any).requires_human_approval === true)) {
          try {
            const result = await executor.publish(candidate);
            memory.recordAction({ timestamp: new Date().toISOString(), type: 'publish_attempt', text: candidate.text, rationale: candidate.rationale || '', policy_result: 'auto', published: result.posted ? 1 : 0 });
            console.log('Publish result:', result);
          } catch (e) {
            console.error('Publish error:', e);
            memory.recordAction({ timestamp: new Date().toISOString(), type: 'publish_error', text: candidate.text, rationale: String(e), policy_result: 'error', published: 0 });
          }
        }
      } catch (err) {
        console.error('Error in agent loop:', err);
      }
    };

    // Run immediately, then schedule heartbeat (can be disabled in dev)
    await runOnce();

    const intervalMs = config.HEARTBEAT_MS;
    const disable = config.DISABLE_HEARTBEAT || intervalMs <= 0;

    let timer: NodeJS.Timeout | null = null;
    if (disable) {
      console.log('Heartbeat disabled (DEV mode or DISABLE_HEARTBEAT=1)');
    } else {
      timer = setInterval(runOnce, intervalMs);
    }

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('Shutting down agent...');
      if (timer) clearInterval(timer);
      process.exit(0);
    });

    // Ping handler: send SIGUSR2 to process to get a PONG and append to transparency.log
    process.on('SIGUSR2', () => {
      const agentName = process.env.AGENT_NAME || 'AgentSmith';
      let hbInfo = '';
      if (this.nextHeartbeat) {
        const remainingMs = this.nextHeartbeat.getTime() - Date.now();
        const remainingMin = Math.round(remainingMs / 60000);
        hbInfo = ` | Next heartbeat in ~${remainingMin} min (${this.nextHeartbeat.toISOString()})`;
      }
      const msg = `${new Date().toISOString()} PONG from ${agentName}${hbInfo}\n`;
      console.log('Received SIGUSR2 — PONG', hbInfo);
      try {
        const logPath = path.resolve(process.cwd(), 'transparency.log');
        fs.appendFileSync(logPath, msg);
      } catch (e) {
        console.warn('Failed to write transparency.log:', e);
      }
    });
  }
}
