import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Placeholder } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/billing")({
  component: () => (
    <AdminShell title="Facturation" breadcrumbs={[{ label: "Facturation" }]}>
      <Placeholder
        description="Devis, factures, avoirs, abonnements récurrents, paiements en ligne."
        bullets={[
          "Module intégré au Back Office DODRICOM",
          "Interface premium glassmorphism",
          "RBAC appliqué selon le rôle utilisateur",
          "Prêt à connecter aux données live",
          "Export PDF / Excel",
          "Multi-langue FR / EN / AR",
        ]}
      />
    </AdminShell>
  ),
});
