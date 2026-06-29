"use client";

import { useEffect, useState } from "react";
import { getAuditLogs, getAuditStats } from "@/lib/api";
import { AdminGuard } from "@/lib/auth-guard";

interface AuditEntry {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  resource: string;
  resource_id: number | null;
  detail: string | null;
  ip_address: string | null;
  created_at: string;
}

interface AuditStats {
  total_entries: number;
  by_action: Record<string, number>;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  LOGIN: "bg-purple-100 text-purple-800",
  LOGIN_FAILED: "bg-red-200 text-red-900",
  REGISTER: "bg-teal-100 text-teal-800",
  PASSWORD_CHANGE: "bg-yellow-100 text-yellow-800",
  PROFILE_UPDATE: "bg-indigo-100 text-indigo-800",
  ASSIGN_ROLE: "bg-orange-100 text-orange-800",
  REMOVE_ROLE: "bg-pink-100 text-pink-800",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [filterAction, setFilterAction] = useState("");
  const [filterResource, setFilterResource] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (filterAction) params.action = filterAction;
      if (filterResource) params.resource = filterResource;
      const data = await getAuditLogs(params);
      setLogs(data || []);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const data = await getAuditStats();
      setStats(data);
    } catch {
      setStats(null);
    }
  };

  useEffect(() => {
    loadLogs();
    loadStats();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [filterAction, filterResource]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const parseDetail = (detail: string | null): string => {
    if (!detail) return "-";
    try {
      const obj = JSON.parse(detail);
      return Object.entries(obj)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
    } catch {
      return detail;
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Audit Log
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Alle Systemaktivitäten und Änderungen
              </p>
            </div>
            <a
              href="/admin"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              ← Admin Panel
            </a>
          </div>

          {/* Stats cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {stats.total_entries}
                </div>
                <div className="text-xs text-gray-500">Gesamt</div>
              </div>
              {Object.entries(stats.by_action).map(([action, count]) => (
                <div key={action} className="bg-white rounded-lg shadow p-4">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-500">{action}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Aktion
              </label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm"
              >
                <option value="">Alle</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                <option value="REGISTER">REGISTER</option>
                <option value="PASSWORD_CHANGE">PASSWORD_CHANGE</option>
                <option value="PROFILE_UPDATE">PROFILE_UPDATE</option>
                <option value="ASSIGN_ROLE">ASSIGN_ROLE</option>
                <option value="REMOVE_ROLE">REMOVE_ROLE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Ressource
              </label>
              <select
                value={filterResource}
                onChange={(e) => setFilterResource(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm"
              >
                <option value="">Alle</option>
                <option value="auth">auth</option>
                <option value="user">user</option>
                <option value="department">department</option>
                <option value="role">role</option>
                <option value="role_permissions">role_permissions</option>
                <option value="user_role">user_role</option>
              </select>
            </div>
            <button
              onClick={() => {
                setFilterAction("");
                setFilterResource("");
              }}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
            >
              Filter zurücksetzen
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Laden...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Keine Einträge gefunden.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        Zeitpunkt
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        Benutzer
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        Aktion
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        Ressource
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        Details
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        IP
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {log.username || "-"}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              ACTION_COLORS[log.action] ||
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {log.resource}
                        </td>
                        <td className="px-4 py-2 text-gray-500">
                          {log.resource_id ?? "-"}
                        </td>
                        <td className="px-4 py-2 text-gray-600 max-w-xs truncate">
                          {parseDetail(log.detail)}
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-xs">
                          {log.ip_address || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
