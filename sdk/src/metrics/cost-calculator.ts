import type { ModelCostRate } from '../types.js';

const BUILTIN_RATES: Record<string, ModelCostRate> = {
  // Anthropic
  'Claude Opus': { input: 0.015, output: 0.075 },
  'Claude Sonnet': { input: 0.003, output: 0.015 },
  'Claude Haiku': { input: 0.00025, output: 0.00125 },
  'claude-opus-4-6': { input: 0.015, output: 0.075 },
  'claude-sonnet-4-6': { input: 0.003, output: 0.015 },
  'claude-haiku-4-5-20251001': { input: 0.00025, output: 0.00125 },
  // OpenAI
  'GPT-4': { input: 0.03, output: 0.06 },
  'GPT-4o': { input: 0.005, output: 0.015 },
  'GPT-4o-mini': { input: 0.00015, output: 0.0006 },
  'GPT-3.5-Turbo': { input: 0.0005, output: 0.0015 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
};

export class CostCalculator {
  private customRates: Map<string, ModelCostRate> = new Map();

  registerModel(model: string, rates: ModelCostRate): void {
    this.customRates.set(model, rates);
  }

  calculate(model: string, tokensInput: number, tokensOutput: number): number {
    const rates = this.customRates.get(model) || BUILTIN_RATES[model];
    if (!rates) return 0;
    return parseFloat(
      ((tokensInput / 1000) * rates.input + (tokensOutput / 1000) * rates.output).toFixed(6)
    );
  }

  hasModel(model: string): boolean {
    return this.customRates.has(model) || model in BUILTIN_RATES;
  }
}
