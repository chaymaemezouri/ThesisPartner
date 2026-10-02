import type { Messages } from './messages/en';

type Primitive = string;
type NestedKey<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends Primitive
    ? `${Prefix}${K}`
    : NestedKey<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = NestedKey<Messages>;

export function getMessage(messages: Messages, key: MessageKey): string {
  const parts = key.split('.');
  let current: unknown = messages;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null || !(part in current)) {
      return key;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : key;
}

export function formatMessage(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}
