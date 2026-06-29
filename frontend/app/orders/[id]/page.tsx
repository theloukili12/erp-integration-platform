"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getOrder,
  transitionOrder,
  updateOrder,
  addOrderComment,
  getDepartments,
  getUsers,
} from "@/lib/api";
import { AuthGuard } from "@/lib/auth-guard";

interface HistoryEntry {
  id: number;
  action: string;
  username: string | null;
  detail: string | null;
  ip_address: string | null;
  created_at: string | null;
}

interface OrderDetail {
  id: number;
  order_number: string;
  article: string;
  quantity: number;
  status: string;
  priority: string;
  department_id: number | null;
  department_name: string | null;
  assigned_to: number | null;
  assignee_name: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  allowed_transitions: string[];
  history: HistoryEntry[];
}

const STATUS_LABELS: Record<string, string> = {
  GEPLANT: "Geplant",
  IN_BEARBEITUNG: "In Bearbeitung",
  QUALITAETSPRUEFUNG: "Qualitätsprüfung",
  ABGESCHLOSSEN: "Abgeschlossen",
  FEHLGESCHLAGEN: "Fehlgeschlagen",
};

const STATUS_COLORS: Record<string, string> = {
  GEPLANT: "bg-gray-100 text-gray-800 border-gray-300",
  IN_BEARBEITUNG: "bg-blue-100 text-blue-800 border-blue-300",
  QUALITAETSPRUEFUNG: "bg-yellow-100 text-yellow-800 border-yellow-300",
  ABGESCHLOSSEN: "bg-green-100 text-green-800 border-green-300",
  FEHLGESCHLAGEN: "bg-red-100 text-red-800 border-red-300",
};

const PRIORITY_COLORS: Record<string, string> = {
  HOCH: "bg-red-50 text-red-700 border-red-300",
  MITTEL: "bg-yellow-50 text-yellow-700 border-yellow-300",
  NIEDRIG: "bg-green-50 text-green-700 border-green-300",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Erstellt",
  UPDATE: "Bearbeitet",
  STATUS_CHANGE: "Statusänderung",
  COMMENT: "Kommentar",
  DELETE: "Gelöscht",
};

const ACTION_ICONS: Record<string, string> = {
  CREATE: "🆕",
  UPDATE: "✏️",
  STATUS_CHANGE: "🔄",
  COMMENT: "💬",
  DELETE: "🗑️",
};

