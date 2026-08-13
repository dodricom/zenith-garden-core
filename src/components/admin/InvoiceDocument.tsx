import { Fragment } from "react";
import {
  amountInWords,
  docTitle,
  formatDateFr,
  money,
  type BillingDoc,
  type BillingSettings,
  type DocLine,
} from "@/lib/billing";

export type PrintOptions = {
  logo: boolean;
  letterhead: boolean;
  stamp: boolean;
  terms: boolean;
  footer: boolean;
};

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  logo: true,
  letterhead: false,
  stamp: true,
  terms: true,
  footer: true,
};

const NAVY = "#152452";
const CYAN = "#63c9dd";

/** Rendu A4 fidèle du document administratif (utilisé pour l’aperçu et l’export PDF). */
export function InvoiceDocument({
  doc,
  lines,
  settings,
  options,
}: {
  doc: BillingDoc;
  lines: DocLine[];
  settings: BillingSettings | null;
  options: PrintOptions;
}) {
  const currency = settings?.currency ?? "MAD";

  const sections = lines.reduce<Record<string, DocLine[]>>((acc, l) => {
    const key = l.section?.trim() || "";
    (acc[key] ??= []).push(l);
    return acc;
  }, {});

  /*
   * Si le Logo est désactivé :
   * - aucun fond NAVY
   * - aucune courbe CYAN
   * - aucune image de logo
   * - aucune image de papier à en-tête
   *
   * La page reste donc blanche pour permettre
   * l'impression sur une feuille EN-TÊTE pré-imprimée.
   */

  return (
    <div
      className="print-area relative mx-auto flex flex-col bg-white text-[#1a1a1a]"
      style={{
        width: "210mm",
        minHeight: "297mm",
        backgroundColor: "#ffffff",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      {/* ============================================================
          PAPIER EN-TÊTE
          ============================================================ */}

      {options.letterhead && settings?.letterhead_url && (
        <img
          src={settings.letterhead_url}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* ============================================================
          EN-TÊTE DU DOCUMENT
          ============================================================ */}

      <div
        className="relative"
        style={{
          minHeight: "34mm",
          backgroundColor: "#ffffff",
        }}
      >
        {/* ----------------------------------------------------------
            DESIGN DODRICOM
            Affiché uniquement lorsque Logo est activé
            ---------------------------------------------------------- */}

        {options.logo && settings?.logo_url && (
          <>
            {/* Bande NAVY */}
            <div
              className="absolute left-0 top-0 w-full"
              style={{
                height: "25mm",
                background: NAVY,
              }}
            />

            {/* Courbe blanche */}
            <div
              className="absolute right-0 top-0"
              style={{
                width: "62%",
                height: "25mm",
                background: "#ffffff",
                clipPath: "ellipse(78% 120% at 92% 12%)",
                zIndex: 1,
              }}
            />

            {/* Courbe CYAN */}
            <div
              className="absolute right-0 top-0"
              style={{
                width: "64%",
                height: "25mm",
                background: CYAN,
                clipPath: "ellipse(78% 120% at 95% 6%)",
                opacity: 0.9,
                zIndex: 2,
              }}
            />

            {/* Courbe blanche finale */}
            <div
              className="absolute right-0 top-0"
              style={{
                width: "60%",
                height: "25mm",
                background: "#ffffff",
                clipPath: "ellipse(78% 120% at 96% 2%)",
                zIndex: 3,
              }}
            />
          </>
        )}

        {/* ==========================================================
            CONTENU DE L'EN-TÊTE
            ========================================================== */}

        <div
          className={`relative z-10 flex items-center justify-between gap-6 px-8 ${
            options.logo && settings?.logo_url ? "py-2" : "py-5"
          }`}
        >
          {/* --------------------------------------------------------
              LOGO
              -------------------------------------------------------- */}

          <div
            className={
              options.logo && settings?.logo_url
                ? "flex h-[25mm] items-center overflow-hidden"
                : "flex h-[20mm] items-center"
            }
          >
            {options.logo && settings?.logo_url && (
              <img
                src={settings.logo_url}
                alt={settings.company_name ?? "DODRICOM"}
                style={{
                  height: "20mm",
                  width: "auto",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            )}
          </div>

          {/* --------------------------------------------------------
              INFORMATIONS DU DOCUMENT
              -------------------------------------------------------- */}

          <div className="max-w-[52%] text-right">
            <p
              className="text-[19px] font-bold"
              style={{
                color: "#111111",
              }}
            >
              {docTitle(doc.doc_type)} N° {doc.number}
            </p>

            <p className="mt-1 text-[13px] font-bold">
              {doc.client_name}
            </p>

            {doc.client_address && (
              <p className="text-[11px]">
                {doc.client_address}
              </p>
            )}

            {doc.client_ice && (
              <p className="mt-1 text-[12px] font-bold">
                ICE {doc.client_ice}
              </p>
            )}

            {doc.order_ref && (
              <p className="text-[12px]">
                Bon de Commande : {doc.order_ref}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          CONTENU PRINCIPAL
          ============================================================ */}

      <div className="relative z-10 flex flex-1 flex-col bg-white px-8 pb-6">
        {/* ----------------------------------------------------------
            DATE
            ---------------------------------------------------------- */}

        <div className="mt-4 flex justify-end">
          <span
            className="rounded-full px-6 py-1.5 text-[13px] font-bold text-white"
            style={{
              background: CYAN,
            }}
          >
            {(doc.city || "Casablanca") +
              ", " +
              formatDateFr(doc.issue_date)}
          </span>
        </div>

        {/* ----------------------------------------------------------
            TEXTE INTRODUCTIF
            ---------------------------------------------------------- */}

        {doc.intro_text && (
          <p
            className="mt-5 text-[12.5px] leading-relaxed"
            style={{
              fontFamily: "Arial, sans-serif",
            }}
          >
            {doc.intro_text}
          </p>
        )}

        {/* ==========================================================
            TABLEAU DES ARTICLES
            ========================================================== */}

        <table className="mt-5 w-full border-collapse text-[12px]">
          <thead>
            <tr
              style={{
                background: "#bfe4ee",
              }}
            >
              <th className="rounded-l-xl px-3 py-2.5 text-left font-bold">
                Désignation
              </th>

              <th className="px-3 py-2.5 text-center font-bold">
                Prix U
                <br />
                HT ({currency})
              </th>

              <th className="px-3 py-2.5 text-center font-bold">
                Qté
              </th>

              <th className="rounded-r-xl px-3 py-2.5 text-center font-bold">
                Prix Total
                <br />
                HT ({currency})
              </th>
            </tr>
          </thead>

          <tbody>
            {Object.entries(sections).map(([section, rows]) => (
              <Fragment key={section || "_"}>
                {/* Nom de section */}
                {section && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 pt-4 text-[13px] font-bold"
                      style={{
                        color: "#3aa3bd",
                      }}
                    >
                      {section}
                    </td>
                  </tr>
                )}

                {/* Lignes */}
                {rows.map((l, i) => (
                  <tr key={l.id ?? `${section}-${i}`}>
                    <td
                      className="px-3 py-2 font-semibold"
                      style={{
                        borderRight: `1px solid ${CYAN}`,
                      }}
                    >
                      {l.designation}
                    </td>

                    <td
                      className="px-3 py-2 text-center"
                      style={{
                        borderRight: `1px solid ${CYAN}`,
                      }}
                    >
                      {Number(l.unit_price)
                        .toFixed(2)
                        .replace(".", ",")}
                    </td>

                    <td
                      className="px-3 py-2 text-center"
                      style={{
                        borderRight: `1px solid ${CYAN}`,
                      }}
                    >
                      {l.unit && l.unit !== ""
                        ? l.unit
                        : l.quantity}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {(Number(l.unit_price) *
                        Number(l.quantity))
                        .toFixed(2)
                        .replace(".", ",")}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>

        {/* Espace flexible */}
        <div className="flex-1" />

        {/* ==========================================================
            TOTAUX
            ========================================================== */}

        <div className="mt-8 flex items-start justify-between gap-6">
          {/* --------------------------------------------------------
              TABLEAU TOTALS
              -------------------------------------------------------- */}

          <div className="flex-1">
            <table className="w-full border-collapse text-center text-[11.5px]">
              <thead>
                <tr
                  style={{
                    background: "#bfe4ee",
                  }}
                >
                  <th className="rounded-l-lg px-2 py-1.5">
                    Total HT
                  </th>

                  <th className="px-2 py-1.5">
                    Taux TVA
                  </th>

                  <th className="px-2 py-1.5">
                    TVA
                  </th>

                  <th className="px-2 py-1.5">
                    Total TTC
                  </th>

                  <th className="rounded-r-lg px-2 py-1.5">
                    Acompte
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  style={{
                    background: "#fdf6cf",
                  }}
                >
                  <td className="px-2 py-1.5 font-semibold">
                    {money(doc.total_ht, currency)}
                  </td>

                  <td className="px-2 py-1.5">
                    {Number(doc.vat_rate)}%
                  </td>

                  <td className="px-2 py-1.5">
                    {money(doc.total_vat, currency)}
                  </td>

                  <td className="px-2 py-1.5">
                    {money(doc.total_ttc, currency)}
                  </td>

                  <td className="px-2 py-1.5">
                    {money(doc.deposit, currency)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ------------------------------------------------------
                CONDITIONS COMMERCIALES
                ------------------------------------------------------ */}

            {options.terms &&
              (doc.terms || settings?.terms) && (
                <div
                  className="mt-4 rounded-lg px-4 py-3 text-[11.5px]"
                  style={{
                    background: "#cfe4e4",
                  }}
                >
                  <p className="mb-1 font-bold">
                    CONDITIONS COMMERCIALES :
                  </p>

                  {(doc.terms ||
                    settings?.terms ||
                    "")
                    .split("\n")
                    .map((t, i) => (
                      <p key={i}>
                        {t}
                      </p>
                    ))}

                  {settings?.rib && (
                    <p>
                      - RIB : {settings.rib}
                    </p>
                  )}
                </div>
              )}
          </div>

          {/* --------------------------------------------------------
              NET A PAYER + CACHET
              -------------------------------------------------------- */}

          <div className="w-[62mm] shrink-0">
            <div
              className="rounded-lg px-4 py-4 text-center"
              style={{
                background: "#b9d4d4",
              }}
            >
              <p className="text-[14px] font-bold">
                NET A PAYER
              </p>

              <p className="mt-2 text-[13px]">
                {money(
                  doc.net_to_pay,
                  currency
                )}
              </p>

              <p className="mt-1 text-[12px] capitalize">
                {amountInWords(
                  doc.net_to_pay,
                  currency
                )}
              </p>
            </div>

            {/* CACHET */}
            {options.stamp &&
              settings?.stamp_url && (
                <img
                  src={settings.stamp_url}
                  alt="Cachet"
                  className="mx-auto mt-3 max-h-[32mm]"
                />
              )}
          </div>
        </div>
      </div>

      {/* ============================================================
          PIED DE PAGE
          ============================================================ */}

      {options.footer && (
        <div
          className="relative z-10 px-8 py-3 text-center text-[9.5px] leading-relaxed text-white"
          style={{
            background: NAVY,
            fontFamily: "Arial, sans-serif",
          }}
        >
          <p>
            {settings?.company_name ?? "DODRICOM"}

            {settings?.capital
              ? ` au capital de ${settings.capital}`
              : ""}

            {settings?.address
              ? ` - Siège social : ${settings.address}`
              : ""}
          </p>

          <p>
            {settings?.phone
              ? `Tél : ${settings.phone} - `
              : ""}

            {settings?.email
              ? `E-mail : ${settings.email} - `
              : ""}

            {settings?.website
              ? `Web : ${settings.website}`
              : ""}
          </p>

          <p>
            {settings?.rc
              ? `R.C : ${settings.rc} - `
              : ""}

            {settings?.if_number
              ? `I.F : ${settings.if_number} - `
              : ""}

            {settings?.patente
              ? `Patente : ${settings.patente} - `
              : ""}

            {settings?.ice
              ? `ICE : ${settings.ice}`
              : ""}
          </p>
        </div>
      )}
    </div>
  );
}
