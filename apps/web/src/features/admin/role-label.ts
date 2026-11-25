import type { useT } from '../../i18n/LocaleContext';

type Translate = ReturnType<typeof useT>;

export function adminMembershipRoleLabel(
  t: Translate,
  role: string,
  track?: string | null,
): string {
  if (role === 'MASTER_STUDENT' || (role === 'DOCTORAL_STUDENT' && track === 'MASTER')) {
    return t('admin.roles.masterStudent');
  }
  if (role === 'DOCTORAL_STUDENT') return t('admin.roles.doctoral');
  if (role === 'SUPERVISOR') return t('admin.roles.supervisor');
  return t('admin.roles.thesisAdmin');
}

export function adminMembershipRoleTone(role: string, track?: string | null) {
  if (role === 'MASTER_STUDENT' || (role === 'DOCTORAL_STUDENT' && track === 'MASTER')) {
    return 'violet' as const;
  }
  if (role === 'DOCTORAL_STUDENT') return 'teal' as const;
  if (role === 'SUPERVISOR') return 'brand' as const;
  return 'muted' as const;
}
