"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { fetchAnalytics, AnalyticsData } from "./lib/analytics-client";
import MetricCard from "./components/MetricCard";
import ImpressionsChart from "./components/ImpressionsChart";
import EngagementRateChart from "./components/EngagementRateChart";
import PlatformCard from "./components/PlatformCard";

type Period = 7 | 30 | 90;

export default function MarketingDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(30);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Get Firebase Auth ID token
      const auth = getAuth();
      const user = auth.currentUser;
      const idToken = user ? await user.getIdToken() : undefined;
      
      const result = await fetchAnalytics(period, forceRefresh, idToken);
      setData(result);
    } catch (e: any) {
      setError(e?.message || 'Analytiikan lataus epäonnistui');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const handleRefresh = () => {
    loadAnalytics(true);
  };

  if (loading && !data) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Markkinointi-analytiikka</h1>
        <p>Ladataan analytiikkaa...</p>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Markkinointi-analytiikka</h1>
        <p style={{ color: '#b00020' }}>Virhe: {error}</p>
        <button onClick={() => loadAnalytics()} style={{
          padding: '8px 16px',
          background: '#0B3D6B',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}>
          Yritä uudelleen
        </button>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, background: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Markkinointi-analytiikka</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            padding: '8px 16px',
            background: refreshing ? '#9ca3af' : '#0B3D6B',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: refreshing ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {refreshing ? 'Päivitetään...' : 'Päivitä data'}
        </button>
      </div>

      {/* Period Selector */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 8 }}>
        {[7, 30, 90].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p as Period)}
            style={{
              padding: '8px 16px',
              background: period === p ? '#0B3D6B' : '#fff',
              color: period === p ? '#fff' : '#111827',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {p}d
          </button>
        ))}
      </div>

      {data && (
        <>
          {/* Top Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            <MetricCard
              title="Näyttökerrat yhteensä"
              value={data.totals.impressions.toLocaleString('fi-FI')}
              change={18.4}
              changeLabel="vs edellinen"
            />
            <MetricCard
              title="Sitoutumiset yhteensä"
              value={data.totals.engagements.toLocaleString('fi-FI')}
              change={11.2}
              changeLabel="vs edellinen"
            />
            <MetricCard
              title="Keskimääräinen sitoutumisaste"
              value={`${data.totals.avg_engagement_rate.toFixed(1)}%`}
              change={-0.4}
              changeLabel="vs edellinen"
              isPercentage={true}
            />
            <MetricCard
              title="Seuraajien muutos"
              value={data.totals.net_followers >= 0 ? `+${data.totals.net_followers.toLocaleString('fi-FI')}` : data.totals.net_followers.toLocaleString('fi-FI')}
              change={22.1}
              changeLabel="vs edellinen"
            />
          </div>

          {/* Charts */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            <ImpressionsChart
              timeline={data.timeline}
              projections={data.projections?.impressions}
            />
            <EngagementRateChart platforms={data.platforms} />
          </div>

          {/* Platform Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
          }}>
            <PlatformCard platform="x" metrics={data.platforms.x} />
            <PlatformCard platform="bluesky" metrics={data.platforms.bluesky} />
            <PlatformCard platform="instagram" metrics={data.platforms.instagram} />
            <PlatformCard platform="facebook" metrics={data.platforms.facebook} />
            <PlatformCard platform="threads" metrics={data.platforms.threads} />
          </div>
        </>
      )}
    </main>
  );
}
