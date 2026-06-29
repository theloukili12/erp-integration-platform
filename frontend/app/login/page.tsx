"use client";

import { useState } from "react";
import { login, register } from "@/lib/api";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let result;
      if (mode === "login") {
        result = await login(username, password);
      } else {
        result = await register({ username, email, full_name: fullName, password });
      }

      if (result?.access_token) {
        localStorage.setItem("access_token", result.access_token);
        localStorage.setItem("user", JSON.stringify({
          id: result.user_id,
          username: result.username,
          full_name: result.full_name,
        }));
        window.location.href = "/";
      }
    } catch (err: any) {
      setError(err.message || "Fehler bei der Anmeldung");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">ERP Platform</h1>
          <p className="mt-1 text-sm text-gray-500">
            {mode === "login" ? "Anmelden" : "Konto erstellen"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Benutzername</label>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="benutzername"
            />
          </div>

          {mode === "register" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">E-Mail</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="name@firma.de"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Voller Name</label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Max Mustermann"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Passwort</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
              minLength={4}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Laden..." : mode === "login" ? "Anmelden" : "Registrieren"}
          </button>
        </form>

        <div className="mt-6 text-center">
          {mode === "login" ? (
            <p className="text-sm text-gray-500">
              Noch kein Konto?{" "}
              <button onClick={() => { setMode("register"); setError(""); }} className="font-medium text-blue-600 hover:underline">
                Registrieren
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              Bereits registriert?{" "}
              <button onClick={() => { setMode("login"); setError(""); }} className="font-medium text-blue-600 hover:underline">
                Anmelden
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
