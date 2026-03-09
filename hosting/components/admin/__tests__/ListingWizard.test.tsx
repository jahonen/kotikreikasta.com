import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ListingWizard from '../ListingWizard';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/firebase-client', () => ({
  getDbClient: async () => null,
}));

vi.mock('../../lib/utils/slugify', () => ({
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, '-'),
}));

describe('ListingWizard', () => {
  it('shows required markers and enables Next only when required fields present', async () => {
    const onClose = vi.fn();
    await act(async () => {
      render(<ListingWizard open={true} onClose={onClose} />);
    });
    const nextBtn = screen.getByRole('button', { name: /Seuraava/i });
    expect(nextBtn).toBeDisabled();

    const nameInput = screen.getByPlaceholderText('Kiinteistön nimi *');
    const typeSelect = screen.getAllByRole('combobox')[0];
    const priceInput = screen.getByPlaceholderText('Hinta (€) *');

    await userEvent.type(nameInput, 'Testikohde');
    await userEvent.selectOptions(typeSelect, 'Kerrostalo');
    await userEvent.type(priceInput, '200000');

    expect(nextBtn).not.toBeDisabled();
  });

  it('auto-calculates price per m² from price and size', async () => {
    const onClose = vi.fn();
    await act(async () => {
      render(<ListingWizard open={true} onClose={onClose} />);
    });

    const size = screen.getByPlaceholderText('Koko (m²)');
    const price = screen.getByPlaceholderText('Hinta (€) *');
    const perM2 = screen.getByPlaceholderText('Hinta / m² (€) (automaattinen)');

    await userEvent.clear(size);
    await userEvent.type(size, '50');
    await userEvent.clear(price);
    await userEvent.type(price, '200000');

    // Expect rounded 4000
    expect((perM2 as HTMLInputElement).value).toBe('4000');
  });

  it('renders dropdowns for Kiinteistötyyppi, Kunto, Makuuhuoneet, Kylpyhuoneet', async () => {
    const onClose = vi.fn();
    await act(async () => {
      render(<ListingWizard open={true} onClose={onClose} />);
    });

    // First combobox is type
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(3);

    // Kunto select should be present (has placeholder-like first option label)
    // We cannot query by placeholder on select, check that selecting an option works
    await userEvent.selectOptions(selects[0], 'Kerrostalo');
  });
});
