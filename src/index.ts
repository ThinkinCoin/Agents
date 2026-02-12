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
      // Try multiple extensions and surface errors for debugging
      let mod: any = null;
      const tryPaths = [modPath, `${modPath}.ts`, `${modPath}.js`];
      for (const p of tryPaths) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          mod = require(p);
          console.log(`Loaded module from ${p}`);
          break;
        } catch (e) {
          // Log the require error for diagnosis
          const err = e as Error;
          console.debug(`require failed for ${p}:`, err?.message || e);
        }
      }
      if (!mod) throw new Error(`Could not require any of: ${tryPaths.join(', ')}`);
      AgentClass = mod.Agent || mod.default || mod;
      console.log(`Loaded agent module from ${modPath}`);
      break;
    } catch (err) {
      console.warn(`Failed to load agent module at ${modPath}:`, err && (err as Error).message ? (err as Error).message : err);
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
