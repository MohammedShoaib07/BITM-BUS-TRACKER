import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

/**
 * Generic CSV-backed repository.
 * Real, persistent, file-based storage — every read hits disk, every write
 * is flushed to disk immediately. This is intentionally isolated behind a
 * repository interface so it can be swapped for PostgreSQL/Prisma later
 * without touching business logic (see services/controllers).
 */
export class CsvRepository<T extends Record<string, any>> {
  private filePath: string;
  private columns: string[];

  constructor(fileName: string, columns: string[]) {
    this.filePath = path.join(__dirname, "..", "..", "..", "data", fileName);
    this.columns = columns;
    this.ensureFile();
  }

  private ensureFile() {
    if (!fs.existsSync(this.filePath)) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, this.columns.join(",") + "\n", "utf-8");
    }
  }

  readAll(): T[] {
    const raw = fs.readFileSync(this.filePath, "utf-8");
    if (!raw.trim()) return [];
    const records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      cast: (value, ctx) => {
        if (value === "") return value;
        if (value === "true") return true;
        if (value === "false") return false;
        if (!isNaN(Number(value)) && value.trim() !== "" && !ctx.column?.toString().toLowerCase().includes("id") && !ctx.column?.toString().toLowerCase().includes("number")) {
          return Number(value);
        }
        return value;
      }
    });
    return records as T[];
  }

  private writeAll(rows: T[]) {
    const out = stringify(rows, { header: true, columns: this.columns });
    fs.writeFileSync(this.filePath, out, "utf-8");
  }

  findById(id: string, idField: keyof T = "id" as keyof T): T | undefined {
    return this.readAll().find((r) => String(r[idField]) === String(id));
  }

  findWhere(predicate: (row: T) => boolean): T[] {
    return this.readAll().filter(predicate);
  }

  findOneWhere(predicate: (row: T) => boolean): T | undefined {
    return this.readAll().find(predicate);
  }

  insert(row: T): T {
    const rows = this.readAll();
    rows.push(row);
    this.writeAll(rows);
    return row;
  }

  update(id: string, updates: Partial<T>, idField: keyof T = "id" as keyof T): T | undefined {
    const rows = this.readAll();
    const idx = rows.findIndex((r) => String(r[idField]) === String(id));
    if (idx === -1) return undefined;
    rows[idx] = { ...rows[idx], ...updates };
    this.writeAll(rows);
    return rows[idx];
  }

  upsert(row: T, idField: keyof T = "id" as keyof T): T {
    const rows = this.readAll();
    const idx = rows.findIndex((r) => String(r[idField]) === String(row[idField]));
    if (idx === -1) rows.push(row);
    else rows[idx] = { ...rows[idx], ...row };
    this.writeAll(rows);
    return row;
  }

  delete(id: string, idField: keyof T = "id" as keyof T): boolean {
    const rows = this.readAll();
    const next = rows.filter((r) => String(r[idField]) !== String(id));
    const changed = next.length !== rows.length;
    if (changed) this.writeAll(next);
    return changed;
  }

  /** Keep only the most recent N rows matching predicate (used for locations log pruning). */
  pruneKeepLatest(predicate: (row: T) => boolean, keep: number, sortKey: keyof T) {
    const rows = this.readAll();
    const matching = rows.filter(predicate).sort((a, b) => String(a[sortKey]).localeCompare(String(b[sortKey])));
    if (matching.length <= keep) return;
    const toDrop = new Set(matching.slice(0, matching.length - keep));
    const next = rows.filter((r) => !toDrop.has(r));
    this.writeAll(next);
  }
}