const WORKFLOW_STEPS = ["GEPLANT", "IN_BEARBEITUNG", "QUALITAETSPRUEFUNG", "ABGESCHLOSSEN"];

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: number; full_name: string }[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [transitionComment, setTransitionComment] = useState("");

  const loadOrder = () => {
    getOrder(orderId)
      .then((data) => setOrder(data))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!orderId) return;
    loadOrder();
    Promise.all([getDepartments(), getUsers()]).then(([d, u]) => {
      setDepartments(d || []);
      setUsers(u || []);
    });
  }, [orderId]);

  const handleTransition = async (newStatus: string) => {
    try {
      await transitionOrder(orderId, newStatus, transitionComment || undefined);
      setTransitionComment("");
      loadOrder();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: Record<string, unknown> = {};
      if (editForm.article) data.article = editForm.article;
      if (editForm.quantity) data.quantity = Number(editForm.quantity);
      if (editForm.priority) data.priority = editForm.priority;
      if (editForm.department_id) data.department_id = editForm.department_id ? Number(editForm.department_id) : null;
      if (editForm.assigned_to) data.assigned_to = editForm.assigned_to ? Number(editForm.assigned_to) : null;
      if (editForm.due_date !== undefined) data.due_date = editForm.due_date || null;
      await updateOrder(orderId, data);
      setEditing(false);
      loadOrder();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await addOrderComment(orderId, comment);
      setComment("");
      loadOrder();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const parseDetail = (detail: string | null): Record<string, unknown> | null => {
    if (!detail) return null;
    try { return JSON.parse(detail); } catch { return null; }
  };

  const isOverdue = order && order.due_date &&
    !["ABGESCHLOSSEN", "FEHLGESCHLAGEN"].includes(order.status) &&
    new Date(order.due_date) < new Date();

  if (loading) {
    return <AuthGuard><div className="flex min-h-screen items-center justify-center"><p className="text-gray-400">Laden...</p></div></AuthGuard>;
  }

  if (!order) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-bold text-red-600">Auftrag nicht gefunden</h1>
            <a href="/orders" className="text-blue-600 hover:underline mt-2 inline-block">← Zurück</a>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const currentStep = WORKFLOW_STEPS.indexOf(order.status);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <a href="/orders" className="text-sm text-blue-600 hover:underline">← Aufträge</a>
              <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[order.status] || ""}`}>
                {STATUS_LABELS[order.status] || order.status}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${PRIORITY_COLORS[order.priority] || ""}`}>
                {order.priority}
              </span>
            </div>
            {!editing && order.status !== "ABGESCHLOSSEN" && (
              <button
                onClick={() => {
                  setEditForm({
                    article: order.article,
                    quantity: String(order.quantity),
                    priority: order.priority,
                    department_id: order.department_id ? String(order.department_id) : "",
                    assigned_to: order.assigned_to ? String(order.assigned_to) : "",
                    due_date: order.due_date ? order.due_date.split("T")[0] : "",
                  });
                  setEditing(true);
                }}
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Bearbeiten
              </button>
            )}
          </div>

          {/* Workflow Progress Bar */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Workflow</h3>
            <div className="flex items-center gap-2">
              {WORKFLOW_STEPS.map((step, i) => {
                const isCurrent = order.status === step;
                const isPast = currentStep > i || order.status === "ABGESCHLOSSEN";
                const isFailed = order.status === "FEHLGESCHLAGEN";
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                        isCurrent ? "bg-blue-600 text-white border-blue-600" :
                        isPast ? "bg-green-500 text-white border-green-500" :
                        "bg-white text-gray-400 border-gray-300"
                      }`}>
                        {isPast && !isCurrent ? "✓" : i + 1}
                      </div>
                      <span className={`text-xs mt-1 text-center ${isCurrent ? "font-medium text-blue-700" : "text-gray-400"}`}>
                        {STATUS_LABELS[step]}
                      </span>
                    </div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <div className={`h-0.5 w-full mx-1 mt-[-16px] ${isPast ? "bg-green-400" : "bg-gray-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
            {order.status === "FEHLGESCHLAGEN" && (
              <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                Auftrag ist fehlgeschlagen. Kann zur Nachbearbeitung zurückgesetzt werden.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Details + Edit */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Details */}
              {!editing ? (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Auftragsdetails</h3>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <dt className="text-gray-500">Artikel</dt>
                      <dd className="font-medium text-gray-900">{order.article}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Menge</dt>
                      <dd className="font-medium text-gray-900">{order.quantity.toLocaleString("de-DE")}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Abteilung</dt>
                      <dd className="font-medium text-gray-900">{order.department_name || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Zugewiesen an</dt>
                      <dd className="font-medium text-gray-900">{order.assignee_name || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Fälligkeitsdatum</dt>
                      <dd className={`font-medium ${isOverdue ? "text-red-600" : "text-gray-900"}`}>
                        {order.due_date ? new Date(order.due_date).toLocaleDateString("de-DE") : "-"}
                        {isOverdue && " (überfällig!)"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Erstellt</dt>
                      <dd className="text-gray-700">{formatDate(order.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Letzte Änderung</dt>
                      <dd className="text-gray-700">{formatDate(order.updated_at)}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Auftrag bearbeiten</h3>
                  <form onSubmit={handleUpdate} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Artikel</label>
                        <input value={editForm.article || ""} onChange={(e) => setEditForm({ ...editForm, article: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Menge</label>
                        <input type="number" value={editForm.quantity || ""} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Priorität</label>
                        <select value={editForm.priority || ""} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className="w-full border rounded px-3 py-2 text-sm">
                          <option value="HOCH">Hoch</option>
                          <option value="MITTEL">Mittel</option>
                          <option value="NIEDRIG">Niedrig</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Abteilung</label>
                        <select value={editForm.department_id || ""} onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })} className="w-full border rounded px-3 py-2 text-sm">
                          <option value="">-- Keine --</option>
                          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Zugewiesen an</label>
                        <select value={editForm.assigned_to || ""} onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })} className="w-full border rounded px-3 py-2 text-sm">
                          <option value="">-- Niemand --</option>
                          {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fälligkeitsdatum</label>
                      <input type="date" value={editForm.due_date || ""} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} className="w-full border rounded px-3 py-2 text-sm max-w-xs" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Speichern</button>
                      <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300">Abbrechen</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Notes */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Notizen & Kommentare</h3>
                {order.notes ? (
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-3 mb-4 font-sans">
                    {order.notes}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-400 mb-4">Noch keine Notizen.</p>
                )}
                <form onSubmit={handleComment} className="flex gap-2">
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Kommentar hinzufügen..."
                    className="flex-1 border rounded px-3 py-2 text-sm"
                  />
                  <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                    Senden
                  </button>
                </form>
              </div>

              {/* History / Timeline */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Verlauf</h3>
                {order.history.length === 0 ? (
                  <p className="text-sm text-gray-400">Noch keine Einträge.</p>
                ) : (
                  <div className="space-y-0">
                    {order.history.map((h, i) => {
                      const detail = parseDetail(h.detail);
                      return (
                        <div key={h.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                              {ACTION_ICONS[h.action] || "📋"}
                            </div>
                            {i < order.history.length - 1 && (
                              <div className="w-px flex-1 bg-gray-200 my-1" />
                            )}
                          </div>
                          <div className="pb-4 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {ACTION_LABELS[h.action] || h.action}
                              </span>
                              {h.username && (
                                <span className="text-xs text-gray-500">von {h.username}</span>
                              )}
                              <span className="text-xs text-gray-400 ml-auto">
                                {formatDate(h.created_at)}
                              </span>
                            </div>
                            {detail && (
                              <div className="text-xs text-gray-600 mt-0.5">
                                {detail.from && detail.to && (
                                  <span>{STATUS_LABELS[detail.from as string] || detail.from} → {STATUS_LABELS[detail.to as string] || detail.to}</span>
                                )}
                                {detail.comment && <span className="block">"{detail.comment}"</span>}
                                {detail.article && !detail.from && <span>Artikel: {detail.article as string}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar: Status Actions */}
            <div className="space-y-6">
              {/* Status Transitions */}
              {order.allowed_transitions.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Status ändern</h3>
                  <div className="space-y-2 mb-3">
                    {order.allowed_transitions.map((next) => (
                      <button
                        key={next}
                        onClick={() => handleTransition(next)}
                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium hover:shadow-sm transition-all ${STATUS_COLORS[next]}`}
                      >
                        → {STATUS_LABELS[next]}
                      </button>
                    ))}
                  </div>
                  <input
                    value={transitionComment}
                    onChange={(e) => setTransitionComment(e.target.value)}
                    placeholder="Kommentar (optional)..."
                    className="w-full border rounded px-3 py-2 text-xs"
                  />
                </div>
              )}

              {/* Quick Info */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Übersicht</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Status</dt>
                    <dd className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Priorität</dt>
                    <dd className={`px-2 py-0.5 rounded text-xs font-medium border ${PRIORITY_COLORS[order.priority]}`}>
                      {order.priority}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Abteilung</dt>
                    <dd className="text-gray-900">{order.department_name || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Zugewiesen</dt>
                    <dd className="text-gray-900">{order.assignee_name || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Änderungen</dt>
                    <dd className="text-gray-900">{order.history.length}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
