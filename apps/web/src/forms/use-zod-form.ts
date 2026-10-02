import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldValues, type UseFormProps, type UseFormReturn } from 'react-hook-form';
import type { ZodType } from 'zod';

export function useZodForm<T extends FieldValues>(
  schema: ZodType<T>,
  options?: Omit<UseFormProps<T>, 'resolver'>,
): UseFormReturn<T> {
  return useForm<T>({
    ...options,
    resolver: zodResolver(schema),
  });
}
