import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const WORKFLOWS_DIR = path.join(ROOT_DIR, "workflows");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const OUTPUT_FILE = path.join(PUBLIC_DIR, "catalog.json");
const SIZE_LIMIT = 5 * 1024 * 1024;

function determineCategoryFromContent(relPath, nodes) {
  const basis = `${relPath} ${JSON.stringify(nodes).slice(0, 200)}`.toLowerCase();
  const marketing = ["twitter", "reddit", "youtube", "notion", "blog", "seo", "marketing"];
  const sales = ["crm", "hubspot", "pipedrive", "gmail", "lead", "salesforce", "deal"];
  const support = ["zendesk", "freshdesk", "whatsapp", "telegram", "support", "ticket"];
  if (marketing.some((kw) => basis.includes(kw))) return "marketing";
  if (sales.some((kw) => basis.includes(kw))) return "vendas";
  if (support.some((kw) => basis.includes(kw))) return "suporte";
  return "outros";
}

async function collectWorkflows(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const collection = [];

  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collection.push(...(await collectWorkflows(abs)));
      continue;
    }

    if (!entry.name.endsWith(".json")) continue;
    const rel = path.relative(ROOT_DIR, abs);
    const stat = await fs.stat(abs);
    if (stat.size > SIZE_LIMIT) continue;

    try {
      const raw = await fs.readFile(abs, "utf-8");
      const data = JSON.parse(raw);
      if (!Array.isArray(data.nodes) || typeof data.connections !== "object" || data.connections === null) {
        continue;
      }

      const relWithin = path.relative(WORKFLOWS_DIR, abs);
      const folderCategory = relWithin.split(path.sep)[0] || "outros";
      const category = ["marketing", "vendas", "suporte", "outros"].includes(folderCategory)
        ? folderCategory
        : determineCategoryFromContent(rel, data.nodes);

      collection.push({
        id: path.basename(entry.name, ".json"),
        path: rel.replace(/\\/g, "/"),
        category,
        nodes: data.nodes.length,
        connections: Object.keys(data.connections).length,
      });
    } catch {
      continue;
    }
  }

  return collection;
}

await fs.mkdir(PUBLIC_DIR, { recursive: true });
const workflows = await collectWorkflows(WORKFLOWS_DIR);
await fs.writeFile(OUTPUT_FILE, JSON.stringify(workflows, null, 2));
console.log(`Catalogados ${workflows.length} workflows → ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
