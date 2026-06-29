"use client";

import { useEffect, useState } from "react";
import { LogoutButton, UserInfo } from "@/lib/auth-guard";
import { getMe } from "@/lib/api";

export function NavBar() {
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user has admin permissions
    getMe()
      .then((data) => {
        if (data?.permissions) {
          // User is admin if they have any admin.* permission with view
          const hasAdmin = Object.keys(data.permissions).some(
            (key) => key.startsWith("admin.") && data.permissions[key]?.view
          );
          setIsAdmin(hasAdmin);
        }
      })
      .catch(() => {});
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-3">
      <UserInfo />
      <a
        href="/profile"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Mein Profil
      </a>
      <a
        href="/departments"
        className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
      >
        Abteilungen
      </a>
      {isAdmin && (
        <>
          <a
            href="/admin"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Admin Panel
          </a>
          <a
            href="/admin/audit"
            className="rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
          >
            Audit Log
          </a>
        </>
      )}
      <LogoutButton />
    </div>
  );
}
