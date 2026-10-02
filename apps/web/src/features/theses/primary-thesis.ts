export function primaryThesis<T extends { status: string; role: string }>(theses: T[]): T | null {
  const own = theses.filter((thesis) => thesis.role === 'DOCTORAL_STUDENT');
  const pool = own.length > 0 ? own : theses;
  return pool.find((thesis) => thesis.status === 'ACTIVE') ?? pool[0] ?? null;
}
