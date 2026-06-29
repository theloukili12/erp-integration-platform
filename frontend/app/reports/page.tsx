"use client";

import { useEffect, useState } from "react";
import {
  getCompanyReport,
  getDepartmentReport,
  getDepartments,
  exportOrdersCsvUrl,
  exportAuditCsvUrl,
} from "@/lib/api";
import { AuthGuard } from "@/lib/auth-guard";

interface CompanyData {
  orders: {
    total: number;
    open: number;
    completed: number;
    failed: number;
    overdue: number;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
  };
  performance: {
    efficiency_percent: number;
    avg_throughput_hours: number;
    department_load: Record<string, number>;
  };
  trends: {
    orders_per_day_7d: Record<string, number>;
  };
  workforce: {
    total_users: number;
    active_users: number;
  };
}

interface DeptReport {
  department: { id: number; name: string };
  orders: {
    total: number;
    planned: number;
    in_progress: number;
    in_qa: number;
    completed: number;
    failed: number;
    overdue: number;
    by_priority: Record<string, number>;
  };
  metrics: {
    error_rate_percent: number;
    delivery_rate_percent: number;
    avg_throughput_hours: number;
  };
}

const STATUS_LABELS: Record<string, string> = {
  GEPLANT: "Geplant",
  IN_BEARBEITUNG: "In Bearbeitung",
  QUALITAETSPRUEFUNG: "QS-Prüfung",
  ABGESCHLOSSEN: "Abgeschlossen",
  FEHLGESCHLAGEN: "Fehlgeschlagen",
};

