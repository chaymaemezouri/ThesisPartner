import { Button, Input } from '@thesispartner/ui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { useZodForm } from './use-zod-form';

const schema = z.object({
  note: z.string().min(2, 'Trop court').max(40),
});

function NoteForm({ onSubmit }: { onSubmit: (value: { note: string }) => void }) {
  const form = useZodForm(schema);
  const error = form.formState.errors.note?.message;

  return (
    <form onSubmit={form.handleSubmit((values) => onSubmit(values))} noValidate>
      <Input id="note" label="Note" error={error} {...form.register('note')} />
      <Button type="submit">Enregistrer</Button>
    </form>
  );
}

describe('useZodForm', () => {
  it('shows a validation error then submits a valid value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Trop court');

    await user.type(screen.getByLabelText('Note'), 'Ok');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit).toHaveBeenCalledWith({ note: 'Ok' });
  });
});
