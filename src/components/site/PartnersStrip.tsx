import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";


export type PartnerItem = { id: string; name: string; logoUrl: string | null; websiteUrl: string | null };

export function usePartners() {
  return useQuery({
    queryKey: ["partners-public"],
    queryFn: async (): Promise<PartnerItem[]> => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, logo_url, website_url, sort_order")
        .eq("status", "published")
        .order("sort_order", { ascending: true });
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        logoUrl: p.logo_url,
        websiteUrl: p.website_url,
      }));
    },
    staleTime: 30_000,
  });
}

/** Bandeau défilant des logos partenaires, piloté par le CMS. */
export function PartnersStrip({ className = "" }: { className?: string }) {
  const { data } = usePartners();
  const partners = data ?? [];
  if (partners.length === 0) return null;
  const items = [...partners, ...partners];

  return (
    <div className={`pointer-events-auto w-full ${className}`}>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="flex w-max items-center gap-8 animate-marquee-x">
          {items.map((p, i) => (
            <a
              key={`${p.id}-${i}`}
              href={p.websiteUrl ?? undefined}
              target={p.websiteUrl ? "_blank" : undefined}
              rel="noreferrer"
              className="glass flex shrink-0 items-center gap-3 px-5 py-3 opacity-70 transition hover:opacity-100"
              aria-label={p.name}
            >
              {p.logoUrl ? (
                <img src={p.logoUrl} alt={`Logo ${p.name}`} loading="lazy" className="h-7 w-auto object-contain" />
              ) : null}
              <span className="whitespace-nowrap text-sm font-black tracking-[0.14em] text-white">{p.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
