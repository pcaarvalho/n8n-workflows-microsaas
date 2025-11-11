import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const WORKFLOWS_DIR = path.join(ROOT_DIR, "workflows");
const TEMPLATES_DIR = path.join(ROOT_DIR, "templates");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const TOOLS_DIR = path.join(ROOT_DIR, "tools");

const SIZE_LIMIT = 5 * 1024 * 1024; // 5MB
const SKIP_TOP_LEVEL = new Set([".git", "tools", "public"]);
const TRASH_DIRS = new Set([
  "node_modules",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  "dist",
  "build",
  ".vercel",
  ".netlify",
]);
const DELETE_EXTS = new Set([
  ".mp4",
  ".mov",
  ".png",
  ".jpg",
  ".jpeg",
  ".psd",
  ".ai",
  ".gif",
]);
const KEEP_ROOT = new Set([
  "workflows",
  "templates",
  "tools",
  "public",
  "README.md",
  "LICENSE",
  ".gitignore",
  "package.json",
  "package-lock.json",
]);
const KEEP_FILES = new Set(["README.md", "LICENSE", ".gitignore", "package.json", "package-lock.json"]);

const args = process.argv.slice(2);
const isApply = args.includes("--apply");
const isDryRun = args.includes("--dry-run") || !isApply;

if (isApply && isDryRun && args.includes("--dry-run")) {
  // both flags present -> invalid
  console.error("Use apenas --dry-run (padrão) ou --apply.");
  process.exit(1);
}

await fs.mkdir(WORKFLOWS_DIR, { recursive: true });
await fs.mkdir(TEMPLATES_DIR, { recursive: true });
await fs.mkdir(PUBLIC_DIR, { recursive: true });

const stats = {
  scanned: 0,
  valid: 0,
  moved: 0,
  removed: 0,
  skipped: 0,
};

const moves = [];
const deletions = [];
const kept = [];

function log(action, detail) {
  console.log(`[${action}] ${detail}`);
}

function determineCategory(text) {
  const normalized = text.toLowerCase();
  const marketingKeywords = ["twitter", "reddit", "youtube", "notion", "blog", "seo", "marketing"];
  const salesKeywords = ["crm", "hubspot", "pipedrive", "gmail", "lead", "vendas", "salesforce"];
  const supportKeywords = ["zendesk", "freshdesk", "whatsapp", "telegram", "support", "ticket"];

  if (marketingKeywords.some((kw) => normalized.includes(kw))) return "marketing";
  if (salesKeywords.some((kw) => normalized.includes(kw))) return "vendas";
  if (supportKeywords.some((kw) => normalized.includes(kw))) return "suporte";
  return "outros";
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function uniquePath(targetPath) {
  if (!(await pathExists(targetPath))) return targetPath;
  const dir = path.dirname(targetPath);
  const ext = path.extname(targetPath);
  const base = path.basename(targetPath, ext);
  let attempt = 1;
  let candidate = path.join(dir, `${base}-${attempt}${ext}`);
  while (await pathExists(candidate)) {
    attempt += 1;
    candidate = path.join(dir, `${base}-${attempt}${ext}`);
  }
  return candidate;
}

async function scheduleMove(from, to, reason) {
  const finalPath = await uniquePath(to);
  moves.push({ from, to: finalPath, reason });
  stats.moved += 1;
  log("MOVE", `${path.relative(ROOT_DIR, from)} -> ${path.relative(ROOT_DIR, finalPath)} (${reason})`);
}

function scheduleDeletion(target, reason) {
  deletions.push({ target, reason });
  stats.removed += 1;
  log("DELETE", `${path.relative(ROOT_DIR, target)} (${reason})`);
}

function markKeep(relPath) {
  kept.push(relPath);
}

async function handleJson(filePath, relPath, size) {
  if (size > SIZE_LIMIT) {
    stats.skipped += 1;
    log("SKIP", `${relPath} (>5MB)`);
    return;
  }

  stats.scanned += 1;
  let data;
  try {
    const content = await fs.readFile(filePath, "utf-8");
    data = JSON.parse(content);
  } catch (err) {
    scheduleDeletion(filePath, `JSON inválido (${err.message})`);
    return;
  }

  if (!Array.isArray(data.nodes) || typeof data.connections !== "object" || data.connections === null) {
    scheduleDeletion(filePath, "Sem chaves nodes/connections válidas");
    return;
  }

  stats.valid += 1;
  const combinedText = `${relPath} ${JSON.stringify(data.nodes).slice(0, 200)}`;
  const category = determineCategory(combinedText);
  const insideWorkflows = relPath.startsWith(`workflows${path.sep}`);

  if (!insideWorkflows) {
    const destinationDir = path.join(WORKFLOWS_DIR, category);
    await fs.mkdir(destinationDir, { recursive: true });
    const destination = path.join(destinationDir, path.basename(filePath));
    await scheduleMove(filePath, destination, `workflow -> ${category}`);
  } else {
    markKeep(relPath);
  }
}

async function handleTemplate(filePath, relPath) {
  if (relPath.startsWith(`templates${path.sep}`)) {
    markKeep(relPath);
    return;
  }
  const destination = path.join(TEMPLATES_DIR, path.basename(filePath));
  await scheduleMove(filePath, destination, "template");
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT_DIR, absPath);
    if (relPath === "") continue;

    const topLevel = relPath.split(path.sep)[0];
    if (SKIP_TOP_LEVEL.has(topLevel)) continue;

    if (entry.isDirectory()) {
      if (TRASH_DIRS.has(entry.name)) {
        scheduleDeletion(absPath, "Pasta descartável");
        continue;
      }
      await walk(absPath);
      continue;
    }

    if (KEEP_FILES.has(relPath)) {
      markKeep(relPath);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    const stat = await fs.stat(absPath);

    if (ext === ".json") {
      await handleJson(absPath, relPath, stat.size);
    } else if (ext === ".md" || ext === ".zip") {
      await handleTemplate(absPath, relPath);
    } else if (DELETE_EXTS.has(ext)) {
      scheduleDeletion(absPath, "Arquivo de mídia não suportado");
    } else {
      scheduleDeletion(absPath, "Arquivo fora do escopo");
    }
  }
}

async function cleanupRootEntries() {
  const entries = await fs.readdir(ROOT_DIR);
  for (const entry of entries) {
    if (entry === ".git") continue;
    if (KEEP_ROOT.has(entry)) continue;
    const target = path.join(ROOT_DIR, entry);
    scheduleDeletion(target, "Entrada raiz não permitida");
  }
}

async function removeTarget(target) {
  const options = { recursive: true, force: true };
  const attempts = 3;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await fs.rm(target, options);
      return;
    } catch (err) {
      if (err.code === "ENOENT") {
        return;
      }
      if (err.code === "ENOTEMPTY" && i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }
      throw err;
    }
  }
}

await walk(ROOT_DIR);
await cleanupRootEntries();

if (!isDryRun) {
  for (const move of moves) {
    await fs.mkdir(path.dirname(move.to), { recursive: true });
    await fs.rename(move.from, move.to);
  }
  for (const deletion of deletions) {
    await removeTarget(deletion.target);
  }
}

console.log("\nResumo:");
console.log(
  JSON.stringify(
    {
      modo: isDryRun ? "dry-run" : "apply",
      ...stats,
      moves: moves.length,
      deletions: deletions.length,
    },
    null,
    2
  )
);
