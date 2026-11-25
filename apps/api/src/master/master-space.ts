const DEFAULT_SPACE_EMAILS = ['jihaneelmouden1@gmail.com', 'mezziyyani@uae.ac.ma'];
const DEFAULT_SUPERVISOR_EMAIL = 'mezziyyani@uae.ac.ma';

export function parseEmailList(value: string | undefined, fallback: string[]): string[] {
  const source = value?.trim() ? value.split(',') : fallback;
  return [
    ...new Set(
      source.map((item) => item.trim().toLowerCase()).filter((item) => item.includes('@')),
    ),
  ];
}

export function masterSpaceEmails(env: { MASTER_SPACE_EMAILS?: string }): string[] {
  return parseEmailList(env.MASTER_SPACE_EMAILS, DEFAULT_SPACE_EMAILS);
}

export function masterSupervisorEmail(env: { MASTER_SUPERVISOR_EMAIL?: string }): string {
  const value = env.MASTER_SUPERVISOR_EMAIL?.trim().toLowerCase();
  return value || DEFAULT_SUPERVISOR_EMAIL;
}

export function isMasterSpaceEmail(
  email: string | null | undefined,
  env: { MASTER_SPACE_EMAILS?: string },
): boolean {
  if (!email) return false;
  return masterSpaceEmails(env).includes(email.trim().toLowerCase());
}
