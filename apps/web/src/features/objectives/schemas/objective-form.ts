import { z } from 'zod';
import { objectiveStatusSchema } from '@thesispartner/validation';
import type { ObjectiveBody } from '../hooks/use-objectives';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const objectiveFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Champ requis').max(200),
    description: z.string().trim().max(4000),
    status: objectiveStatusSchema,
    startDate: z.union([day, z.literal('')]),
    dueDate: z.union([day, z.literal('')]),
    progress: z.coerce.number().int().min(0, 'Entre 0 et 100').max(100, 'Entre 0 et 100'),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.startDate && value.dueDate && value.dueDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueDate'],
        message: 'L’échéance doit être postérieure ou égale au début',
      });
    }
  });

export type ObjectiveFormValues = z.infer<typeof objectiveFormSchema>;

export function toObjectiveBody(values: ObjectiveFormValues): ObjectiveBody {
  return {
    title: values.title,
    description: values.description,
    status: values.status,
    startDate: values.startDate || null,
    dueDate: values.dueDate || null,
    progress: values.progress,
  };
}

export function emptyObjectiveForm(): ObjectiveFormValues {
  return {
    title: '',
    description: '',
    status: 'PLANNED',
    startDate: '',
    dueDate: '',
    progress: 0,
  };
}
