import { useMutation } from '@tanstack/react-query';
import { researchAiSynthesisSchema } from '@thesispartner/validation';
import type { z } from 'zod';
import { apiSend } from '../../../api/client';

export type ResearchAiSynthesis = z.infer<typeof researchAiSynthesisSchema>;

export function useGenerateResearchAi(thesisId: string | null, locale: 'en' | 'fr') {
  return useMutation({
    mutationFn: async () => {
      if (!thesisId) throw new Error('Missing thesis');
      return apiSend(
        `/api/v1/theses/${thesisId}/research-ai/generate?locale=${locale}`,
        researchAiSynthesisSchema,
        {},
      );
    },
  });
}
