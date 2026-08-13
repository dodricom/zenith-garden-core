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

/** Rendu A4 fidèle du document administratif (utilisé pour l'aperçu et l'export PDF). */
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

  return (
    <div
      className="print-area relative mx-auto flex flex-col bg-white text-[#1a1a1a]"
      style={{ width: "210mm", minHeight: "297mm", fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      {options.letterhead && settings?.letterhead_url && (
        <img
          src={settings.letterhead_url}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* En-tête */}
      <div className="relative" style={{ background: NAVY, minHeight: "34mm" }}>
        <div
          className="absolute right-0 top-0 h-full"
          style={{
            width: "62%",
            background: "#fff",
            clipPath: "ellipse(78% 120% at 92% 12%)",
          }}
        />
        <div
          className="absolute right-0 top-0 h-full"
          style={{
            width: "64%",
            background: CYAN,
            clipPath: "ellipse(78% 120% at 95% 6%)",
            opacity: 0.9,
            zIndex: 0,
          }}
        />
        <div
          className="absolute right-0 top-0 h-full"
          style={{
            width: "60%",
            background: "#fff",
            clipPath: "ellipse(78% 120% at 96% 2%)",
            zIndex: 1,
          }}
        />
        <div className="relative z-10 flex items-center justify-between gap-6 px-8 py-5">
          <div className="flex items-center">
           {options.logo && settings?.logo_url && (
            <img
             src={settings.logo_url}
             alt={settings.company_name ?? "DODRICOM"}
             style={{ height: "22mm" }}
                 />
            )}
          </div>
          <div className="max-w-[52%] text-right">
            <p className="text-[19px] font-bold" style={{ color: "#111" }}>
              {docTitle(doc.doc_type)} N° {doc.number}
            </p>
            <p className="mt-1 text-[13px] font-bold">{doc.client_name}</p>
            {doc.client_address && <p className="text-[11px]">{doc.client_address}</p>}
            {doc.client_ice && <p className="mt-1 text-[12px] font-bold">ICE {doc.client_ice}</p>}
            {doc.order_ref && <p className="text-[12px]">Bon de Commande : {doc.order_ref}</p>}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col px-8 pb-6">
        <div className="mt-4 flex justify-end">
          <span
            className="rounded-full px-6 py-1.5 text-[13px] font-bold text-white"
            style={{ background: CYAN }}
          >
            {(doc.city || "Casablanca") + ", " + formatDateFr(doc.issue_date)}
          </span>
        </div>

        {doc.intro_text && (
          <p className="mt-5 text-[12.5px] leading-relaxed" style={{ fontFamily: "Arial, sans-serif" }}>
            {doc.intro_text}
          </p>
        )}

        {/* Tableau */}
        <table className="mt-5 w-full border-collapse text-[12px]">
          <thead>
            <tr style={{ background: "#bfe4ee" }}>
              <th className="rounded-l-xl px-3 py-2.5 text-left font-bold">Désignation</th>
              <th className="px-3 py-2.5 text-center font-bold">
                Prix U<br />HT ({currency})
              </th>
              <th className="px-3 py-2.5 text-center font-bold">Qté</th>
              <th className="rounded-r-xl px-3 py-2.5 text-center font-bold">
                Prix Total<br />HT ({currency})
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(sections).map(([section, rows]) => (
              <Fragment key={section || "_"}>
                {section && (
                  <tr>
                    <td colSpan={4} className="px-3 pt-4 text-[13px] font-bold" style={{ color: "#3aa3bd" }}>
                      {section}
                    </td>
                  </tr>
                )}
                {rows.map((l, i) => (
                  <tr key={l.id ?? `${section}-${i}`}>
                    <td className="px-3 py-2 font-semibold" style={{ borderRight: `1px solid ${CYAN}` }}>
                      {l.designation}
                    </td>
                    <td className="px-3 py-2 text-center" style={{ borderRight: `1px solid ${CYAN}` }}>
                      {Number(l.unit_price).toFixed(2).replace(".", ",")}
                    </td>
                    <td className="px-3 py-2 text-center" style={{ borderRight: `1px solid ${CYAN}` }}>
                      {l.unit && l.unit !== "" ? l.unit : l.quantity}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {(Number(l.unit_price) * Number(l.quantity)).toFixed(2).replace(".", ",")}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>

        <div className="flex-1" />

        {/* Totaux */}
        <div className="mt-8 flex items-start justify-between gap-6">
          <div className="flex-1">
            <table className="w-full border-collapse text-center text-[11.5px]">
              <thead>
                <tr style={{ background: "#bfe4ee" }}>
                  <th className="rounded-l-lg px-2 py-1.5">Total HT</th>
                  <th className="px-2 py-1.5">Taux TVA</th>
                  <th className="px-2 py-1.5">TVA</th>
                  <th className="px-2 py-1.5">Total TTC</th>
                  <th className="rounded-r-lg px-2 py-1.5">Acompte</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "#fdf6cf" }}>
                  <td className="px-2 py-1.5 font-semibold">{money(doc.total_ht, currency)}</td>
                  <td className="px-2 py-1.5">{Number(doc.vat_rate)}%</td>
                  <td className="px-2 py-1.5">{money(doc.total_vat, currency)}</td>
                  <td className="px-2 py-1.5">{money(doc.total_ttc, currency)}</td>
                  <td className="px-2 py-1.5">{money(doc.deposit, currency)}</td>
                </tr>
              </tbody>
            </table>

            {options.terms && (doc.terms || settings?.terms) && (
              <div className="mt-4 rounded-lg px-4 py-3 text-[11.5px]" style={{ background: "#cfe4e4" }}>
                <p className="mb-1 font-bold">CONDITIONS COMMERCIALES :</p>
                {(doc.terms || settings?.terms || "").split("\n").map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
                {settings?.rib && <p>- RIB : {settings.rib}</p>}
              </div>
            )}
          </div>

          <div className="w-[62mm] shrink-0">
            <div className="rounded-lg px-4 py-4 text-center" style={{ background: "#b9d4d4" }}>
              <p className="text-[14px] font-bold">NET A PAYER</p>
              <p className="mt-2 text-[13px]">{money(doc.net_to_pay, currency)}</p>
              <p className="mt-1 text-[12px] capitalize">{amountInWords(doc.net_to_pay, currency)}</p>
            </div>
            {options.stamp && settings?.stamp_url && (
              <img src={settings.stamp_url} alt="Cachet" className="mx-auto mt-3 max-h-[32mm]" />
            )}
          </div>
        </div>
      </div>

      {/* Pied de page */}
      {options.footer && (
        <div
          className="relative z-10 px-8 py-3 text-center text-[9.5px] leading-relaxed text-white"
          style={{ background: NAVY, fontFamily: "Arial, sans-serif" }}
        >
          <p>
            {settings?.company_name ?? "DODRICOM"}
            {settings?.capital ? ` au capital de ${settings.capital}` : ""}
            {settings?.address ? ` - Siège social : ${settings.address}` : ""}
          </p>
          <p>
            {settings?.phone ? `Tél : ${settings.phone} - ` : ""}
            {settings?.email ? `E-mail : ${settings.email} - ` : ""}
            {settings?.website ? `Web : ${settings.website}` : ""}
          </p>
          <p>
            {settings?.rc ? `R.C : ${settings.rc} - ` : ""}
            {settings?.if_number ? `I.F : ${settings.if_number} - ` : ""}
            {settings?.patente ? `Patente : ${settings.patente} - ` : ""}
            {settings?.ice ? `ICE : ${settings.ice}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
