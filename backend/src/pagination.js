/** Shared list query parsing and paginated JSON responses. */

export function parseListQuery(req, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  const search = String(req.query.search ?? "").trim();
  const offset = (page - 1) * limit;
  const all = req.query.all === "true" || req.query.all === "1";
  return { page, limit, search, offset, all };
}

export function paginated(items, total, page, limit) {
  const t = Number(total) || 0;
  const l = Number(limit) || 20;
  return {
    items,
    total: t,
    page,
    limit: l,
    totalPages: Math.max(1, Math.ceil(t / l)),
  };
}

/** SQLite LIKE pattern (escape % and _). */
export function likePattern(search) {
  if (!search) return null;
  return `%${search.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
}

export function buildLikeClause(columns, search) {
  const pattern = likePattern(search);
  if (!pattern) return { clause: "", params: [] };
  const parts = columns.map((col) => `${col} LIKE ? ESCAPE '\\'`);
  return {
    clause: ` AND (${parts.join(" OR ")})`,
    params: columns.map(() => pattern),
  };
}
