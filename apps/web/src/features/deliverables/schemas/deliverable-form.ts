import { deliverableTypeSchema } from '@thesispartner/validation';
import { z } from 'zod';
import type { DeliverableDraft } from '../hooks/use-deliverables';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const deliverableFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Champ requis').max(200),
    description: z.string().trim().max(4000),
    type: deliverableTypeSchema,
    objectiveId: z.union([z.string().uuid(), z.literal('')]),
    dueDate: z.union([day, z.literal('')]),
  })
  .strict();

export type DeliverableFormValues = z.infer<typeof deliverableFormSchema>;

export function emptyDeliverableForm(): DeliverableFormValues {
  return { title: '', description: '', type: 'ARTICLE', objectiveId: '', dueDate: '' };
}

export function toDeliverableDraft(values: DeliverableFormValues): DeliverableDraft {
  return {
    title: values.title,
    description: values.description,
    type: values.type,
    objectiveId: values.objectiveId || null,
    dueDate: values.dueDate || null,
  };
}
