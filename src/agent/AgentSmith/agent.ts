import { Brain } from './brain';
import fs from 'fs';
import path from 'path';
import { Executor } from './executor';
import memory from './memory';
import governance from './governance';
import config from '../../config';

export class Agent {
  private brain: Brain;

  constructor() {
    this.brain = new Brain();
  }

  async start() {
    console.log('Agent Smith starting (local dev mode)');
    console.log('OpenClaw directory:', config.OPENCLAW_DIR);
    const executor = new Executor();

    const runOnce = async () => {
      // Check DAO pause flag before doing anything
      if (governance.isDAOPaused()) {
        console.log('DAO_PAUSE is active — skipping this heartbeat.');
        return;
      }
      try {
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
      const msg = `${new Date().toISOString()} PONG from ${agentName}\n`;
      console.log('Received SIGUSR2 — PONG');
      try {
        const logPath = path.resolve(process.cwd(), 'transparency.log');
        fs.appendFileSync(logPath, msg);
      } catch (e) {
        console.warn('Failed to write transparency.log:', e);
      }
    });
  }
}
