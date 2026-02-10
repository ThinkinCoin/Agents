import { Brain } from './brain';
import fs from 'fs';
import path from 'path';

export class Agent {
  private brain: Brain;

  constructor() {
    this.brain = new Brain();
  }

  async start() {
    console.log('Agent Smith starting (local dev mode)');

    const runOnce = async () => {
      try {
        const candidate = await this.brain.propose();
        console.log('Candidate action (dev):', candidate);
      } catch (err) {
        console.error('Error in agent loop:', err);
      }
    };

    // Run immediately, then schedule heartbeat (can be disabled in dev)
    await runOnce();

    const defaultMs = 3 * 60 * 60 * 1000; // 3 hours
    const intervalMs = process.env.HEARTBEAT_MS ? parseInt(process.env.HEARTBEAT_MS, 10) : defaultMs;
    const disable = process.env.DISABLE_HEARTBEAT === '1' || intervalMs <= 0;

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
