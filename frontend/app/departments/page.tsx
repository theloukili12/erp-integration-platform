"use client";

import { useEffect, useState } from "react";
import { getDepartmentsOverview } from "@/lib/api";
import { AuthGuard } from "@/lib/auth-guard";

interface DeptOverview {
  id: number;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string | null;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DeptOverview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDepartmentsOverview()
      .then((data) => setDepartments(data || []))
      .catch(() => setDepartments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Abteilungen</h1>
              <p className="text-sm text-gray-500 mt-1">
                Übersicht aller Abteilungen und Teams
              </p>
            </div>
            <a
              href="/"
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              ← Dashboard
            </a>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Laden...</div>
          ) : departments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Keine Abteilungen vorhanden. Erstellen Sie Abteilungen im Admin Panel.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map((dept) => (
                <a
                  key={dept.id}
                  href={`/departments/${dept.id}`}
                  className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-700 font-bold text-lg">
                        {dept.name.charAt(0)}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {dept.name}
                    </h2>
                  </div>
                  {dept.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {dept.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <span className="text-2xl font-bold text-gray-900">
                        {dept.member_count}
                      </span>
                      <span className="text-xs text-gray-500">Mitglieder</span>
                    </div>
                    <span className="text-xs text-blue-600 font-medium">
                      Details →
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
