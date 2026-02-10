import fs from 'fs';
import path from 'path';

export class Brain {
  constructor() {}

  private async findPolicyFile(): Promise<string | null> {
    const agentName = process.env.AGENT_NAME || 'AgentSmith';
    const candidates = [
      path.resolve(process.cwd(), 'policy.yaml'),
      path.resolve(process.cwd(), '..', 'policy.yaml'),
      path.resolve(process.cwd(), '.agents', agentName, 'policy.yaml'),
      path.resolve(process.cwd(), 'agent', agentName, 'policy.yaml'),
      path.resolve(process.cwd(), 'agents', agentName, 'policy.yaml'),
      path.resolve(process.cwd(), agentName, 'policy.yaml')
    ];

    for (const p of candidates) {
      try {
        await fs.promises.access(p);
        return p;
      } catch (e) {
        // not found, continue
      }
    }
    return null;
  }

  async propose() {
    // Try to locate a policy file in common locations so relative path changes don't break dev
    const policyPath = await this.findPolicyFile();
    if (policyPath) {
      console.log('Policy file found at:', policyPath);
      // In dev we don't parse it yet, just acknowledge presence
    } else {
      console.warn('No policy.yaml found in common locations; using defaults.');
    }

    // Placeholder: gather context, run policy checks, and return a candidate public message
    return {
      text: 'This is a dry-run candidate from Agent Smith (dev).',
      rationale: 'dev-run: validate pipeline and policy checks',
      policy_checks: policyPath ? ['found_policy'] : ['no_policy']
    };
  }
}
