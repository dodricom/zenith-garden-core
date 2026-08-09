import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Code2,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Sliders,
  Type,
  Upload,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import {
  FONT_CHOICES,
  IMAGE_PAGES,
  TEXT_PAGES,
  TYPOGRAPHY_DEFAULT,
  type TextStyle,
  type Typography,
} from "@/lib/site-text";

export const Route = createFileRoute("/admin/cms")({ component: CmsPage });

type Tab = "texts" | "images" | "typo" | "code";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-[color:var(--brand-violet)]/60";
const chipCls =
  "rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white/70 outline-none focus:border-[color:var(--brand-violet)]/60";

function CmsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("texts");
  const [activeSlug, setActiveSlug] = useState(TEXT_PAGES[0]!.slug);
  const [values, setValues] = useState<Record<string, string>>({});
  const [styles, setStyles] = useState<Record<string, TextStyle>>({});
  const [images, setImages] = useState<Record<string, string>>({});
  const [typo, setTypo] = useState<Typography>(TYPOGRAPHY_DEFAULT);
  const [openStyle, setOpenStyle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [codeMode, setCodeMode] = useState(false);
  const [code, setCode] = useState("");

  const page = TEXT_PAGES.find((p) => p.slug === activeSlug)!;
  const imagePage = IMAGE_PAGES.find((p) => p.slug === activeSlug);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const [texts, imgs, settings] = await Promise.all([
        supabase.from("content_texts").select("page_slug, text_key, value, style"),
        supabase.from("content_images").select("page_slug, image_key, url"),
        supabase.from("site_settings").select("key, value").eq("key", "typography").maybeSingle(),
      ]);
      if (!alive) return;
      if (texts.error) setError(texts.error.message);
      const v: Record<string, string> = {};
      const st: Record<string, TextStyle> = {};
      for (const row of texts.data ?? []) {
        v[`${row.page_slug}.${row.text_key}`] = row.value;
        st[`${row.page_slug}.${row.text_key}`] = (row.style ?? {}) as TextStyle;
      }
      const im: Record<string, string> = {};
      for (const row of imgs.data ?? []) if (row.url) im[`${row.page_slug}.${row.image_key}`] = row.url;
      setValues(v);
      setStyles(st);
      setImages(im);
      setTypo({ ...TYPOGRAPHY_DEFAULT, ...((settings.data?.value as Partial<Typography>) ?? {}) });
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const fields = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return page.fields;
    return page.fields.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        f.def.toLowerCase().includes(q) ||
        (values[`${page.slug}.${f.key}`] ?? "").toLowerCase().includes(q),
    );
  }, [page, search, values]);

  const current = (key: string) => values[`${page.slug}.${key}`] ?? "";
  const styleOf = (key: string): TextStyle => styles[`${page.slug}.${key}`] ?? {};

  const setValue = (key: string, value: string) => {
    setSaved(false);
    setValues((p) => ({ ...p, [`${page.slug}.${key}`]: value }));
  };
  const setStyle = (key: string, patch: Partial<TextStyle>) => {
    setSaved(false);
    setStyles((p) => ({ ...p, [`${page.slug}.${key}`]: { ...(p[`${page.slug}.${key}`] ?? {}), ...patch } }));
  };

  // ---- code mode -------------------------------------------------------
  useEffect(() => {
    if (!codeMode) return;
    const obj: Record<string, { value: string; style: TextStyle }> = {};
    for (const f of page.fields)
      obj[f.key] = { value: current(f.key) || f.def, style: styleOf(f.key) };
    setCode(JSON.stringify(obj, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeMode, activeSlug]);

  const applyCode = () => {
    try {
      const parsed = JSON.parse(code) as Record<string, { value?: string; style?: TextStyle }>;
      setValues((p) => {
        const next = { ...p };
        for (const [k, v] of Object.entries(parsed)) if (typeof v?.value === "string") next[`${page.slug}.${k}`] = v.value;
        return next;
      });
      setStyles((p) => {
        const next = { ...p };
        for (const [k, v] of Object.entries(parsed)) if (v?.style) next[`${page.slug}.${k}`] = v.style;
        return next;
      });
      setError(null);
      setSaved(false);
    } catch (e) {
      setError(`JSON invalide : ${(e as Error).message}`);
    }
  };

  // ---- persistence -----------------------------------------------------
  const save = async () => {
    setSaving(true);
    setError(null);
    const rows = page.fields.map((f) => ({
      page_slug: page.slug,
      text_key: f.key,
      value: current(f.key) || f.def,
      style: styleOf(f.key) as never,
    }));
    const { error: err } = await supabase.from("content_texts").upsert(rows, { onConflict: "page_slug,text_key" });
    if (!err) {
      const { error: sErr } = await supabase
        .from("site_settings")
        .upsert({ key: "typography", value: typo as never, label: "Typographie du site" }, { onConflict: "key" });
      if (sErr) setError(sErr.message);
    }
    setSaving(false);
    if (err) return setError(err.message);
    setSaved(true);
    await queryClient.invalidateQueries({ queryKey: ["site-texts"] });
  };

  const resetPage = () => {
    setSaved(false);
    setValues((p) => {
      const next = { ...p };
      for (const f of page.fields) next[`${page.slug}.${f.key}`] = f.def;
      return next;
    });
    setStyles((p) => {
      const next = { ...p };
      for (const f of page.fields) next[`${page.slug}.${f.key}`] = {};
      return next;
    });
  };

  const uploadImage = async (key: string, file: File) => {
    setError(null);
    const path = `${page.slug}/${key.replace(/\./g, "-")}-${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const up = await supabase.storage.from("cms").upload(path, file, { upsert: true });
    if (up.error) return setError(up.error.message);
    const signed = await supabase.storage.from("cms").createSignedUrl(path, 60 * 60 * 24 * 3650);
    const url = signed.data?.signedUrl;
    if (!url) return setError(signed.error?.message ?? "URL introuvable");
    const { error: err } = await supabase
      .from("content_images")
      .upsert({ page_slug: page.slug, image_key: key, url }, { onConflict: "page_slug,image_key" });
    if (err) return setError(err.message);
    setImages((p) => ({ ...p, [`${page.slug}.${key}`]: url }));
    await queryClient.invalidateQueries({ queryKey: ["site-texts"] });
  };

  const removeImage = async (key: string) => {
    await supabase.from("content_images").delete().eq("page_slug", page.slug).eq("image_key", key);
    setImages((p) => {
      const next = { ...p };
      delete next[`${page.slug}.${key}`];
      return next;
    });
    await queryClient.invalidateQueries({ queryKey: ["site-texts"] });
  };

  const tabs: { id: Tab; label: string; icon: typeof Type }[] = [
    { id: "texts", label: "Textes", icon: Type },
    { id: "images", label: "Images", icon: ImageIcon },
    { id: "typo", label: "Typographie", icon: Settings2 },
    { id: "code", label: "Mode code", icon: Code2 },
  ];

  return (
    <AdminShell title="Website Builder (CMS)" breadcrumbs={[{ label: "Website Builder (CMS)" }]}>
      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        <aside className="glass h-fit p-3">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Pages du site</p>
          <div className="space-y-1">
            {TEXT_PAGES.map((p) => (
              <button
                key={p.slug}
                onClick={() => {
                  setActiveSlug(p.slug);
                  setSaved(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  p.slug === activeSlug
                    ? "bg-white/[0.08] text-white"
                    : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-[10px] text-white/35">{p.fields.length}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="glass p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">{page.name}</h2>
              <p className="text-xs text-white/50">
                Tout ce qui est modifié ici s'applique immédiatement à la page {page.route}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetPage}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/70 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="btn-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saved ? "Enregistré" : "Enregistrer"}
              </button>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                onClick={() => {
                  setTab(tb.id);
                  if (tb.id === "code") setCodeMode(true);
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  tab === tb.id ? "bg-white/[0.1] text-white" : "text-white/55 hover:text-white"
                }`}
              >
                <tb.icon className="h-3.5 w-3.5" /> {tb.label}
              </button>
            ))}
          </div>

          {error && (
            <p className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p>
          )}

          {loading ? (
            <p className="text-sm text-white/50">Chargement du contenu…</p>
          ) : tab === "texts" ? (
            <>
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <Search className="h-4 w-4 text-white/40" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un texte…"
                  className="w-full bg-transparent text-sm text-white placeholder-white/40 outline-none"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {fields.map((f) => {
                  const id = `${page.slug}.${f.key}`;
                  const st = styleOf(f.key);
                  return (
                    <div key={f.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{f.label}</span>
                        <button
                          onClick={() => setOpenStyle(openStyle === id ? null : id)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
                            openStyle === id || Object.keys(st).length
                              ? "border-[color:var(--brand-violet)]/60 text-white"
                              : "border-white/10 text-white/50 hover:text-white"
                          }`}
                        >
                          <Sliders className="h-3 w-3" /> Style
                        </button>
                      </div>
                      {f.multiline ? (
                        <textarea
                          rows={4}
                          value={current(f.key) || f.def}
                          onChange={(e) => setValue(f.key, e.target.value)}
                          className={`${inputCls} resize-none`}
                        />
                      ) : (
                        <input
                          value={current(f.key) || f.def}
                          onChange={(e) => setValue(f.key, e.target.value)}
                          className={inputCls}
                        />
                      )}

                      {openStyle === id && (
                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/30 p-3">
                          <label className="text-[10px] text-white/45">
                            Police
                            <select
                              value={st.font ?? ""}
                              onChange={(e) => setStyle(f.key, { font: (e.target.value || undefined) as TextStyle["font"] })}
                              className={`${chipCls} mt-1 w-full`}
                            >
                              <option value="">Par défaut</option>
                              <option value="display">Titre</option>
                              <option value="body">Texte</option>
                              <option value="mono">Mono</option>
                            </select>
                          </label>
                          <label className="text-[10px] text-white/45">
                            Taille (ex: 2rem)
                            <input
                              value={st.size ?? ""}
                              onChange={(e) => setStyle(f.key, { size: e.target.value || undefined })}
                              className={`${chipCls} mt-1 w-full`}
                            />
                          </label>
                          <label className="text-[10px] text-white/45">
                            Graisse
                            <select
                              value={st.weight ?? ""}
                              onChange={(e) => setStyle(f.key, { weight: e.target.value || undefined })}
                              className={`${chipCls} mt-1 w-full`}
                            >
                              <option value="">Par défaut</option>
                              {["300", "400", "500", "600", "700", "800"].map((w) => (
                                <option key={w} value={w}>
                                  {w}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-[10px] text-white/45">
                            Couleur
                            <input
                              type="color"
                              value={st.color ?? "#ffffff"}
                              onChange={(e) => setStyle(f.key, { color: e.target.value })}
                              className="mt-1 h-[26px] w-full rounded-lg border border-white/10 bg-transparent"
                            />
                          </label>
                          <label className="text-[10px] text-white/45">
                            Alignement
                            <select
                              value={st.align ?? ""}
                              onChange={(e) => setStyle(f.key, { align: (e.target.value || undefined) as TextStyle["align"] })}
                              className={`${chipCls} mt-1 w-full`}
                            >
                              <option value="">Par défaut</option>
                              <option value="left">Gauche</option>
                              <option value="center">Centre</option>
                              <option value="right">Droite</option>
                            </select>
                          </label>
                          <label className="text-[10px] text-white/45">
                            Casse
                            <select
                              value={st.transform ?? ""}
                              onChange={(e) =>
                                setStyle(f.key, { transform: (e.target.value || undefined) as TextStyle["transform"] })
                              }
                              className={`${chipCls} mt-1 w-full`}
                            >
                              <option value="">Par défaut</option>
                              <option value="uppercase">MAJUSCULES</option>
                              <option value="lowercase">minuscules</option>
                              <option value="capitalize">Capitales</option>
                            </select>
                          </label>
                          <label className="text-[10px] text-white/45">
                            Position X (ex: 20px)
                            <input
                              value={st.offsetX ?? ""}
                              onChange={(e) => setStyle(f.key, { offsetX: e.target.value || undefined })}
                              className={`${chipCls} mt-1 w-full`}
                            />
                          </label>
                          <label className="text-[10px] text-white/45">
                            Position Y (ex: -10px)
                            <input
                              value={st.offsetY ?? ""}
                              onChange={(e) => setStyle(f.key, { offsetY: e.target.value || undefined })}
                              className={`${chipCls} mt-1 w-full`}
                            />
                          </label>
                          <label className="col-span-2 flex items-center gap-2 text-[11px] text-white/60">
                            <input
                              type="checkbox"
                              checked={Boolean(st.hidden)}
                              onChange={(e) => setStyle(f.key, { hidden: e.target.checked })}
                            />
                            Masquer ce texte sur le site
                          </label>
                          <button
                            onClick={() => setStyles((p) => ({ ...p, [id]: {} }))}
                            className="col-span-2 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/60 hover:text-white"
                          >
                            Réinitialiser le style
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : tab === "images" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {!imagePage ? (
                <p className="text-sm text-white/50">
                  Aucune image modifiable sur cette page. (Les images des produits se gèrent dans Commercial (CRM).)
                </p>
              ) : (
                imagePage.fields.map((f) => {
                  const url = images[`${page.slug}.${f.key}`];
                  return (
                    <div key={f.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/60">{f.label}</p>
                      <div className="mb-3 aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/40">
                        {url ? (
                          <img src={url} alt={f.label} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-white/35">
                            Image par défaut du site
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="btn-gradient inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold">
                          <Upload className="h-3.5 w-3.5" /> Téléverser
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void uploadImage(f.key, file);
                            }}
                          />
                        </label>
                        {url && (
                          <button
                            onClick={() => void removeImage(f.key)}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 hover:text-white"
                          >
                            Rétablir l'originale
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : tab === "typo" ? (
            <div className="grid max-w-xl gap-4">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/60">
                  Police des titres
                </span>
                <select
                  value={typo.fontDisplay}
                  onChange={(e) => {
                    setSaved(false);
                    setTypo((p) => ({ ...p, fontDisplay: e.target.value }));
                  }}
                  className={inputCls}
                >
                  {FONT_CHOICES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/60">
                  Police des textes
                </span>
                <select
                  value={typo.fontBody}
                  onChange={(e) => {
                    setSaved(false);
                    setTypo((p) => ({ ...p, fontBody: e.target.value }));
                  }}
                  className={inputCls}
                >
                  {FONT_CHOICES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/60">
                  Taille générale du texte — {Math.round(typo.scale * 100)} %
                </span>
                <input
                  type="range"
                  min={0.8}
                  max={1.4}
                  step={0.05}
                  value={typo.scale}
                  onChange={(e) => {
                    setSaved(false);
                    setTypo((p) => ({ ...p, scale: Number(e.target.value) }));
                  }}
                  className="w-full"
                />
              </label>
              <p className="text-xs text-white/45">
                Ces réglages s'appliquent à tout le site public. Cliquez sur « Enregistrer » pour les publier.
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs text-white/50">
                  Mode avancé : éditez directement le JSON des textes et des styles de la page {page.name}.
                </p>
                <button
                  onClick={applyCode}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/80 hover:text-white"
                >
                  Appliquer le code
                </button>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                rows={26}
                className="w-full rounded-2xl border border-white/10 bg-black/50 p-4 font-mono text-xs text-emerald-200 outline-none"
              />
              <p className="mt-2 text-[11px] text-white/40">
                Après « Appliquer le code », cliquez sur « Enregistrer » pour publier les modifications.
              </p>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
