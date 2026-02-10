import 'dotenv/config';
import path from 'path';

async function main() {
  const agentName = process.env.AGENT_NAME || 'AgentSmith';

  // Candidate module import paths (compiled JS expected in dist)
  const candidates = [
    path.join(__dirname, 'agent', agentName, 'agent'),
    path.join(__dirname, 'agents', agentName, 'agent'),
    path.join(__dirname, 'agent', 'agent')
  ];

  let AgentClass: any = null;

  for (const modPath of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(modPath);
      AgentClass = mod.Agent || mod.default || mod;
      console.log(`Loaded agent module from ${modPath}`);
      break;
    } catch (err) {
      // not found, try next
    }
  }

  if (!AgentClass) {
    console.error('No agent module found. Checked:', candidates.join(', '));
    process.exit(1);
  }

  const agent = new AgentClass();
  await agent.start();
}

main().catch((err) => {
  console.error('Fatal error starting Agent runtime:', err);
  process.exit(1);
});
