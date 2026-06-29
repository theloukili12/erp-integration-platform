"use client";

import { useEffect, useState } from "react";
import {
  getOrders,
  getOrderStats,
  createOrder,
  transitionOrder,
  deleteOrder,
  getDepartments,
  getUsers,
} from "@/lib/api";
import { AuthGuard } from "@/lib/auth-guard";

interface Order {
  id: number;
  order_number: string;
  article: string;
  quantity: number;
  status: string;
  priority: string;
  department_id: number | null;
  assigned_to: number | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_department: Record<string, number>;
  overdue: number;
}

const STATUS_COLORS: Record<string, string> = {
  GEPLANT: "bg-gray-100 text-gray-800",
  IN_BEARBEITUNG: "bg-blue-100 text-blue-800",
  QUALITAETSPRUEFUNG: "bg-yellow-100 text-yellow-800",
  ABGESCHLOSSEN: "bg-green-100 text-green-800",
  FEHLGESCHLAGEN: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  GEPLANT: "Geplant",
  IN_BEARBEITUNG: "In Bearbeitung",
  QUALITAETSPRUEFUNG: "Qualitätsprüfung",
  ABGESCHLOSSEN: "Abgeschlossen",
  FEHLGESCHLAGEN: "Fehlgeschlagen",
};

const PRIORITY_COLORS: Record<string, string> = {
  HOCH: "bg-red-50 text-red-700 border-red-200",
  MITTEL: "bg-yellow-50 text-yellow-700 border-yellow-200",
  NIEDRIG: "bg-green-50 text-green-700 border-green-200",
};

