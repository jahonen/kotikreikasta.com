import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PointsOfInterestPicker from '../components/admin/PointsOfInterestPicker';

describe('PointsOfInterestPicker', () => {
  const samplePlaces = {
    places: [
      {
        id: 'place-1',
        displayName: { text: 'Taverna Dimitris' },
        primaryType: 'restaurant',
        types: ['restaurant', 'food'] ,
        location: { latitude: 37.1, longitude: 23.9 },
      },
      {
        id: 'place-2',
        displayName: { text: 'Apteekki' },
        primaryType: 'pharmacy',
        types: ['pharmacy'],
        location: { latitude: 37.1005, longitude: 23.9005 },
      },
    ],
  };

  let origFetch: any;

  beforeEach(() => {
    // Wrap the global fetch mock from test/setup.ts to handle the POI endpoint
    origFetch = (global as any).fetch;
    const wrapper = vi.fn(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : (input?.url || '');
      if (url.includes('/api/places/nearby')) {
        return new Response(JSON.stringify(samplePlaces), { status: 200 }) as any;
      }
      return origFetch(input, init);
    });
    (global as any).fetch = wrapper as any;
  });

  it('fetches and renders nearby places with Finnish labels', async () => {
    render(<PointsOfInterestPicker center={{ lat: 37.0, lng: 24.0 }} />);
    // Loading state
    expect(screen.getByText(/Ladataan lähellä olevia kohteita/i)).toBeInTheDocument();

    // First place name should appear
    await screen.findByText('Taverna Dimitris');
    // Type label should render in Finnish for restaurant
    expect(screen.getByText(/Ravintola/i)).toBeInTheDocument();
    // Second place appears too
    expect(screen.getByText('Apteekki')).toBeInTheDocument();
  });

  it('dedupes requests when center object identity changes but coordinates are the same', async () => {
    const rf = (global as any).fetch as any;
    const { rerender } = render(<PointsOfInterestPicker center={{ lat: 37.0, lng: 24.0 }} />);
    await screen.findByText('Taverna Dimitris');

    // Rerender the same instance with a new object containing the same numbers
    rerender(<PointsOfInterestPicker center={{ lat: 37.0, lng: 24.0 }} />);
    await waitFor(() => {
      // Only one POI request should have been made
      const calls = rf.mock.calls.filter((c: any[]) => String(c[0]).includes('/api/places/nearby')).length;
      expect(calls).toBe(1);
    });
  });
});
