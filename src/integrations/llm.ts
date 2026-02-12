import fs from 'fs';
import path from 'path';
import config from '../config';
import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions/completions';

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
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: this.systemPrompt || 'You are Agent Smith.' },
        { role: 'user', content: context }
      ];

      // Use chat completions
      // For newer models (o1, gpt-5), max_tokens is replaced by max_completion_tokens
      const payload: any = {
        model: config.OPENAI_MODEL,
        messages
      };

      if (config.OPENAI_MODEL.includes('o1') || config.OPENAI_MODEL.includes('gpt-5')) {
        payload.max_completion_tokens = 512;
      } else {
        payload.max_tokens = 512;
      }

      const resp: any = await this.client.chat.completions.create(payload);

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
