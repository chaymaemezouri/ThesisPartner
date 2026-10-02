export const PROFILE_COMPLETION_FIELDS = [
  'givenName',
  'familyName',
  'institution',
  'laboratory',
  'specialty',
  'avatarUrl',
  'orcid',
] as const;

export type ProfileCompletionField = (typeof PROFILE_COMPLETION_FIELDS)[number];

export type ProfileCompletionInput = Record<ProfileCompletionField, string | null | undefined>;

export function profileCompletion(profile: ProfileCompletionInput): {
  percentage: number;
  missingFields: ProfileCompletionField[];
} {
  const missingFields = PROFILE_COMPLETION_FIELDS.filter((field) => {
    const value = profile[field];
    return value == null || value.trim().length === 0;
  });
  const filled = PROFILE_COMPLETION_FIELDS.length - missingFields.length;
  return {
    percentage: Math.round((filled / PROFILE_COMPLETION_FIELDS.length) * 100),
    missingFields,
  };
}
