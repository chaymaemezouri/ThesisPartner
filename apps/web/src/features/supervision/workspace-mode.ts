type SupervisionList = {
  theses?: { track?: string }[];
  pendingSupervisorInvite?: boolean;
  masterSpace?: boolean;
} | null;

/** Full supervisor shell: doctoral supervision or a pending supervisor invite. */
export function isSupervisorWorkspace(data?: SupervisionList): boolean {
  const doctoral = (data?.theses ?? []).some((item) => item.track !== 'MASTER');
  return doctoral || Boolean(data?.pendingSupervisorInvite);
}

/** Master gallery for allowlisted staff, even if they are doctoral students. */
export function isMasterSpace(data?: SupervisionList): boolean {
  return Boolean(data?.masterSpace);
}

export function canOpenSupervision(data?: SupervisionList): boolean {
  return isSupervisorWorkspace(data) || isMasterSpace(data);
}
