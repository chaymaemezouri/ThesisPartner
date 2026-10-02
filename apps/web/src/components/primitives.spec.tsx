import { Badge, EmptyState, Input, Select, Textarea } from '@thesispartner/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('design primitives', () => {
  it('associates labels with fields and renders empty and badge states', () => {
    render(
      <div>
        <Input id="given-name" label="Prénom" hint="Tel qu’il apparaît sur la thèse" />
        <Textarea id="summary" label="Résumé" />
        <Select id="role" label="Rôle">
          <option value="DOCTORAL_STUDENT">Doctorant</option>
        </Select>
        <Badge tone="neutral">Phase 0</Badge>
        <EmptyState title="Vide" description="Aucun élément." />
      </div>,
    );

    expect(screen.getByLabelText('Prénom')).toBeInTheDocument();
    expect(screen.getByLabelText('Résumé')).toBeInTheDocument();
    expect(screen.getByLabelText('Rôle')).toBeInTheDocument();
    expect(screen.getByText('Phase 0')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Vide' })).toBeInTheDocument();
  });
});
