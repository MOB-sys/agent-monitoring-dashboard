import { memo, useMemo } from 'react';
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Workflow,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { useMonitoringStore } from '../../store/useMonitoringStore';
import { getStatusColor, getStatusBgColor } from '../../lib/utils';
import type { AgentNode, AgentEdge, Pipeline, HandoffEvent } from '../../types';

const NODE_BORDER_COLORS: Record<string, string> = {
  running: 'border-emerald-500',
  idle: 'border-slate-600',
  error: 'border-red-500',
  stopped: 'border-slate-700',
};

const DEFAULT_NODES: AgentNode[] = [
  { id: 'code-gen', name: 'Code Generator', model: 'claude-opus', status: 'idle', currentTask: null },
  { id: 'code-review', name: 'Code Reviewer', model: 'claude-sonnet', status: 'idle', currentTask: null },
  { id: 'test-runner', name: 'Test Runner', model: 'claude-haiku', status: 'idle', currentTask: null },
  { id: 'docs', name: 'Documentation', model: 'claude-haiku', status: 'idle', currentTask: null },
  { id: 'devops', name: 'DevOps Agent', model: 'claude-sonnet', status: 'idle', currentTask: null },
];

const DEFAULT_EDGES: AgentEdge[] = [
  { id: 'e1', from: 'code-gen', to: 'code-review', label: 'review', active: false },
  { id: 'e2', from: 'code-review', to: 'test-runner', label: 'test', active: false },
  { id: 'e3', from: 'test-runner', to: 'docs', label: 'document', active: false },
  { id: 'e4', from: 'docs', to: 'devops', label: 'deploy', active: false },
  { id: 'e5', from: 'code-review', to: 'code-gen', label: 'feedback', active: false },
];

function NodeCard({ node }: { node: AgentNode }) {
  const borderColor = NODE_BORDER_COLORS[node.status] ?? 'border-slate-600';
  const statusDot = node.status === 'running'
    ? 'bg-emerald-400 animate-pulse'
    : node.status === 'error'
      ? 'bg-red-400'
      : 'bg-slate-500';

  return (
    <div
      className={`w-36 h-24 bg-slate-800 rounded-xl border-2 ${borderColor} flex flex-col items-center justify-center px-2 transition-colors`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`w-2 h-2 rounded-full ${statusDot}`} />
        <span className="text-xs text-slate-400 capitalize">{node.status}</span>
      </div>
      <span className="text-sm font-medium text-slate-100 text-center leading-tight">
        {node.name}
      </span>
      {node.currentTask && (
        <span className="text-[10px] text-slate-500 mt-1 truncate max-w-full text-center">
          {node.currentTask}
        </span>
      )}
    </div>
  );
}

function EdgeArrow({ edge }: { edge: AgentEdge }) {
  return (
    <div className="flex flex-col items-center justify-center mx-1">
      <span
        className={`text-lg ${
          edge.active ? 'text-blue-400 animate-pulse' : 'text-slate-600'
        }`}
      >
        &#9654;
      </span>
      <span
        className={`text-[10px] ${
          edge.active ? 'text-blue-400' : 'text-slate-600'
        }`}
      >
        {edge.label}
      </span>
    </div>
  );
}