const WORKFLOW: Record<string, string[]> = {
  GEPLANT: ["IN_BEARBEITUNG"],
  IN_BEARBEITUNG: ["QUALITAETSPRUEFUNG", "FEHLGESCHLAGEN"],
  QUALITAETSPRUEFUNG: ["ABGESCHLOSSEN", "FEHLGESCHLAGEN", "IN_BEARBEITUNG"],
  ABGESCHLOSSEN: [],
  FEHLGESCHLAGEN: ["IN_BEARBEITUNG"],
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: number; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<Order | null>(null);
  const [transitionComment, setTransitionComment] = useState("");

  // Create form
  const [newOrder, setNewOrder] = useState({
    order_number: "",
    article: "",
    quantity: 1,
    priority: "MITTEL",
    department_id: "",
    assigned_to: "",
    due_date: "",
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      const [ordersData, statsData] = await Promise.all([
        getOrders(params),
        getOrderStats(),
      ]);
      setOrders(ordersData?.items || []);
      setStats(statsData);
    } catch {
      setOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    Promise.all([getDepartments(), getUsers()]).then(([depts, usrs]) => {
      setDepartments(depts || []);
      setUsers(usrs || []);
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [filterStatus, filterPriority]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createOrder({
        ...newOrder,
        quantity: Number(newOrder.quantity),
        department_id: newOrder.department_id ? Number(newOrder.department_id) : null,
        assigned_to: newOrder.assigned_to ? Number(newOrder.assigned_to) : null,
        due_date: newOrder.due_date || null,
      });
      setShowCreate(false);
      setNewOrder({ order_number: "", article: "", quantity: 1, priority: "MITTEL", department_id: "", assigned_to: "", due_date: "", notes: "" });
      loadData();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleTransition = async (order: Order, newStatus: string) => {
    try {
      await transitionOrder(order.id, newStatus, transitionComment || undefined);
      setTransitionTarget(null);
      setTransitionComment("");
      loadData();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleDelete = async (order: Order) => {
    if (!confirm(`Auftrag ${order.order_number} löschen?`)) return;
    try {
      await deleteOrder(order.id);
      loadData();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const isOverdue = (order: Order) => {
    if (!order.due_date) return false;
    if (["ABGESCHLOSSEN", "FEHLGESCHLAGEN"].includes(order.status)) return false;
    return new Date(order.due_date) < new Date();
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Auftragsverwaltung</h1>
              <p className="text-sm text-gray-500 mt-1">Fertigungsaufträge verwalten und Status verfolgen</p>
            </div>
            <div className="flex gap-2">
              <a href="/" className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                ← Dashboard
              </a>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Neuer Auftrag
              </button>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4 border">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-500">Gesamt</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-100">
                <div className="text-2xl font-bold text-blue-700">{stats.by_status?.IN_BEARBEITUNG || 0}</div>
                <div className="text-xs text-gray-500">In Bearbeitung</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-yellow-100">
                <div className="text-2xl font-bold text-yellow-700">{stats.by_status?.QUALITAETSPRUEFUNG || 0}</div>
                <div className="text-xs text-gray-500">QS-Prüfung</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-green-100">
                <div className="text-2xl font-bold text-green-700">{stats.by_status?.ABGESCHLOSSEN || 0}</div>
                <div className="text-xs text-gray-500">Abgeschlossen</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-red-100">
                <div className="text-2xl font-bold text-red-700">{stats.overdue}</div>
                <div className="text-xs text-gray-500">Überfällig</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm"
              >
                <option value="">Alle</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priorität</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm"
              >
                <option value="">Alle</option>
                <option value="HOCH">Hoch</option>
                <option value="MITTEL">Mittel</option>
                <option value="NIEDRIG">Niedrig</option>
              </select>
            </div>
            <button
              onClick={() => { setFilterStatus(""); setFilterPriority(""); }}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
            >
              Zurücksetzen
            </button>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Laden...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Keine Aufträge gefunden.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Auftragsnr.</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Artikel</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Menge</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Priorität</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Fällig</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr key={order.id} className={`hover:bg-gray-50 ${isOverdue(order) ? "bg-red-50" : ""}`}>
                        <td className="px-4 py-3 font-medium text-gray-900">{order.order_number}</td>
                        <td className="px-4 py-3 text-gray-700">{order.article}</td>
                        <td className="px-4 py-3 text-gray-700">{order.quantity}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status] || "bg-gray-100"}`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${PRIORITY_COLORS[order.priority] || ""}`}>
                            {order.priority}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-xs ${isOverdue(order) ? "text-red-600 font-medium" : "text-gray-500"}`}>
                          {formatDate(order.due_date)}
                          {isOverdue(order) && " ⚠️"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {(WORKFLOW[order.status] || []).length > 0 && (
                              <button
                                onClick={() => setTransitionTarget(order)}
                                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                              >
                                Status →
                              </button>
                            )}
                            {["GEPLANT", "FEHLGESCHLAGEN"].includes(order.status) && (
                              <button
                                onClick={() => handleDelete(order)}
                                className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
                              >
                                Löschen
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Create Modal */}
          {showCreate && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Neuer Auftrag</h2>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Auftragsnummer *</label>
                      <input
                        required
                        value={newOrder.order_number}
                        onChange={(e) => setNewOrder({ ...newOrder, order_number: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm"
                        placeholder="FA-2026-001"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Artikel *</label>
                      <input
                        required
                        value={newOrder.article}
                        onChange={(e) => setNewOrder({ ...newOrder, article: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm"
                        placeholder="Bauteil XY"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Menge *</label>
                      <input
                        required
                        type="number"
                        min={1}
                        value={newOrder.quantity}
                        onChange={(e) => setNewOrder({ ...newOrder, quantity: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Priorität</label>
                      <select
                        value={newOrder.priority}
                        onChange={(e) => setNewOrder({ ...newOrder, priority: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm"
                      >
                        <option value="HOCH">Hoch</option>
                        <option value="MITTEL">Mittel</option>
                        <option value="NIEDRIG">Niedrig</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fälligkeitsdatum</label>
                      <input
                        type="date"
                        value={newOrder.due_date}
                        onChange={(e) => setNewOrder({ ...newOrder, due_date: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Abteilung</label>
                      <select
                        value={newOrder.department_id}
                        onChange={(e) => setNewOrder({ ...newOrder, department_id: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm"
                      >
                        <option value="">-- Keine --</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Zugewiesen an</label>
                      <select
                        value={newOrder.assigned_to}
                        onChange={(e) => setNewOrder({ ...newOrder, assigned_to: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm"
                      >
                        <option value="">-- Niemand --</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notizen</label>
                    <textarea
                      value={newOrder.notes}
                      onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm"
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300">
                      Abbrechen
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                      Erstellen
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Transition Modal */}
          {transitionTarget && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Status ändern</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Auftrag <span className="font-medium">{transitionTarget.order_number}</span> —
                  aktueller Status: <span className="font-medium">{STATUS_LABELS[transitionTarget.status]}</span>
                </p>
                <div className="space-y-2 mb-4">
                  {(WORKFLOW[transitionTarget.status] || []).map((nextStatus) => (
                    <button
                      key={nextStatus}
                      onClick={() => handleTransition(transitionTarget, nextStatus)}
                      className={`w-full text-left px-4 py-3 rounded-lg border hover:shadow-sm transition-all ${STATUS_COLORS[nextStatus]}`}
                    >
                      → {STATUS_LABELS[nextStatus]}
                    </button>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kommentar (optional)</label>
                  <input
                    value={transitionComment}
                    onChange={(e) => setTransitionComment(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Grund für Statusänderung..."
                  />
                </div>
                <button
                  onClick={() => { setTransitionTarget(null); setTransitionComment(""); }}
                  className="w-full px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
