import { memo, useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Clock,
  Filter,
  Users,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import { useMonitoringStore } from '../../store/useMonitoringStore';
import type { AuditEntry } from '../../types';

const API_BASE = 'http://localhost:3001/api/audit';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  POST: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  PUT: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

interface AuditStats {
  totalEntries: number;
  avgResponseTime: number;
  methodBreakdown: Record<string, number>;
  userBreakdown: Record<string, number>;
}

export const AuditLog = memo(function AuditLog() {
  const token = useMonitoringStore((s) => s.token);

  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState<string>('All');
  const [pathFilter, setPathFilter] = useState<string>('');

  const headers = useMemo(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const fetchData = useCallback(async () => {
    try {
      let logsUrl = `${API_BASE}/logs?limit=100`;
      if (methodFilter !== 'All') logsUrl += `&method=${methodFilter}`;
      if (pathFilter.trim()) logsUrl += `&path=${encodeURIComponent(pathFilter.trim())}`;

      const [logsRes, statsRes] = await Promise.all([
        fetch(logsUrl, { headers }),
        fetch(`${API_BASE}/stats`, { headers }),
      ]);

      if (logsRes.ok) setLogs(await logsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error('Failed to fetch audit data:', err);
    } finally {
      setLoading(false);
    }
  }, [headers, methodFilter, pathFilter]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const methodEntries = useMemo(() => {
    if (!stats?.methodBreakdown) return [];
    return Object.entries(stats.methodBreakdown).sort((a, b) => b[1] - a[1]);
  }, [stats]);

  const maxMethodCount = useMemo(
    () => (methodEntries.length > 0 ? Math.max(...methodEntries.map(([, c]) => c)) : 1),
    [methodEntries]
  );

  const userEntries = useMemo(() => {
    if (!stats?.userBreakdown) return [];
    return Object.entries(stats.userBreakdown).sort((a, b) => b[1] - a[1]);
  }, [stats]);

  function getStatusColor(code: number): string {
    if (code >= 200 && code < 300) return 'text-emerald-400';
    if (code >= 400 && code < 500) return 'text-amber-400';
    if (code >= 500) return 'text-red-400';
    return 'text-slate-400';
  }

  function getResponseTimeColor(ms: number): string {
    if (ms < 50) return 'text-emerald-400';
    if (ms < 200) return 'text-amber-400';
    return 'text-red-400';
  }

  const METHOD_BAR_COLORS: Record<string, string> = {
    GET: 'bg-blue-500',
    POST: 'bg-emerald-500',
    PUT: 'bg-amber-500',
    DELETE: 'bg-red-500',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-100">Audit Log</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-900 rounded-xl border border-slate-800 p-5 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-24 mb-3" />
              <div className="h-8 bg-slate-800 rounded w-16" />
            </div>
          ))}
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 animate-pulse h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-100">Audit Log</h2>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Entries */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Total Entries</span>
            <div className="p-2 rounded-lg bg-blue-400/10">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {stats?.totalEntries ?? 0}
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Avg Response Time</span>
            <div className="p-2 rounded-lg bg-amber-400/10">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {stats ? `${stats.avgResponseTime.toFixed(0)}ms` : '--'}
          </div>
        </div>

        {/* Methods */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Methods</span>
            <div className="p-2 rounded-lg bg-violet-400/10">
              <BarChart3 className="w-4 h-4 text-violet-400" />
            </div>
          </div>
          <div className="space-y-1.5">
            {methodEntries.map(([method, count]) => (
              <div key={method} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-12">{method}</span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${METHOD_BAR_COLORS[method] ?? 'bg-slate-500'}`}
                    style={{ width: `${(count / maxMethodCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Users */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Users</span>
            <div className="p-2 rounded-lg bg-emerald-400/10">
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="space-y-1">
            {userEntries.slice(0, 4).map(([user, count]) => (
              <div key={user} className="flex items-center justify-between">
                <span className="text-xs text-slate-300 truncate">{user || 'anonymous'}</span>
                <span className="text-xs text-slate-500">{count}</span>
              </div>
            ))}
            {userEntries.length === 0 && (
              <span className="text-xs text-slate-500">No user data</span>
            )}
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400">Filters:</span>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Method</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="All">All</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-slate-500 mb-1">Path</label>
            <input
              type="text"
              value={pathFilter}
              onChange={(e) => setPathFilter(e.target.value)}
              placeholder="Filter by path..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-medium text-slate-100">Request Log</h3>
          <span className="text-sm text-slate-500">
            {logs.length} entries
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No audit entries found</p>
            <p className="text-xs mt-1">Entries will appear here as requests are made</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-900 z-10">
                <tr className="border-b border-slate-800">
                  <th className="pb-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Time</th>
                  <th className="pb-3 text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                  <th className="pb-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="pb-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Method</th>
                  <th className="pb-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Path</th>
                  <th className="pb-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Status</th>
                  <th className="pb-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Response Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30"
                  >
                    <td className="py-2.5 text-xs text-slate-300 font-mono">
                      {format(new Date(entry.timestamp), 'HH:mm:ss')}
                    </td>
                    <td className="py-2.5 text-xs">
                      {entry.username ? (
                        <span className="text-slate-300">{entry.username}</span>
                      ) : (
                        <span className="text-slate-600">anonymous</span>
                      )}
                    </td>
                    <td className="py-2.5 text-xs text-slate-400">
                      {entry.role ?? '-'}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          METHOD_COLORS[entry.method] ?? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}
                      >
                        {entry.method}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-slate-300 font-mono max-w-[250px] truncate">
                      {entry.path}
                    </td>
                    <td className={`py-2.5 text-xs text-right font-mono ${getStatusColor(entry.statusCode)}`}>
                      {entry.statusCode}
                    </td>
                    <td className={`py-2.5 text-xs text-right font-mono ${getResponseTimeColor(entry.responseTime)}`}>
                      {entry.responseTime.toFixed(0)}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});