function PipelineCard({ pipeline }: { pipeline: Pipeline }) {
  const progressColor =
    pipeline.status === 'completed'
      ? 'bg-emerald-500'
      : pipeline.status === 'failed'
        ? 'bg-red-500'
        : 'bg-blue-500';

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 mb-3 border border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-200">{pipeline.name}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBgColor(pipeline.status)}`}
        >
          {pipeline.status}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${progressColor}`}
          style={{ width: `${pipeline.progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex flex-wrap gap-1.5">
        {pipeline.steps.map((step, index) => {
          const isCurrentStep = index === pipeline.currentStep;
          const isCompleted = index < pipeline.currentStep;
          const stepClass = isCurrentStep
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : isCompleted
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-700/50 text-slate-500 border border-slate-700';

          return (
            <span
              key={index}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${stepClass}`}
            >
              {step}
            </span>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 mt-2">
        Step {pipeline.currentStep + 1} of {pipeline.steps.length}
        {' '}&middot;{' '}
        {pipeline.progress.toFixed(0)}% complete
      </p>
    </div>
  );
}

function HandoffCard({ handoff }: { handoff: HandoffEvent }) {
  const statusBadge: Record<string, string> = {
    completed: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    pending: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    failed: 'bg-red-500/20 text-red-400 border border-red-500/30',
  };

  return (
    <div className="flex items-start gap-3 py-3 px-3 rounded-lg bg-slate-800/50 border border-slate-800">
      <div className="flex-shrink-0 mt-0.5">
        <ArrowRight className={`w-4 h-4 ${
          handoff.status === 'completed'
            ? 'text-emerald-400'
            : handoff.status === 'pending'
              ? 'text-amber-400'
              : 'text-red-400'
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-200">{handoff.fromAgent}</span>
          <ArrowRight className="w-3 h-3 text-slate-500" />
          <span className="text-sm font-medium text-slate-200">{handoff.toAgent}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              statusBadge[handoff.status] ?? statusBadge.pending
            }`}
          >
            {handoff.status}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">{handoff.reason}</p>
        <p className="text-xs text-slate-600 mt-0.5">
          {format(new Date(handoff.timestamp), 'MMM d, HH:mm:ss')}
        </p>
      </div>
    </div>
  );
}

export const OrchestrationView = memo(function OrchestrationView() {
  const orchestration = useMonitoringStore((s) => s.orchestration);

  const nodes = useMemo(
    () => orchestration?.nodes ?? DEFAULT_NODES,
    [orchestration]
  );
  const edges = useMemo(
    () => orchestration?.edges ?? DEFAULT_EDGES,
    [orchestration]
  );
  const pipelines = useMemo(
    () => orchestration?.pipelines ?? [],
    [orchestration]
  );
  const handoffs = useMemo(
    () => orchestration?.handoffs ?? [],
    [orchestration]
  );

  const activePipelines = useMemo(
    () => pipelines.filter((p) => p.status === 'active').length,
    [pipelines]
  );
  const completedPipelines = useMemo(
    () => pipelines.filter((p) => p.status === 'completed').length,
    [pipelines]
  );
  const failedPipelines = useMemo(
    () => pipelines.filter((p) => p.status === 'failed').length,
    [pipelines]
  );

  // Build the flow: interleave nodes with edges
  const mainFlowNodes = useMemo(() => {
    // Use the first 5 nodes for the main flow, matching the default order
    return nodes.slice(0, 5);
  }, [nodes]);

  const mainFlowEdges = useMemo(() => {
    // Get edges for the main forward flow (not feedback)
    return edges.filter((e) => e.label !== 'feedback').slice(0, 4);
  }, [edges]);

  const feedbackEdge = useMemo(
    () => edges.find((e) => e.label === 'feedback'),
    [edges]
  );

  const sortedHandoffs = useMemo(
    () => [...handoffs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [handoffs]
  );

  if (!orchestration) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-100">Orchestration</h2>

        {/* Show defaults with empty state messaging */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">Active Pipelines</span>
              <div className="p-2 rounded-lg bg-blue-400/10">
                <Workflow className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-100">0</div>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">Completed</span>
              <div className="p-2 rounded-lg bg-emerald-400/10">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-400">0</div>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">Failed</span>
              <div className="p-2 rounded-lg bg-red-400/10">
                <XCircle className="w-4 h-4 text-red-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-red-400">0</div>
          </div>
        </div>

        {/* Default workflow graph */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-6">
            <GitBranch className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-100">Agent Workflow</h3>
          </div>
          <div className="flex items-center justify-center overflow-x-auto py-4">
            {DEFAULT_NODES.map((node, i) => (
              <div key={node.id} className="flex items-center">
                <NodeCard node={node} />
                {i < DEFAULT_NODES.length - 1 && i < DEFAULT_EDGES.length && (
                  <EdgeArrow edge={DEFAULT_EDGES[i]} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-4 text-xs text-slate-500">
            Waiting for orchestration data...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-100">Orchestration</h2>

      {/* Pipeline Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Active Pipelines</span>
            <div className="p-2 rounded-lg bg-blue-400/10">
              <Workflow className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-400">{activePipelines}</div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Completed</span>
            <div className="p-2 rounded-lg bg-emerald-400/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{completedPipelines}</div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Failed</span>
            <div className="p-2 rounded-lg bg-red-400/10">
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-400">{failedPipelines}</div>
        </div>
      </div>

      {/* Agent Workflow Graph */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
        <div className="flex items-center gap-3 mb-6">
          <GitBranch className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-medium text-slate-100">Agent Workflow</h3>
        </div>

        {/* Main forward flow */}
        <div className="flex items-center justify-center overflow-x-auto py-4">
          {mainFlowNodes.map((node, i) => (
            <div key={node.id} className="flex items-center">
              <NodeCard node={node} />
              {i < mainFlowNodes.length - 1 && i < mainFlowEdges.length && (
                <EdgeArrow edge={mainFlowEdges[i]} />
              )}
            </div>
          ))}
        </div>

        {/* Feedback loop indicator */}
        {feedbackEdge && (
          <div className="flex items-center justify-center mt-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                feedbackEdge.active
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                  : 'border-slate-700 bg-slate-800/50 text-slate-500'
              }`}
            >
              <span className="text-xs">Code Reviewer</span>
              <span className={`text-sm ${feedbackEdge.active ? 'animate-pulse' : ''}`}>
                &#8634;
              </span>
              <span className="text-xs">Code Generator</span>
              <span className="text-[10px] ml-1">(feedback)</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Row: Active Pipelines + Handoff History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Pipelines List */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-4">
            <Workflow className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-100">Pipelines</h3>
            <span className="text-sm text-slate-500">
              {pipelines.length} total
            </span>
          </div>

          {pipelines.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Workflow className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No pipelines</p>
              <p className="text-xs mt-1">Pipelines will appear here when started</p>
            </div>
          ) : (
            <div className="space-y-0">
              {pipelines.map((pipeline) => (
                <PipelineCard key={pipeline.id} pipeline={pipeline} />
              ))}
            </div>
          )}
        </div>

        {/* Handoff History */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-4">
            <ArrowRight className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-100">Handoff History</h3>
            <span className="text-sm text-slate-500">
              {handoffs.length} handoff{handoffs.length !== 1 ? 's' : ''}
            </span>
          </div>

          {sortedHandoffs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No handoffs yet</p>
              <p className="text-xs mt-1">Agent handoffs will appear here</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
              {sortedHandoffs.map((handoff) => (
                <HandoffCard key={handoff.id} handoff={handoff} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
