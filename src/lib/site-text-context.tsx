import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getSiteContent } from "./site-text.functions";
import { TEXT_DEFAULTS, TYPOGRAPHY_DEFAULT, type TextStyle, type Typography } from "./site-text";

export const siteTextsQuery = queryOptions({
  queryKey: ["site-texts"],
  queryFn: () => getSiteContent(),
  staleTime: 30_000,
});

type Ctx = {
  texts: Record<string, string>;
  styles: Record<string, TextStyle>;
  images: Record<string, string>;
  typography: Typography;
};

const SiteTextContext = createContext<Ctx>({
  texts: TEXT_DEFAULTS,
  styles: {},
  images: {},
  typography: TYPOGRAPHY_DEFAULT,
});

export function styleToCss(s: TextStyle | undefined): CSSProperties {
  if (!s) return {};
  const css: CSSProperties = {};
  if (s.font) css.fontFamily = `var(--font-${s.font})`;
  if (s.size) css.fontSize = s.size;
  if (s.weight) css.fontWeight = s.weight as CSSProperties["fontWeight"];
  if (s.color) css.color = s.color;
  if (s.align) { css.textAlign = s.align; css.display = "block"; }
  if (s.transform) css.textTransform = s.transform;
  if (s.letterSpacing) css.letterSpacing = s.letterSpacing;
  if (s.lineHeight) css.lineHeight = s.lineHeight;
  if (s.offsetX || s.offsetY) {
    css.display = "inline-block";
    css.transform = `translate(${s.offsetX || "0px"}, ${s.offsetY || "0px"})`;
  }
  return css;
}

export function SiteTextProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery(siteTextsQuery);

  const value = useMemo<Ctx>(() => {
    const texts: Record<string, string> = { ...TEXT_DEFAULTS };
    const styles: Record<string, TextStyle> = {};
    const images: Record<string, string> = {};
    for (const row of data?.texts ?? []) {
      const id = `${row.pageSlug}.${row.textKey}`;
      if (row.value?.trim()) texts[id] = row.value;
      if (row.style && Object.keys(row.style).length) styles[id] = row.style;
    }
    for (const row of data?.images ?? []) {
      if (row.url) images[`${row.pageSlug}.${row.imageKey}`] = row.url;
    }
    const typography: Typography = { ...TYPOGRAPHY_DEFAULT, ...(data?.typography ?? {}) };
    return { texts, styles, images, typography };
  }, [data]);

  const { fontDisplay, fontBody, scale } = value.typography;
  const fontsHref = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontDisplay).replace(/%20/g, "+")}:wght@400;500;600;700;800&family=${encodeURIComponent(fontBody).replace(/%20/g, "+")}:wght@300;400;500;600;700&display=swap`;

  return (
    <SiteTextContext.Provider value={value}>
      <link rel="stylesheet" href={fontsHref} />
      <style
        dangerouslySetInnerHTML={{
          __html: `:root{--font-display:'${fontDisplay}',system-ui,sans-serif;--font-body:'${fontBody}',system-ui,sans-serif;--font-mono:'JetBrains Mono',ui-monospace,monospace;}html{font-size:${(scale || 1) * 100}%;}body{font-family:var(--font-body);}`,
        }}
      />
      {children}
    </SiteTextContext.Provider>
  );
}

/** Returns a translator for a page: t("hero.title") -> CMS value or default. */
export function useT(pageSlug: string) {
  const { texts } = useContext(SiteTextContext);
  return (key: string, fallback = "") => texts[`${pageSlug}.${key}`] ?? fallback;
}

export function useCms(pageSlug: string) {
  const { texts, styles, images } = useContext(SiteTextContext);
  return {
    t: (key: string, fallback = "") => texts[`${pageSlug}.${key}`] ?? fallback,
    style: (key: string) => styleToCss(styles[`${pageSlug}.${key}`]),
    hidden: (key: string) => Boolean(styles[`${pageSlug}.${key}`]?.hidden),
    image: (key: string, fallback: string) => images[`${pageSlug}.${key}`] ?? fallback,
  };
}

/** Image de page pilotée par le CMS, avec repli sur l'asset local. */
export function useCmsImage(pageSlug: string, key: string, fallback: string) {
  const { images } = useContext(SiteTextContext);
  return images[`${pageSlug}.${key}`] ?? fallback;
}

/** Texte CMS stylable (police, taille, couleur, alignement, position). */
export function Txt({
  page,
  k,
  fallback = "",
  className,
}: {
  page: string;
  k: string;
  fallback?: string;
  className?: string;
}) {
  const { texts, styles } = useContext(SiteTextContext);
  const id = `${page}.${k}`;
  const s = styles[id];
  if (s?.hidden) return null;
  return (
    <span data-cms={id} className={className} style={styleToCss(s)}>
      {texts[id] ?? fallback}
    </span>
  );
}
