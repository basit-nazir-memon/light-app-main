import type { Job, Mechanic } from "@/lib/mockData";
import { normalizeJobBoardStatus } from "@/lib/mockData";

/** All mechanic names assigned to a job (array + legacy comma-separated field). */
export function getJobAssignedMechanics(job: Job): string[] {
  const names = new Set<string>();
  for (const n of job.mechanics ?? []) {
    const t = n?.trim();
    if (t) names.add(t);
  }
  const legacy = job.mechanic?.trim();
  if (legacy) {
    for (const part of legacy.split(",")) {
      const t = part.trim();
      if (t) names.add(t);
    }
  }
  return [...names];
}

export function isMechanicAssignedToJob(job: Job, mechanicName: string): boolean {
  const target = mechanicName.trim().toLowerCase();
  if (!target) return false;
  return getJobAssignedMechanics(job).some((n) => n.toLowerCase() === target);
}

/** Count job cards where this mechanic is assigned. */
export function countAssignedJobsForMechanic(mechanicName: string, jobs: Job[]): number {
  return jobs.filter((j) => isMechanicAssignedToJob(j, mechanicName)).length;
}

export function countCompletedJobsForMechanic(mechanicName: string, jobs: Job[]): number {
  return jobs.filter(
    (j) =>
      isMechanicAssignedToJob(j, mechanicName) &&
      normalizeJobBoardStatus(j.status) === "Completed",
  ).length;
}

export type MechanicJobStat = {
  mechanicId: string;
  name: string;
  shortName: string;
  assignedJobs: number;
  completedJobs: number;
};

export function buildMechanicJobStats(
  mechanics: Mechanic[],
  jobs: Job[],
  options?: { activeOnly?: boolean },
): MechanicJobStat[] {
  const list =
    options?.activeOnly === false
      ? mechanics
      : mechanics.filter((m) => m.status === "Active");

  return list
    .map((m) => ({
      mechanicId: m.id,
      name: m.name,
      shortName: m.name.split(" ")[0] || m.name,
      assignedJobs: countAssignedJobsForMechanic(m.name, jobs),
      completedJobs: countCompletedJobsForMechanic(m.name, jobs),
    }))
    .sort((a, b) => b.assignedJobs - a.assignedJobs);
}

/** Chart-friendly rows: assigned job count per mechanic. */
export function buildMechanicJobChartData(
  mechanics: Mechanic[],
  jobs: Job[],
  options?: { activeOnly?: boolean; limit?: number },
): { name: string; jobs: number; completed: number }[] {
  return buildMechanicJobStats(mechanics, jobs, options)
    .slice(0, options?.limit ?? 12)
    .map((s) => ({
      name: s.shortName,
      jobs: s.assignedJobs,
      completed: s.completedJobs,
    }));
}
