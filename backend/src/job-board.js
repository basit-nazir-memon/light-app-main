/** Job card board status helpers for SQL filters. */

export const COMPLETED_RECENT_LIMIT = 5;

/** Map API filter to SQL on jobs.status */
export function jobBoardFilterClause(boardStatus) {
  if (!boardStatus || boardStatus === "all") {
    return { clause: "", params: [] };
  }
  if (boardStatus === "created") {
    return {
      clause: ` AND j.status IN ('Created', 'Pending', 'Diagnosing', 'Waiting for Parts', 'Cancelled')`,
      params: [],
    };
  }
  if (boardStatus === "wip") {
    return {
      clause: ` AND j.status IN ('Work in Progress', 'In Progress')`,
      params: [],
    };
  }
  if (boardStatus === "completed") {
    return { clause: ` AND j.status = 'Completed'`, params: [] };
  }
  return { clause: "", params: [] };
}

export function jobBoardColumnClause(column) {
  if (column === "created") {
    return `j.status IN ('Created', 'Pending', 'Diagnosing', 'Waiting for Parts', 'Cancelled')`;
  }
  if (column === "wip") {
    return `j.status IN ('Work in Progress', 'In Progress')`;
  }
  if (column === "completed") {
    return `j.status = 'Completed'`;
  }
  return "1=0";
}
