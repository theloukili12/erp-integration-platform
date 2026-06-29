"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getDepartmentDashboard, getDepartmentReports } from "@/lib/api";
import { AuthGuard } from "@/lib/auth-guard";

interface TeamMember {
  id: number;
  username: string;
  full_name: string;
  email: string;
  is_active: boolean;
  roles: { id: number; name: string }[];
  created_at: string | null;
}

interface Activity {
  id: number;
  username: string | null;
  action: string;
  resource: string;
  resource_id: number | null;
  detail: string | null;
  created_at: string | null;
}

interface DashboardData {
  department: { id: number; name: string; description: string | null; created_at: string | null };
  kpis: {
    total_members: number;
    active_members: number;
    inactive_members: number;
    role_distribution: Record<string, number>;
  };
  team: TeamMember[];
  recent_activity: Activity[];
}

interface ReportsData {
  department: { id: number; name: string };
  activity_by_action: Record<string, number>;
  activity_by_day: Record<string, number>;
  top_active_users: { username: string; actions: number }[];
  total_actions: number;
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

const TABS = ["Übersicht", "Team", "Aktivität", "Berichte"] as const;

export default function DepartmentDashboardPage() {
  const params = useParams();
  const deptId = Number(params.id);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Übersicht");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deptId) return;
    Promise.all([
      getDepartmentDashboard(deptId),
      getDepartmentReports(deptId),
    ])
      .then(([dash, rep]) => {
        setDashboard(dash);
        setReports(rep);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deptId]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-gray-400">Laden...</p>
        </div>
      </AuthGuard>
    );
  }

  if (!dashboard) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-bold text-red-600">Abteilung nicht gefunden</h1>
            <a href="/departments" className="text-blue-600 hover:underline mt-2 inline-block">
              ← Zurück
            </a>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <span className="text-blue-700 font-bold text-xl">
                  {dashboard.department.name.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {dashboard.department.name}
                </h1>
                {dashboard.department.description && (
                  <p className="text-sm text-gray-500">
                    {dashboard.department.description}
                  </p>
                )}
              </div>
            </div>
            <a
              href="/departments"
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              ← Alle Abteilungen
            </a>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-lg shadow-sm p-1 mb-6 w-fit">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  tab === t
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {tab === "Übersicht" && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Mitglieder" value={dashboard.kpis.total_members} color="blue" />
                <KpiCard label="Aktiv" value={dashboard.kpis.active_members} color="green" />
                <KpiCard label="Inaktiv" value={dashboard.kpis.inactive_members} color="red" />
                <KpiCard label="Aktionen" value={reports?.total_actions || 0} color="purple" />
              </div>

              {/* Role Distribution + Top Users */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Rollenverteilung</h3>
                  {Object.keys(dashboard.kpis.role_distribution).length === 0 ? (
                    <p className="text-sm text-gray-400">Keine Rollen zugewiesen</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(dashboard.kpis.role_distribution).map(([role, count]) => (
                        <div key={role} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{role}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{
                                  width: `${(count / dashboard.kpis.total_members) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-6 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Aktivste Mitglieder</h3>
                  {!reports?.top_active_users?.length ? (
                    <p className="text-sm text-gray-400">Noch keine Aktivität</p>
                  ) : (
                    <div className="space-y-3">
                      {reports.top_active_users.map((u, i) => (
                        <div key={u.username} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                              {i + 1}
                            </span>
                            <span className="text-sm text-gray-700">{u.username}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {u.actions} Aktionen
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "Team" && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Benutzername</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">E-Mail</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Rollen</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Beigetreten</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dashboard.team.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        Keine Mitglieder in dieser Abteilung
                      </td>
                    </tr>
                  ) : (
                    dashboard.team.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {member.full_name}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{member.username}</td>
                        <td className="px-4 py-3 text-gray-600">{member.email}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {member.roles.length === 0 ? (
                              <span className="text-gray-400 text-xs">-</span>
                            ) : (
                              member.roles.map((r) => (
                                <span
                                  key={r.id}
                                  className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded"
                                >
                                  {r.name}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              member.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {member.is_active ? "Aktiv" : "Inaktiv"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {formatDate(member.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === "Aktivität" && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {dashboard.recent_activity.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  Noch keine Aktivität in dieser Abteilung
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Zeit</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Benutzer</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Aktion</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Ressource</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dashboard.recent_activity.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-500 text-xs whitespace-nowrap">
                          {formatDate(a.created_at)}
                        </td>
                        <td className="px-4 py-2 text-gray-700">{a.username || "-"}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              ACTION_COLORS[a.action] || "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {a.action}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{a.resource}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs max-w-xs truncate">
                          {a.detail || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === "Berichte" && (
            <div className="space-y-6">
              {/* Activity by Action */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Aktivität nach Typ</h3>
                {!reports || Object.keys(reports.activity_by_action).length === 0 ? (
                  <p className="text-sm text-gray-400">Keine Daten vorhanden</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(reports.activity_by_action)
                      .sort(([, a], [, b]) => b - a)
                      .map(([action, count]) => {
                        const maxCount = Math.max(...Object.values(reports.activity_by_action));
                        return (
                          <div key={action} className="flex items-center gap-3">
                            <span
                              className={`inline-block w-32 px-2 py-0.5 rounded text-xs font-medium text-center ${
                                ACTION_COLORS[action] || "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {action}
                            </span>
                            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{ width: `${(count / maxCount) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700 w-8 text-right">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Activity by Day */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Aktivität letzte 7 Tage</h3>
                {!reports || Object.keys(reports.activity_by_day).length === 0 ? (
                  <p className="text-sm text-gray-400">Keine Daten vorhanden</p>
                ) : (
                  <div className="flex items-end gap-2 h-32">
                    {Object.entries(reports.activity_by_day).map(([day, count]) => {
                      const maxDay = Math.max(...Object.values(reports.activity_by_day));
                      const height = maxDay > 0 ? (count / maxDay) * 100 : 0;
                      return (
                        <div key={day} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs font-medium text-gray-700">{count}</span>
                          <div
                            className="w-full bg-blue-500 rounded-t"
                            style={{ height: `${Math.max(height, 4)}%` }}
                          />
                          <span className="text-xs text-gray-400">
                            {new Date(day).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {reports?.total_actions || 0}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Gesamtaktionen</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {reports?.top_active_users?.length || 0}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Aktive Nutzer</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {Object.keys(reports?.activity_by_day || {}).length}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Aktive Tage</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    green: "bg-green-50 border-green-200 text-green-900",
    red: "bg-red-50 border-red-200 text-red-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900",
  };
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color] || colorMap.blue}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-70 mt-1">{label}</div>
    </div>
  );
}
