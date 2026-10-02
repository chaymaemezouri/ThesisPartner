/**
 * The object is written first. If the database insert fails, the object is removed.
 * A failed cleanup is reported and the original error is still raised.
 */
export async function commitAfterUpload(input: {
  put: () => Promise<void>;
  insert: () => Promise<void>;
  remove: () => Promise<void>;
  onRemoveFailed?: (error: unknown) => void;
}): Promise<void> {
  await input.put();
  try {
    await input.insert();
  } catch (error) {
    try {
      await input.remove();
    } catch (cleanup) {
      input.onRemoveFailed?.(cleanup);
    }
    throw error;
  }
}
