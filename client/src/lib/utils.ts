import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toFixed(0);
}

export function formatCost(cost: number): string {
  if (cost >= 1000) return '$' + (cost / 1000).toFixed(1) + 'K';
  if (cost >= 1) return '$' + cost.toFixed(2);
  return '$' + cost.toFixed(4);
}

export function formatLatency(ms: number): string {
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
  return ms.toFixed(0) + 'ms';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'running': return 'text-emerald-400';
    case 'idle': return 'text-slate-400';
    case 'error': return 'text-red-400';
    case 'stopped': return 'text-slate-600';
    case 'completed': return 'text-emerald-400';
    case 'failed': return 'text-red-400';
    case 'queued': return 'text-amber-400';
    default: return 'text-slate-400';
  }
}

export function getStatusBgColor(status: string): string {
  switch (status) {
    case 'running': return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
    case 'idle': return 'bg-slate-400/10 text-slate-400 border-slate-400/20';
    case 'error': return 'bg-red-400/10 text-red-400 border-red-400/20';
    case 'stopped': return 'bg-slate-600/10 text-slate-600 border-slate-600/20';
    case 'completed': return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
    case 'failed': return 'bg-red-400/10 text-red-400 border-red-400/20';
    case 'queued': return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
    default: return 'bg-slate-400/10 text-slate-400 border-slate-400/20';
  }
}
