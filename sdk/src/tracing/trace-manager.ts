import { generateTraceId, generateStepId } from '../utils/id-generator.js';
import type { RawTraceEvent, RawTraceStep, AddTraceStepParams } from '../types.js';

export class StepHandle {
  readonly id: string;
  readonly type: RawTraceStep['type'];
  readonly name: string;
  readonly startTime: string;
  readonly model?: string;
  private _input?: string;
  private _output?: string;
  private _endTime: string | null = null;
  private _duration: number | null = null;
  private _status: RawTraceStep['status'] = 'running';
  private _tokensInput = 0;
  private _tokensOutput = 0;
  private _cost = 0;
  private _error: string | null = null;
  private readonly _startMs: number;

  constructor(params: AddTraceStepParams) {
    this.id = generateStepId();
    this.type = params.type;
    this.name = params.name;
    this._input = params.input;
    this.model = params.model;
    this._startMs = Date.now();
    this.startTime = new Date(this._startMs).toISOString();
  }

  setInput(input: string): this {
    this._input = input;
    return this;
  }

  setOutput(output: string): this {
    this._output = output;
    return this;
  }

  setTokens(input: number, output: number): this {
    this._tokensInput = input;
    this._tokensOutput = output;
    return this;
  }

  setCost(cost: number): this {
    this._cost = cost;
    return this;
  }

  end(options?: { output?: string; error?: string; tokensInput?: number; tokensOutput?: number; cost?: number }): void {
    const endMs = Date.now();
    this._endTime = new Date(endMs).toISOString();
    this._duration = endMs - this._startMs;

    if (options?.output) this._output = options.output;
    if (options?.tokensInput) this._tokensInput = options.tokensInput;
    if (options?.tokensOutput) this._tokensOutput = options.tokensOutput;
    if (options?.cost) this._cost = options.cost;

    if (options?.error) {
      this._status = 'failed';
      this._error = options.error;
    } else {
      this._status = 'completed';
    }
  }

  toRaw(): RawTraceStep {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      startTime: this.startTime,
      endTime: this._endTime,
      duration: this._duration,
      status: this._status,
      input: this._input,
      output: this._output,
      tokensInput: this._tokensInput,
      tokensOutput: this._tokensOutput,
      cost: this._cost,
      model: this.model,
      error: this._error,
    };
  }
}

export type TraceSendCallback = (event: RawTraceEvent) => void;

export class TraceHandle {
  readonly traceId: string;
  private readonly agentId: string;
  private readonly steps: StepHandle[] = [];
  private _status: 'running' | 'completed' | 'failed' = 'running';
  private readonly onSend: TraceSendCallback;

  constructor(agentId: string, onSend: TraceSendCallback) {
    this.traceId = generateTraceId();
    this.agentId = agentId;
    this.onSend = onSend;
  }

  addStep(params: AddTraceStepParams): StepHandle {
    const step = new StepHandle(params);
    this.steps.push(step);
    return step;
  }

  end(options?: { error?: string }): void {
    if (options?.error) {
      this._status = 'failed';
    } else {
      this._status = 'completed';
    }

    const rawSteps = this.steps.map((s) => s.toRaw());
    const totalTokens = rawSteps.reduce((s, r) => s + (r.tokensInput || 0) + (r.tokensOutput || 0), 0);
    const totalCost = rawSteps.reduce((s, r) => s + (r.cost || 0), 0);

    const event: RawTraceEvent = {
      type: 'trace',
      agentId: this.agentId,
      traceId: this.traceId,
      timestamp: new Date().toISOString(),
      status: this._status,
      steps: rawSteps,
      totalTokens,
      totalCost,
    };

    this.onSend(event);
  }

  get status(): string {
    return this._status;
  }
}
