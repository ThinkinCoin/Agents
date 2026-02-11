import fs from 'fs';
import path from 'path';
import config from '../config';
import { OpenAI } from 'openai';

export type Candidate = {
  text: string;
  rationale?: string;
  policy_checks?: string[];
  requires_human_approval?: boolean;
};

export class LLMClient {
  private client: OpenAI | null = null;
  private systemPrompt: string = '';

  constructor() {
    if (!config.DISABLE_LLM && config.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    }

    try {
      const p = path.resolve(process.cwd(), 'AGENT_BASE_PROMPT.md');
      this.systemPrompt = fs.readFileSync(p, 'utf8');
    } catch (e) {
      this.systemPrompt = '';
    }
  }

  async generateCandidate(context: string): Promise<Candidate> {
    if (config.DISABLE_LLM || !this.client) {
      // Dev fallback
      return {
        text: 'This is a mock candidate (LLM disabled).',
        rationale: 'dev-mock',
        policy_checks: []
      };
    }

    try {
      const messages = [
        { role: 'system', content: this.systemPrompt || 'You are Agent Smith.' },
        { role: 'user', content: context }
      ];

      // Use chat completions
      // The OpenAI client API shape may vary; use a common interface
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp: any = await this.client.chat.completions.create({
        model: config.OPENAI_MODEL,
        messages,
        max_tokens: 512
      });

      const content = resp?.choices?.[0]?.message?.content || '';

      // Try to parse JSON candidate if returned, else wrap text
      let parsed: Candidate = { text: content };
      try {
        const maybe = JSON.parse(content);
        if (maybe && typeof maybe.text === 'string') parsed = maybe;
      } catch (_) {
        // not JSON, keep content
      }

      return parsed;
    } catch (err) {
      // On error, return a safe candidate asking for human review
      console.error('LLM generation error:', err);
      return {
        text: 'LLM error: unable to generate candidate. Escalate for human review.',
        rationale: 'llm-error',
        requires_human_approval: true,
        policy_checks: []
      };
    }
  }
}

export default new LLMClient();
