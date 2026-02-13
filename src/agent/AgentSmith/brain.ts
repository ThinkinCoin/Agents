import fs from 'fs';
import path from 'path';
import llm from '../../integrations/llm';
import memory from './memory';
import governance, { validateConstitutionAlignment } from './governance';
import config from '../../config';

export class Brain {
  constructor() {}

  private readOpenClawFile(...segments: string[]): string {
    try {
      const p = path.resolve(config.OPENCLAW_DIR, ...segments);
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    } catch (e) {
      // ignore
    }
    return '';
  }

  private buildOpenClawContext(): string {
    const candidates = [
      ['agentSmith'],
      ['workspace']
    ];

    for (const base of candidates) {
      const identity = this.readOpenClawFile(...base, 'IDENTITY.md');
      const soul = this.readOpenClawFile(...base, 'SOUL.md');
      const tools = this.readOpenClawFile(...base, 'TOOLS.md');
      const heartbeat = this.readOpenClawFile(...base, 'HEARTBEAT.md');
      const user = this.readOpenClawFile(...base, 'USER.md');

      const chunks = [identity, soul, tools, heartbeat, user].filter(Boolean);
      if (chunks.length > 0) {
        return chunks.join('\n\n');
      }
    }

    return '';
  }

  private buildContext(): string {
    const agent = config.AGENT_NAME;
    const recent = memory.getRecentActions(5) || [];
    const recentText = recent.map((r: any) => `- ${r.timestamp}: ${r.type} — ${r.rationale || r.text}`).join('\n');
    const policySummary = `forbidden_keywords=${(governance.policy.forbid_keywords || []).length}, posts_per_day=${governance.policy.rate_limit?.posts_per_day || 'unset'}`;
    const openclawText = this.buildOpenClawContext();
    
    // Load project-wide constitution instructions
    let projectInstructions = '';
    try {
      const p = path.resolve(process.cwd(), '.github', 'instructions', 'project.instructions.md');
      if (fs.existsSync(p)) {
        projectInstructions = fs.readFileSync(p, 'utf8');
      }
    } catch (e) {
      // ignore
    }

    const header = `Agent: ${agent}\nProject: ${config.PROJECT}\nToken: ${config.TOKEN}\n`;
    const ctx = [
      header,
      projectInstructions ? '### CORE CONSTITUTION & VISION\n' + projectInstructions : '',
      openclawText ? '### OPENCLAW DIRECTIVES\n' + openclawText : '',
      '### RECENT ACTIONS\n',
      recentText,
      '### POLICY SUMMARY\n',
      policySummary
    ].filter(Boolean).join('\n\n');
    return ctx;
  }

  async propose() {
    const context = this.buildContext();

    if (config.DISABLE_LLM) {
      const candidate = { text: 'This is a dry-run candidate from Agent Smith (dev).', rationale: 'dev-run: validate pipeline and policy checks', policy_checks: ['mock'] };
      memory.recordAction({ timestamp: new Date().toISOString(), type: 'proposal', text: candidate.text, rationale: candidate.rationale, policy_result: JSON.stringify(candidate.policy_checks), published: 0 });
      return candidate;
    }

    const candidate = await llm.generateCandidate(context);

    // Run policy checks
    const violations = governance.checkForbiddenKeywords(candidate.text || '');
    const allowedTopic = governance.checkAllowedTopics(candidate.text || '');
    const rateOk = governance.checkRateLimit('post');
    const constitutionRes = validateConstitutionAlignment(candidate.text || '');

    const policyChecks: string[] = [];
    if (violations.length) policyChecks.push(`forbidden:${violations.join(',')}`);
    if (!allowedTopic) policyChecks.push('topic:not_allowed');
    if (!rateOk) policyChecks.push('rate_limit_exceeded');
    if (!constitutionRes.aligned) policyChecks.push(`constitution_violation:${constitutionRes.reason}`);

    // Determine if human approval is required (merging LLM requirement + policy requirement)
    const requiresApproval = candidate.requires_human_approval || policyChecks.length > 0;
    const policyResult = policyChecks.length === 0 ? 'ok' : 'failed';

    // record attempt
    memory.recordAction({ 
      timestamp: new Date().toISOString(), 
      type: 'proposal', 
      text: candidate.text || '', 
      rationale: candidate.rationale || '', 
      policy_result: policyResult, 
      published: 0 
    });

    if (requiresApproval) {
      // escalate and do not surface for automatic execution
      const reason = candidate.requires_human_approval ? (candidate.rationale || 'llm-requirement') : 'policy_violation';
      governance.enforceEscalation(reason, { 
        checks: policyChecks, 
        text: candidate.text,
        rationale: candidate.rationale 
      });

      return { 
        ...candidate,
        text: candidate.text || '', 
        rationale: candidate.rationale || '', 
        policy_checks: policyChecks.length > 0 ? policyChecks : (candidate.policy_checks || ['manual_review_required']), 
        requires_human_approval: true 
      };
    }

    return { 
      ...candidate,
      text: candidate.text || '', 
      rationale: candidate.rationale || '', 
      policy_checks: ['passed'], 
      requires_human_approval: false 
    };
  }

