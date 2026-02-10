export { Agent } from '../agent/AgentSmith/agent';
import { Brain } from './brain';

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

    // Run immediately, then schedule heartbeat
    await runOnce();

    const defaultMs = 3 * 60 * 60 * 1000; // 3 hours
    const intervalMs = process.env.HEARTBEAT_MS ? parseInt(process.env.HEARTBEAT_MS, 10) : defaultMs;

    const timer = setInterval(runOnce, intervalMs);

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('Shutting down agent...');
      clearInterval(timer);
      process.exit(0);
    });
  }
}
