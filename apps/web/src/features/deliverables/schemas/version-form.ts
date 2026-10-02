import { z } from 'zod';

export type VersionFormValues = { changeSummary: string };

export function versionFormSchema(requiresSummary: boolean): z.ZodType<VersionFormValues> {
  return z
    .object({
      changeSummary: z.string().trim().max(1000),
    })
    .strict()
    .superRefine((value, ctx) => {
      if (requiresSummary && value.changeSummary.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['changeSummary'],
          message: 'Champ requis',
        });
      }
    });
}
