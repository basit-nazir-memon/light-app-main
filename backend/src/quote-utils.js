import { randomInt } from "crypto";

export function migrateQuotesColumns(db) {
  const cols = db.prepare("PRAGMA table_info(quotes)").all().map((c) => c.name);
  if (!cols.includes("notes")) db.exec("ALTER TABLE quotes ADD COLUMN notes TEXT");
  if (!cols.includes("warranty")) db.exec("ALTER TABLE quotes ADD COLUMN warranty TEXT");
  if (!cols.includes("discount_type")) {
    db.exec("ALTER TABLE quotes ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'none'");
  }
  if (!cols.includes("discount_value")) {
    db.exec("ALTER TABLE quotes ADD COLUMN discount_value REAL NOT NULL DEFAULT 0");
  }
}

export function partLineAmount(item) {
  return Number(item.qty || 0) * Number(item.price || 0);
}

export function labourLineAmount(item) {
  if (item.fixedRate) return Number(item.rate || 0);
  return Number(item.rate || 0) * Number(item.hours || 0);
}

export function partsTotalFromLines(lines) {
  return (lines ?? []).reduce((s, i) => s + partLineAmount(i), 0);
}

export function labourTotalFromLines(lines) {
  return (lines ?? []).reduce((s, i) => s + labourLineAmount(i), 0);
}

/** Legacy section totals */
export function labourTotalFromSections(sections) {
  return (sections ?? []).reduce(
    (s, sec) => s + (sec.items ?? []).reduce((a, i) => a + Number(i.price || 0), 0),
    0,
  );
}

export function partsTotalFromSections(sections) {
  return (sections ?? []).reduce(
    (s, sec) =>
      s + (sec.items ?? []).reduce((a, i) => a + Number(i.qty || 0) * Number(i.price || 0), 0),
    0,
  );
}

function flattenSectionsToPartsLines(sections) {
  const lines = [];
  for (const sec of sections ?? []) {
    for (const item of sec.items ?? []) {
      if (!item.description?.trim() && !item.name?.trim()) continue;
      const qty = Number(item.qty ?? 1);
      const price = Number(item.price ?? 0);
      lines.push({
        description: item.description ?? item.name ?? "",
        qty,
        price,
        amount: qty * price,
      });
    }
  }
  return lines;
}

function flattenSectionsToLabourLines(sections) {
  const lines = [];
  for (const sec of sections ?? []) {
    for (const item of sec.items ?? []) {
      if (!item.description?.trim()) continue;
      const price = Number(item.price ?? item.rate ?? 0);
      lines.push({
        description: item.description,
        rate: price,
        hours: 1,
        fixedRate: true,
        amount: price,
      });
    }
  }
  return lines;
}

export function normalizeQuoteRow(row) {
  if (!row) return row;

  let parsed = row.parts;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = {};
    }
  }

  let partsLines = [];
  let labourLines = [];

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    if (parsed.parts_lines) {
      partsLines = parsed.parts_lines.map((i) => ({
        description: i.description ?? "",
        qty: Number(i.qty ?? 1),
        price: Number(i.price ?? 0),
        amount: Number(i.amount ?? partLineAmount(i)),
      }));
    } else if (parsed.parts_sections) {
      partsLines = flattenSectionsToPartsLines(parsed.parts_sections);
    }
    if (parsed.labour_lines) {
      labourLines = parsed.labour_lines.map((i) => ({
        description: i.description ?? "",
        rate: Number(i.rate ?? 0),
        hours: Number(i.hours ?? 0),
        fixedRate: Boolean(i.fixedRate),
        amount: Number(i.amount ?? labourLineAmount(i)),
      }));
    } else if (parsed.labour_sections) {
      labourLines = flattenSectionsToLabourLines(parsed.labour_sections);
    }
  } else if (Array.isArray(parsed)) {
    partsLines = flattenSectionsToPartsLines([{ category: "Parts", items: parsed }]);
  }

  if (partsLines.length === 0 && Number(row.labour) > 0 && labourLines.length === 0) {
    labourLines = [
      {
        description: "Labour",
        rate: Number(row.labour),
        hours: 1,
        fixedRate: true,
        amount: Number(row.labour),
      },
    ];
  }

  const labour = labourTotalFromLines(labourLines);

  return {
    ...row,
    parts_lines: partsLines,
    labour_lines: labourLines,
    labour,
    discount_type: row.discount_type ?? "none",
    discount_value: Number(row.discount_value ?? 0),
    warranty: row.warranty ?? null,
  };
}

export function serializeQuoteData(partsLines, labourLines) {
  return JSON.stringify({
    parts_lines: partsLines ?? [],
    labour_lines: labourLines ?? [],
  });
}

/** Unique random: QUO-{year}-{random 6 digits} */
export function nextQuoteNumber(db) {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 100; attempt++) {
    const rand = randomInt(100000, 999999);
    const number = `QUO-${year}-${rand}`;
    const exists = db.prepare("SELECT id FROM quotes WHERE number = ?").get(number);
    if (!exists) return number;
  }
  return `QUO-${year}-${Date.now().toString().slice(-8)}`;
}