export default function ReportsPage() {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [deptReports, setDeptReports] = useState<DeptReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"unternehmen" | "abteilungen" | "export">("unternehmen");

  useEffect(() => {
    const load = async () => {
      try {
        const [companyData, depts] = await Promise.all([
          getCompanyReport(),
          getDepartments(),
        ]);
        setCompany(companyData);

        // Load reports for each department
        if (depts?.length) {
          const reports = await Promise.all(
            depts.map((d: { id: number }) => getDepartmentReport(d.id))
          );
          setDeptReports(reports.filter(Boolean));
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-gray-400">Berichte werden geladen...</p>
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Berichte & Analysen</h1>
              <p className="text-sm text-gray-500 mt-1">Unternehmens-KPIs und Abteilungsreports</p>
            </div>
            <a href="/" className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
              ← Dashboard
            </a>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-lg shadow-sm p-1 mb-6 w-fit">
            {([
              ["unternehmen", "Unternehmen"],
              ["abteilungen", "Abteilungen"],
              ["export", "Export"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-5 py-2 rounded text-sm font-medium transition-colors ${
                  tab === key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Unternehmen Tab */}
          {tab === "unternehmen" && company && (
            <div className="space-y-6">
              {/* Main KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KpiCard label="Gesamt Aufträge" value={company.orders.total} />
                <KpiCard label="Offen" value={company.orders.open} color="blue" />
                <KpiCard label="Abgeschlossen" value={company.orders.completed} color="green" />
                <KpiCard label="Überfällig" value={company.orders.overdue} color="red" />
                <KpiCard label="Effizienz" value={`${company.performance.efficiency_percent}%`} color="purple" />
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-1">Durchschnittliche Durchlaufzeit</h3>
                  <div className="text-3xl font-bold text-blue-700 mt-2">
                    {company.performance.avg_throughput_hours}h
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Von Erstellung bis Abschluss</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-1">Produktionseffizienz</h3>
                  <div className="text-3xl font-bold text-green-700 mt-2">
                    {company.performance.efficiency_percent}%
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Abgeschlossen / (Abgeschlossen + Fehlgeschlagen)</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-1">Belegschaft</h3>
                  <div className="text-3xl font-bold text-gray-900 mt-2">
                    {company.workforce.active_users}/{company.workforce.total_users}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Aktive Mitarbeiter</p>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Orders by Status */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Aufträge nach Status</h3>
                  <div className="space-y-3">
                    {Object.entries(company.orders.by_status).map(([status, count]) => {
                      const max = Math.max(...Object.values(company.orders.by_status));
                      return (
                        <div key={status} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 w-28 truncate">
                            {STATUS_LABELS[status] || status}
                          </span>
                          <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${max > 0 ? (count / max) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Department Load */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Abteilungsauslastung (offene Aufträge)</h3>
                  {Object.keys(company.performance.department_load).length === 0 ? (
                    <p className="text-sm text-gray-400">Keine offenen Aufträge zugewiesen</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(company.performance.department_load).map(([dept, count]) => {
                        const max = Math.max(...Object.values(company.performance.department_load));
                        return (
                          <div key={dept} className="flex items-center gap-3">
                            <span className="text-xs text-gray-600 w-24 truncate">{dept}</span>
                            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full"
                                style={{ width: `${max > 0 ? (count / max) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Trend: Orders per Day */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Neue Aufträge (letzte 7 Tage)</h3>
                {Object.keys(company.trends.orders_per_day_7d).length === 0 ? (
                  <p className="text-sm text-gray-400">Keine Daten</p>
                ) : (
                  <div className="flex items-end gap-3 h-32">
                    {Object.entries(company.trends.orders_per_day_7d).map(([day, count]) => {
                      const max = Math.max(...Object.values(company.trends.orders_per_day_7d));
                      const height = max > 0 ? (count / max) * 100 : 0;
                      return (
                        <div key={day} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs font-bold text-gray-700">{count}</span>
                          <div
                            className="w-full bg-blue-500 rounded-t"
                            style={{ height: `${Math.max(height, 8)}%` }}
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
            </div>
          )}

          {/* Abteilungen Tab */}
          {tab === "abteilungen" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {deptReports.map((r) => (
                <div key={r.department.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 text-lg">{r.department.name}</h3>
                    <a
                      href={`/departments/${r.department.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Details →
                    </a>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-lg font-bold text-gray-900">{r.orders.total}</div>
                      <div className="text-xs text-gray-500">Aufträge</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="text-lg font-bold text-green-700">{r.metrics.delivery_rate_percent}%</div>
                      <div className="text-xs text-gray-500">Liefertreue</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <div className="text-lg font-bold text-red-700">{r.metrics.error_rate_percent}%</div>
                      <div className="text-xs text-gray-500">Fehlerquote</div>
                    </div>
                  </div>

                  {/* Status breakdown */}
                  <div className="flex gap-2 flex-wrap">
                    {r.orders.planned > 0 && (
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">{r.orders.planned} Geplant</span>
                    )}
                    {r.orders.in_progress > 0 && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">{r.orders.in_progress} In Bearbeitung</span>
                    )}
                    {r.orders.in_qa > 0 && (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">{r.orders.in_qa} QS</span>
                    )}
                    {r.orders.completed > 0 && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">{r.orders.completed} Fertig</span>
                    )}
                    {r.orders.overdue > 0 && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">{r.orders.overdue} Überfällig</span>
                    )}
                  </div>

                  {r.metrics.avg_throughput_hours > 0 && (
                    <p className="text-xs text-gray-500 mt-3">
                      ⏱ Ø Durchlaufzeit: {r.metrics.avg_throughput_hours}h
                    </p>
                  )}
                </div>
              ))}
              {deptReports.length === 0 && (
                <p className="text-gray-400 col-span-2 text-center py-8">Keine Abteilungsdaten vorhanden</p>
              )}
            </div>
          )}

          {/* Export Tab */}
          {tab === "export" && (
            <div className="bg-white rounded-xl shadow-sm p-6 max-w-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Daten exportieren (CSV)</h3>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg hover:bg-gray-50">
                  <h4 className="font-medium text-gray-900">Alle Aufträge</h4>
                  <p className="text-xs text-gray-500 mb-2">Komplette Auftragsliste mit Status, Priorität, Abteilung</p>
                  <a
                    href={exportOrdersCsvUrl()}
                    className="inline-block px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    download
                  >
                    📥 CSV herunterladen
                  </a>
                </div>
                <div className="p-4 border rounded-lg hover:bg-gray-50">
                  <h4 className="font-medium text-gray-900">Offene Aufträge</h4>
                  <p className="text-xs text-gray-500 mb-2">Nur Aufträge die noch nicht abgeschlossen sind</p>
                  <div className="flex gap-2">
                    <a
                      href={exportOrdersCsvUrl({ status: "GEPLANT" })}
                      className="inline-block px-3 py-1.5 text-xs bg-gray-200 rounded hover:bg-gray-300"
                      download
                    >
                      Geplant
                    </a>
                    <a
                      href={exportOrdersCsvUrl({ status: "IN_BEARBEITUNG" })}
                      className="inline-block px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      download
                    >
                      In Bearbeitung
                    </a>
                    <a
                      href={exportOrdersCsvUrl({ status: "QUALITAETSPRUEFUNG" })}
                      className="inline-block px-3 py-1.5 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                      download
                    >
                      QS-Prüfung
                    </a>
                  </div>
                </div>
                <div className="p-4 border rounded-lg hover:bg-gray-50">
                  <h4 className="font-medium text-gray-900">Audit Log</h4>
                  <p className="text-xs text-gray-500 mb-2">Systemaktivitäten und Änderungsprotokoll</p>
                  <a
                    href={exportAuditCsvUrl()}
                    className="inline-block px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                    download
                  >
                    📥 Audit CSV herunterladen
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  const colors: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    red: "border-red-200 bg-red-50",
    purple: "border-purple-200 bg-purple-50",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color || ""] || "border-gray-200 bg-white"}`}>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
