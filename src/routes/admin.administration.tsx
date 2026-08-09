import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, MoreHorizontal, ShieldCheck, UserPlus, XCircle } from "lucide-react";
import { AdminShell, StatCard } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/administration")({
  component: AdministrationPage,
});

const USERS = [
  { name: "Driss El Amrani", email: "driss@dodricom.com", role: "Super Admin", status: "Actif", last: "il y a 2 min" },
  { name: "Sarah Bennani", email: "sarah@dodricom.com", role: "Admin", status: "Actif", last: "il y a 1 h" },
  { name: "Karim Nadir", email: "karim@dodricom.com", role: "Commercial", status: "Actif", last: "il y a 3 h" },
  { name: "Lina Moreau", email: "lina@dodricom.com", role: "Designer", status: "Actif", last: "hier" },
  { name: "Yassine Ait", email: "yassine@dodricom.com", role: "Commercial", status: "Suspendu", last: "il y a 4 j" },
];

function AdministrationPage() {
  return (
    <AdminShell title="Administration" breadcrumbs={[{ label: "Administration" }]}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Utilisateurs" value="42" delta="+3" icon={ShieldCheck} />
        <StatCard label="Sessions actives" value="18" delta="+5" icon={CheckCircle2} />
        <StatCard label="Suspendus" value="2" delta="-1" icon={XCircle} />
        <StatCard label="Nouveaux (7j)" value="6" delta="+2" icon={UserPlus} />
      </div>
      <div className="mt-6 glass overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Utilisateurs</h2>
            <p className="text-xs text-white/50">Gérez rôles, permissions et sessions.</p>
          </div>
          <button className="btn-gradient inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold">
            <UserPlus className="h-4 w-4" /> Nouvel utilisateur
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-wider text-white/40">
                <th className="px-6 py-3">Nom</th>
                <th className="px-6 py-3">Rôle</th>
                <th className="px-6 py-3">Statut</th>
                <th className="px-6 py-3">Dernière connexion</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {USERS.map((u) => (
                <tr key={u.email} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--gradient-brand)] text-xs font-black text-white">
                        {u.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                      </span>
                      <div>
                        <p className="font-medium text-white">{u.name}</p>
                        <p className="text-xs text-white/50">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/80">{u.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${u.status === "Actif" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.status === "Actif" ? "bg-emerald-400" : "bg-rose-400"}`} />
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/60">{u.last}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"><MoreHorizontal className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}