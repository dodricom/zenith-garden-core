import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Placeholder } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/finance")({
  component: () => (
    <AdminShell title="Finance" breadcrumbs={[{ label: "Finance" }]}>
      <Placeholder
        description="Cash-flow, TVA, comptabilité, bilan, prévisions multi-devises."
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
