import { ProductionWorkbookParseError } from "../application/production-task-errors";

/** RFC 4180 quoting, UTF-8 BOM and Excel's semicolon separator; no formula evaluation. */
export function parseProductionCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  const fail = () => {
    throw new ProductionWorkbookParseError("invalid_workbook");
  };
  const pushField = () => {
    if (field.length > 2000 || row.length >= 35)
      throw new ProductionWorkbookParseError("limits_exceeded");
    row.push(field);
    field = "";
    closed = false;
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
    if (rows.length > 2000) throw new ProductionWorkbookParseError("limits_exceeded");
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += char;
    } else if (char === delimiter) pushField();
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      pushRow();
    } else if (char === '"') {
      if (field || closed) fail();
      quoted = true;
    } else {
      if (closed) fail();
      field += char;
    }
    if (field.length > 2000) throw new ProductionWorkbookParseError("limits_exceeded");
  }
  if (quoted) fail();
  if (field || row.length || closed) pushRow();
  if (!rows.length) fail();
  return rows;
}
