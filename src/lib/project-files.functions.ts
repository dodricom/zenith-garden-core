import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FsEntry = {
  name: string;
  path: string;
  type: "dir" | "file";
  size: number;
};

type Ctx = {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
};

async function assertAdmin(context: Ctx) {
  const [admin, superAdmin] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
  ]);
  if (!admin.data && !superAdmin.data) throw new Error("Accès refusé : réservé aux administrateurs.");
}

const BLOCKED = [".git", "node_modules", ".env", ".env.local", "dist", ".output", ".vinxi", "bun.lockb"];

function safeRelative(input: string) {
  const rel = (input || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (rel.split("/").some((p) => p === "..")) throw new Error("Chemin invalide.");
  const first = rel.split("/")[0] ?? "";
  if (BLOCKED.includes(first)) throw new Error("Ce dossier est protégé.");
  return rel;
}

async function nodeFs() {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const root = process.cwd();
  const abs = (rel: string) => path.join(root, rel);
  return { fs, path, root, abs };
}

const TEXT_EXT = new Set([
  "ts", "tsx", "js", "jsx", "json", "css", "scss", "html", "md", "mdx", "txt", "svg",
  "yml", "yaml", "toml", "sql", "env", "gitignore", "prettierrc", "sh",
]);

export function isTextPath(p: string) {
  const ext = p.split(".").pop()?.toLowerCase() ?? "";
  return TEXT_EXT.has(ext) || !p.includes(".");
}

export const listProjectFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dir?: string }) => d)
  .handler(async ({ data, context }): Promise<FsEntry[]> => {
    await assertAdmin(context as unknown as Ctx);
    const rel = safeRelative(data.dir ?? "");
    const { fs, abs } = await nodeFs();
    const items = await fs.readdir(abs(rel), { withFileTypes: true });
    const out: FsEntry[] = [];
    for (const it of items) {
      if (BLOCKED.includes(it.name)) continue;
      const p = rel ? `${rel}/${it.name}` : it.name;
      let size = 0;
      if (it.isFile()) {
        try {
          size = (await fs.stat(abs(p))).size;
        } catch {
          size = 0;
        }
      }
      out.push({ name: it.name, path: p, type: it.isDirectory() ? "dir" : "file", size });
    }
    return out.sort((a, b) =>
      a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1,
    );
  });

export const readProjectFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data, context }): Promise<{ path: string; content: string; binary: boolean; dataUrl?: string }> => {
    await assertAdmin(context as unknown as Ctx);
    const rel = safeRelative(data.path);
    const { fs, abs } = await nodeFs();
    if (isTextPath(rel)) {
      const content = await fs.readFile(abs(rel), "utf8");
      return { path: rel, content, binary: false };
    }
    const buf = await fs.readFile(abs(rel));
    const ext = rel.split(".").pop()?.toLowerCase() ?? "";
    const mime =
      ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg";
    return {
      path: rel,
      content: "",
      binary: true,
      dataUrl: `data:${mime};base64,${Buffer.from(buf).toString("base64")}`,
    };
  });

export const writeProjectFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string; content: string }) => d)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context as unknown as Ctx);
    const rel = safeRelative(data.path);
    const { fs, abs } = await nodeFs();
    await fs.writeFile(abs(rel), data.content, "utf8");
    return { ok: true };
  });

export const createProjectEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string; kind: "file" | "dir"; base64?: string }) => d)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context as unknown as Ctx);
    const rel = safeRelative(data.path);
    const { fs, path, abs } = await nodeFs();
    if (data.kind === "dir") {
      await fs.mkdir(abs(rel), { recursive: true });
    } else {
      await fs.mkdir(path.dirname(abs(rel)), { recursive: true });
      if (data.base64) await fs.writeFile(abs(rel), Buffer.from(data.base64, "base64"));
      else await fs.writeFile(abs(rel), "", "utf8");
    }
    return { ok: true };
  });

export const deleteProjectEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context as unknown as Ctx);
    const rel = safeRelative(data.path);
    if (!rel) throw new Error("Chemin invalide.");
    const { fs, abs } = await nodeFs();
    await fs.rm(abs(rel), { recursive: true, force: true });
    return { ok: true };
  });

export const renameProjectEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string }) => d)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context as unknown as Ctx);
    const from = safeRelative(data.from);
    const to = safeRelative(data.to);
    const { fs, path, abs } = await nodeFs();
    await fs.mkdir(path.dirname(abs(to)), { recursive: true });
    await fs.rename(abs(from), abs(to));
    return { ok: true };
  });
