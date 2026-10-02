import type { ApiFieldError } from '@thesispartner/types';
import type { ZodIssue } from 'zod';

export function formatZodIssues(issues: ZodIssue[]): ApiFieldError[] {
  return issues.slice(0, 20).map((issue) => ({
    field: issue.path.map(String).join('.') || 'body',
    message: issue.message.slice(0, 200),
  }));
}
