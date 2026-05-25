import { parse } from "csv-parse/sync";

export type ImportedRow = {
  line: number;
  raw: string;
  quantity: number;
  name: string;
  setCode?: string;
  collectorNumber?: string;
  sourceSection: string;
  commander: boolean;
};

export type ImportWarning = { line: number; raw: string; message: string };
export type ImportParseResult = { rows: ImportedRow[]; warnings: ImportWarning[]; detectedFormat: "csv" | "text" };

const sections = new Set(["commander", "creatures", "instants", "sorceries", "artifacts", "enchantments", "planeswalkers", "lands"]);

export function parseImportedList(input: string): ImportParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { rows: [], warnings: [], detectedFormat: "text" };
  return looksLikeCsv(trimmed) ? parseCsv(trimmed) : parseText(trimmed);
}

function looksLikeCsv(input: string): boolean {
  const first = input.split(/\r?\n/, 1)[0].toLowerCase();
  return first.includes("name") && (first.includes("quantity") || first.includes("count"));
}

function parseCsv(input: string): ImportParseResult {
  const rows: ImportedRow[] = [];
  const warnings: ImportWarning[] = [];
  const lines = input.split(/\r?\n/);
  const headers = parseCsvLine(lines[0]) ?? [];

  lines.slice(1).forEach((lineText, index) => {
    const raw = lineText.trim();
    const line = index + 2;
    if (!raw) return;

    const values = parseCsvLine(raw);
    if (!values || values.length !== headers.length) {
      warnings.push({ line, raw, message: "Could not parse CSV card name and quantity." });
      return;
    }

    const record = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]));
    const name = pick(record, ["Name", "Card Name", "name", "card"]);
    const quantity = Number.parseInt(pick(record, ["Quantity", "Count", "quantity", "count"]) ?? "1", 10);
    if (!name || !Number.isFinite(quantity) || quantity <= 0) {
      warnings.push({ line, raw, message: "Could not parse CSV card name and quantity." });
      return;
    }
    const section = normalizeSection(pick(record, ["Section", "Category", "section"]) ?? "main");
    rows.push({
      line,
      raw: JSON.stringify(record),
      quantity,
      name,
      setCode: pick(record, ["Set code", "Set", "set"]),
      collectorNumber: pick(record, ["Collector number", "Collector Number", "Number"]),
      sourceSection: section,
      commander: section === "commander"
    });
  });
  return { rows, warnings, detectedFormat: "csv" };
}

function parseCsvLine(line: string): string[] | null {
  try {
    const records = parse(line, { skip_empty_lines: true, trim: true }) as string[][];
    return records[0] ?? null;
  } catch {
    return null;
  }
}

function parseText(input: string): ImportParseResult {
  const rows: ImportedRow[] = [];
  const warnings: ImportWarning[] = [];
  let currentSection = "main";
  input.split(/\r?\n/).forEach((lineText, index) => {
    const raw = lineText.trim();
    const line = index + 1;
    if (!raw) return;
    const section = normalizeSection(raw.replace(/:$/, ""));
    if (sections.has(section)) {
      currentSection = section;
      return;
    }
    const commanderPrefix = raw.match(/^commander:\s*(.+)$/i);
    if (commanderPrefix) {
      rows.push({ line, raw, quantity: 1, name: commanderPrefix[1].trim(), sourceSection: "commander", commander: true });
      return;
    }
    const match = raw.match(/^(\d+)\s+x?\s*(.+?)(?:\s+\(([A-Z0-9]{2,5})\)\s*(\S+))?$/i);
    if (!match) {
      warnings.push({ line, raw, message: "Could not parse a quantity and card name." });
      return;
    }
    rows.push({
      line,
      raw,
      quantity: Number.parseInt(match[1], 10),
      name: match[2].trim(),
      setCode: match[3],
      collectorNumber: match[4],
      sourceSection: currentSection,
      commander: currentSection === "commander"
    });
  });
  return { rows, warnings, detectedFormat: "text" };
}

function pick(record: Record<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

function normalizeSection(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}
