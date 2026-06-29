"use client";

import { useEffect, useState } from "react";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  createRole,
  deleteRole,
  getFeatures,
  getRolePermissions,
  setRolePermissions,
  getUserRoles,
  assignUserRole,
  removeUserRole,
  seedData,
} from "@/lib/api";

/* ─── Types ────────────────────────────────────────────────────────────── */

type Department = { id: number; name: string; description: string | null; created_at: string };
type User = { id: number; username: string; email: string; full_name: string; department_id: number | null; is_active: boolean; created_at: string; department?: Department | null };
type Role = { id: number; name: string; description: string | null; is_system_role: boolean; created_at: string };
type Feature = { id: number; code: string; name: string; module: string; description: string | null };
type RolePermission = { id: number; role_id: number; feature_id: number; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean; can_export: boolean; feature: Feature };
type UserRole = { id: number; user_id: number; role_id: number; department_id: number | null; created_at: string; user: User; role: Role; department: Department | null };

const TABS = ["Abteilungen", "Benutzer", "Rollen", "Berechtigungsmatrix", "Rollenzuweisung"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("Abteilungen");
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try { await seedData(); alert("Standarddaten wurden geladen!"); }
    catch (e: any) { alert(e.message); }
    finally { setSeeding(false); }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mb-2 flex items-center justify-between">
        <a href="/" className="text-sm text-blue-600 hover:underline">← Zurück zum Dashboard</a>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {seeding ? "Lädt..." : "Standarddaten laden"}
        </button>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
      <p className="mt-1 text-gray-600">Berechtigungen &amp; Abteilungen verwalten</p>

      <nav className="mt-6 flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "Abteilungen" && <DepartmentsTab />}
        {tab === "Benutzer" && <UsersTab />}
        {tab === "Rollen" && <RolesTab />}
        {tab === "Berechtigungsmatrix" && <PermissionMatrixTab />}
        {tab === "Rollenzuweisung" && <UserRolesTab />}
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEPARTMENTS TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function DepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = () => getDepartments().then(setDepartments).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (editId) await updateDepartment(editId, { name, description });
      else await createDepartment({ name, description });
      setName(""); setDescription(""); setEditId(null); load();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-5 shadow-sm">
        <Input label="Name" required value={name} onChange={setName} placeholder="z.B. Produktion" />
        <Input label="Beschreibung" value={description} onChange={setDescription} placeholder="Optional" className="flex-1" />
        <SubmitBtn editing={!!editId} />
        {editId && <CancelBtn onClick={() => { setEditId(null); setName(""); setDescription(""); }} />}
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>

      <Table headers={["ID", "Name", "Beschreibung", "Erstellt", "Aktionen"]}>
        {departments.map((d) => (
          <tr key={d.id} className="border-b hover:bg-gray-50">
            <td className="p-3 text-gray-400">{d.id}</td>
            <td className="p-3 font-medium">{d.name}</td>
            <td className="p-3 text-gray-600">{d.description ?? "–"}</td>
            <td className="p-3 text-gray-400 text-xs">{fmtDate(d.created_at)}</td>
            <td className="p-3 text-right space-x-2">
              <EditBtn onClick={() => { setEditId(d.id); setName(d.name); setDescription(d.description ?? ""); }} />
              <DeleteBtn onClick={() => { if (confirm("Löschen?")) deleteDepartment(d.id).then(load); }} />
            </td>
          </tr>
        ))}
        {departments.length === 0 && <EmptyRow cols={5} />}
      </Table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   USERS TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [deptId, setDeptId] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    getUsers().then(setUsers).catch(() => {});
    getDepartments().then(setDepartments).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const data = { username, email, full_name: fullName, department_id: deptId ? Number(deptId) : undefined };
      if (editId) await updateUser(editId, data);
      else await createUser(data);
      setUsername(""); setEmail(""); setFullName(""); setDeptId(""); setEditId(null); load();
    } catch (err: any) { setError(err.message); }
  };

  const startEdit = (u: User) => {
    setEditId(u.id); setUsername(u.username); setEmail(u.email);
    setFullName(u.full_name); setDeptId(u.department_id?.toString() ?? "");
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-5 shadow-sm">
        <Input label="Benutzername" required value={username} onChange={setUsername} />
        <Input label="E-Mail" required type="email" value={email} onChange={setEmail} />
        <Input label="Voller Name" required value={fullName} onChange={setFullName} />
        <div>
          <label className="block text-xs font-medium text-gray-500">Abteilung</label>
          <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Keine</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <SubmitBtn editing={!!editId} />
        {editId && <CancelBtn onClick={() => { setEditId(null); setUsername(""); setEmail(""); setFullName(""); setDeptId(""); }} />}
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>

      <Table headers={["ID", "Benutzername", "E-Mail", "Name", "Abteilung", "Status", "Aktionen"]}>
        {users.map((u) => (
          <tr key={u.id} className="border-b hover:bg-gray-50">
            <td className="p-3 text-gray-400">{u.id}</td>
            <td className="p-3 font-medium">{u.username}</td>
            <td className="p-3">{u.email}</td>
            <td className="p-3">{u.full_name}</td>
            <td className="p-3 text-gray-600">{u.department?.name ?? "–"}</td>
            <td className="p-3">
              <button
                onClick={() => updateUser(u.id, { is_active: !u.is_active }).then(load)}
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
              >
                {u.is_active ? "Aktiv" : "Inaktiv"}
              </button>
            </td>
            <td className="p-3 text-right space-x-2">
              <EditBtn onClick={() => startEdit(u)} />
              <DeleteBtn onClick={() => { if (confirm("Löschen?")) deleteUser(u.id).then(load); }} />
            </td>
          </tr>
        ))}
        {users.length === 0 && <EmptyRow cols={7} />}
      </Table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROLES TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const load = () => getRoles().then(setRoles).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await createRole({ name, description });
      setName(""); setDescription(""); load();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-5 shadow-sm">
        <Input label="Rollenname" required value={name} onChange={setName} placeholder="z.B. Schichtleiter" />
        <Input label="Beschreibung" value={description} onChange={setDescription} placeholder="Optional" className="flex-1" />
        <SubmitBtn editing={false} label="Rolle erstellen" />
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>

      <Table headers={["ID", "Name", "Beschreibung", "System", "Erstellt", "Aktionen"]}>
        {roles.map((r) => (
          <tr key={r.id} className="border-b hover:bg-gray-50">
            <td className="p-3 text-gray-400">{r.id}</td>
            <td className="p-3 font-medium">{r.name}</td>
            <td className="p-3 text-gray-600">{r.description ?? "–"}</td>
            <td className="p-3">
              {r.is_system_role && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">System</span>}
            </td>
            <td className="p-3 text-gray-400 text-xs">{fmtDate(r.created_at)}</td>
            <td className="p-3 text-right">
              {!r.is_system_role && (
                <DeleteBtn onClick={() => { if (confirm("Rolle löschen?")) deleteRole(r.id).then(load); }} />
              )}
            </td>
          </tr>
        ))}
        {roles.length === 0 && <EmptyRow cols={6} />}
      </Table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PERMISSION MATRIX TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function PermissionMatrixTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [matrix, setMatrix] = useState<Record<number, { view: boolean; create: boolean; edit: boolean; delete: boolean; export: boolean }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRoles().then(setRoles).catch(() => {});
    getFeatures().then(setFeatures).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedRole) return;
    getRolePermissions(selectedRole).then((perms: RolePermission[]) => {
      const m: typeof matrix = {};
      for (const f of features) {
        const p = perms.find((x) => x.feature_id === f.id);
        m[f.id] = {
          view: p?.can_view ?? false,
          create: p?.can_create ?? false,
          edit: p?.can_edit ?? false,
          delete: p?.can_delete ?? false,
          export: p?.can_export ?? false,
        };
      }
      setMatrix(m);
    }).catch(() => {});
  }, [selectedRole, features]);

  const toggle = (featureId: number, action: keyof typeof matrix[number]) => {
    setMatrix((prev) => ({
      ...prev,
      [featureId]: { ...prev[featureId], [action]: !prev[featureId]?.[action] },
    }));
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    const permissions = features.map((f) => ({
      role_id: selectedRole,
      feature_id: f.id,
      can_view: matrix[f.id]?.view ?? false,
      can_create: matrix[f.id]?.create ?? false,
      can_edit: matrix[f.id]?.edit ?? false,
      can_delete: matrix[f.id]?.delete ?? false,
      can_export: matrix[f.id]?.export ?? false,
    }));
    try {
      await setRolePermissions(selectedRole, permissions);
      alert("Berechtigungen gespeichert!");
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const ACTIONS = ["view", "create", "edit", "delete", "export"] as const;
  const ACTION_LABELS: Record<string, string> = { view: "Lesen", create: "Erstellen", edit: "Bearbeiten", delete: "Löschen", export: "Exportieren" };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm">
        <label className="text-sm font-medium text-gray-700">Rolle auswählen:</label>
        <select
          value={selectedRole ?? ""}
          onChange={(e) => setSelectedRole(Number(e.target.value) || null)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Bitte wählen…</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {selectedRole && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Speichert..." : "Speichern"}
          </button>
        )}
      </div>

      {selectedRole && features.length > 0 && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-100 text-left">
                <th className="p-3">Modul</th>
                <th className="p-3">Feature</th>
                {ACTIONS.map((a) => (
                  <th key={a} className="p-3 text-center">{ACTION_LABELS[a]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-gray-500 text-xs">{f.module}</td>
                  <td className="p-3 font-medium">{f.name}</td>
                  {ACTIONS.map((a) => (
                    <td key={a} className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={matrix[f.id]?.[a] ?? false}
                        onChange={() => toggle(f.id, a)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!selectedRole && (
        <p className="text-center text-gray-400 py-10">Wählen Sie eine Rolle aus, um die Berechtigungsmatrix zu bearbeiten.</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   USER ROLES TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function UserRolesTab() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    getUserRoles().then(setUserRoles).catch(() => {});
    getUsers().then(setUsers).catch(() => {});
    getRoles().then(setRoles).catch(() => {});
    getDepartments().then(setDepartments).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await assignUserRole({
        user_id: Number(userId),
        role_id: Number(roleId),
        department_id: deptId ? Number(deptId) : null,
      });
      setUserId(""); setRoleId(""); setDeptId(""); load();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-5 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-gray-500">Benutzer</label>
          <select required value={userId} onChange={(e) => setUserId(e.target.value)} className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Auswählen…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Rolle</label>
          <select required value={roleId} onChange={(e) => setRoleId(e.target.value)} className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Auswählen…</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Abteilung (optional, scoped)</label>
          <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Global</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Rolle zuweisen
        </button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>

      <Table headers={["Benutzer", "Rolle", "Abteilung (Scope)", "Zugewiesen am", "Aktionen"]}>
        {userRoles.map((ur) => (
          <tr key={ur.id} className="border-b hover:bg-gray-50">
            <td className="p-3 font-medium">{ur.user.full_name}</td>
            <td className="p-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                ur.role.is_system_role ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
              }`}>{ur.role.name}</span>
            </td>
            <td className="p-3 text-gray-600">{ur.department?.name ?? "Global"}</td>
            <td className="p-3 text-gray-400 text-xs">{fmtDate(ur.created_at)}</td>
            <td className="p-3 text-right">
              <DeleteBtn onClick={() => { if (confirm("Rolle entziehen?")) removeUserRole(ur.id).then(load); }} label="Entziehen" />
            </td>
          </tr>
        ))}
        {userRoles.length === 0 && <EmptyRow cols={5} />}
      </Table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function Input({ label, className, onChange, ...props }: { label: string; className?: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500">{label}</label>
      <input {...props} onChange={(e) => onChange(e.target.value)} className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm w-full" />
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-100 text-left">
            {headers.map((h, i) => <th key={i} className={`p-3 ${i === headers.length - 1 ? "text-right" : ""}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return <tr><td colSpan={cols} className="p-6 text-center text-gray-400">Keine Daten vorhanden</td></tr>;
}

function SubmitBtn({ editing, label }: { editing: boolean; label?: string }) {
  return (
    <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
      {label ?? (editing ? "Speichern" : "Hinzufügen")}
    </button>
  );
}

function CancelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
      Abbrechen
    </button>
  );
}

function EditBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="text-blue-600 hover:underline text-xs">Bearbeiten</button>;
}

function DeleteBtn({ onClick, label }: { onClick: () => void; label?: string }) {
  return <button onClick={onClick} className="text-red-600 hover:underline text-xs">{label ?? "Löschen"}</button>;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE");
}
