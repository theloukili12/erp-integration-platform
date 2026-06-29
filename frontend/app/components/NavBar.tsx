"use client";

import { useEffect, useState } from "react";
import { LogoutButton, UserInfo } from "@/lib/auth-guard";

export function NavBar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
        href="/admin"
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Admin Panel
      </a>
      <LogoutButton />
    </div>
  );
}
