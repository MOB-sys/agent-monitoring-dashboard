import type { Agent } from './types.js';

export interface AgentNode {
  id: string;
  name: string;
  model: string;
  status: 'idle' | 'running' | 'error' | 'stopped';
  currentTask: string | null;
}

export interface AgentEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  active: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'failed';
  steps: string[];
  currentStep: number;
  startedAt: string;
  progress: number;
}

export interface HandoffEvent {
  id: string;
  fromAgent: string;
  toAgent: string;
  timestamp: string;
  reason: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface OrchestrationState {
  nodes: AgentNode[];
  edges: AgentEdge[];
  pipelines: Pipeline[];
  handoffs: HandoffEvent[];
}

export class OrchestrationManager {
  private handoffs: HandoffEvent[] = [];
  private pipelines: Pipeline[] = [];
  private handoffCounter = 0;
  private pipelineCounter = 0;
  private tickCount = 0;

  // Define the agent workflow edges
  private readonly edgeDefinitions = [
    { from: 'code-generator', to: 'code-reviewer', label: 'Code Review' },
    { from: 'code-reviewer', to: 'test-runner', label: 'Run Tests' },
    { from: 'test-runner', to: 'documentation', label: 'Generate Docs' },
    { from: 'documentation', to: 'devops-agent', label: 'Deploy' },
    { from: 'code-reviewer', to: 'code-generator', label: 'Revision Needed' },
  ];

  private readonly pipelineTemplates = [
    { name: 'Feature Development', steps: ['code-generator', 'code-reviewer', 'test-runner', 'documentation', 'devops-agent'] },
    { name: 'Bug Fix', steps: ['code-generator', 'code-reviewer', 'test-runner'] },
    { name: 'Documentation Update', steps: ['documentation', 'code-reviewer', 'devops-agent'] },
    { name: 'Hotfix Deploy', steps: ['code-generator', 'test-runner', 'devops-agent'] },
  ];

  tick(agents: Agent[]) {
    this.tickCount++;

    // Generate new pipeline every ~20 ticks
    if (this.tickCount % 20 === 0 || this.pipelines.length === 0) {
      const template = this.pipelineTemplates[Math.floor(Math.random() * this.pipelineTemplates.length)];
      this.pipelineCounter++;
      this.pipelines.unshift({
        id: `pipeline-${this.pipelineCounter}`,
        name: `${template.name} #${this.pipelineCounter}`,
        status: 'active',
        steps: template.steps,
        currentStep: 0,
        startedAt: new Date().toISOString(),
        progress: 0,
      });
      if (this.pipelines.length > 10) this.pipelines.pop();
    }

    // Advance active pipelines
    for (const pipeline of this.pipelines) {
      if (pipeline.status !== 'active') continue;
      if (Math.random() < 0.15) {
        pipeline.currentStep++;
        pipeline.progress = Math.min(100, (pipeline.currentStep / pipeline.steps.length) * 100);

        // Generate handoff event
        if (pipeline.currentStep > 0 && pipeline.currentStep < pipeline.steps.length) {
          this.handoffCounter++;
          this.handoffs.unshift({
            id: `handoff-${this.handoffCounter}`,
            fromAgent: pipeline.steps[pipeline.currentStep - 1],
            toAgent: pipeline.steps[pipeline.currentStep],
            timestamp: new Date().toISOString(),
            reason: pipeline.name,
            status: 'completed',
          });
          if (this.handoffs.length > 50) this.handoffs.pop();
        }

        if (pipeline.currentStep >= pipeline.steps.length) {
          pipeline.status = Math.random() < 0.9 ? 'completed' : 'failed';
          pipeline.progress = 100;
        }
      }
    }
  }

  getState(agents: Agent[]): OrchestrationState {
    const nodes: AgentNode[] = agents.map(a => ({
      id: a.id,
      name: a.name,
      model: a.model,
      status: a.status,
      currentTask: a.currentTask,
    }));

    // Determine which edges are active based on current pipelines
    const activeEdges = new Set<string>();
    for (const pipeline of this.pipelines) {
      if (pipeline.status !== 'active' || pipeline.currentStep >= pipeline.steps.length - 1) continue;
      const from = pipeline.steps[pipeline.currentStep];
      const to = pipeline.steps[pipeline.currentStep + 1];
      activeEdges.add(`${from}-${to}`);
    }

    const edges: AgentEdge[] = this.edgeDefinitions.map((def, i) => ({
      id: `edge-${i}`,
      ...def,
      active: activeEdges.has(`${def.from}-${def.to}`),
    }));

    return {
      nodes,
      edges,
      pipelines: this.pipelines.slice(0, 10),
      handoffs: this.handoffs.slice(0, 20),
    };
  }
}