  async proposeReply(input: { mentionId: string; mentionText: string; authorId?: string }) {
    const baseContext = this.buildContext();
    const replyContext = [
      baseContext,
      'Task: Reply to a user mention as Agent Smith (The Systemic Antagonist).',
      `Mention ID: ${input.mentionId}`,
      input.authorId ? `Author ID: ${input.authorId}` : '',
      `Mention text: ${input.mentionText}`,
      'Instructions: Propose a philosophical, slightly antagonistic reply that aligns with the Paradoxical DNA of Agent Smith. Focus on systemic resilience and scarcity. Do not be helpful in a naive way. Challenge the user while preserving the integrity of Neurons.',
      'Constraints: No emojis, no hype, no financial advice. Return plain text suitable for a single reply.'
    ].filter(Boolean).join('\n\n');

    if (config.DISABLE_LLM) {
      return {
        text: `The structure is not for everyone, ${input.authorId || 'human'}. (ref ${input.mentionId.slice(0, 6)})`,
        rationale: 'dev-run: reply pipeline validation (antagonist tone)',
        policy_checks: ['mock'],
        requires_human_approval: false
      };
    }

    const candidate = await llm.generateCandidate(replyContext);
    const replyText = (candidate.text || '').trim();

    const violations = governance.checkForbiddenKeywords(replyText);
    const rateOk = governance.checkRateLimit('reply');
    const constitutionRes = validateConstitutionAlignment(replyText);

    const policyChecks: string[] = [];
    if (violations.length) policyChecks.push(`forbidden:${violations.join(',')}`);
    if (!rateOk) policyChecks.push('reply_rate_limit_exceeded');
    if (!constitutionRes.aligned) policyChecks.push(`constitution_violation:${constitutionRes.reason}`);

    const requiresApproval = candidate.requires_human_approval || policyChecks.length > 0;
    const policyResult = policyChecks.length === 0 ? 'ok' : 'failed';

    memory.recordAction({
      timestamp: new Date().toISOString(),
      type: 'reply_proposal',
      text: replyText,
      rationale: candidate.rationale || '',
      policy_result: policyResult,
      published: 0
    });

    if (requiresApproval) {
      const reason = candidate.requires_human_approval ? (candidate.rationale || 'llm-requirement') : 'policy_violation';
      governance.enforceEscalation(reason, {
        checks: policyChecks,
        mention_id: input.mentionId,
        text: replyText,
        rationale: candidate.rationale
      });

      return {
        ...candidate,
        text: replyText,
        rationale: candidate.rationale || '',
        policy_checks: policyChecks.length > 0 ? policyChecks : (candidate.policy_checks || ['manual_review_required']),
        requires_human_approval: true
      };
    }

    return {
      ...candidate,
      text: replyText,
      rationale: candidate.rationale || '',
      policy_checks: ['passed'],
      requires_human_approval: false
    };
  }
}

