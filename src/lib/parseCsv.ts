/** Minimal RFC 4180-style CSV parser (handles quoted fields and newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;

  const pushRow = () => {
    row.push(cell);
    cell = "";
    if (row.some((c) => c.length > 0)) rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i]!;

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      pushRow();
      i += 1;
      continue;
    }

    cell += c;
    i += 1;
  }

  row.push(cell);
  if (row.some((c) => c.length > 0)) rows.push(row);

  return rows;
}
