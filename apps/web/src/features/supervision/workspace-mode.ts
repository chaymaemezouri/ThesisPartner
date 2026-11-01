/** Supervisor shell when the user already supervises theses or has a pending invite. */
export function isSupervisorWorkspace(
  data?: {
    theses: unknown[];
    pendingSupervisorInvite?: boolean;
  } | null,
): boolean {
  return (data?.theses.length ?? 0) > 0 || Boolean(data?.pendingSupervisorInvite);
}
