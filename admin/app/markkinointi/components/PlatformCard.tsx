/**
 * Platform Card Component
 * Displays detailed metrics for a single platform
 */

import { PlatformMetrics } from '../lib/analytics-client';

interface PlatformCardProps {
  platform: 'x' | 'bluesky' | 'instagram' | 'facebook' | 'threads';
  metrics: PlatformMetrics;
}

const PLATFORM_CONFIG = {
  x: { name: 'X', color: '#000000' },
  bluesky: { name: 'Bluesky', color: '#0085ff' },
  instagram: { name: 'Instagram', color: '#E4405F' },
  facebook: { name: 'Facebook', color: '#1877F2' },
  threads: { name: 'Threads', color: '#8B5CF6' },
};

export default function PlatformCard({ platform, metrics }: PlatformCardProps) {
  const config = PLATFORM_CONFIG[platform];
  
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 20,
      minWidth: 180,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
      }}>
        <div style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: config.color,
        }} />
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#111827',
        }}>
          {config.name}
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <MetricRow label="Impressions" value={metrics.impressions.toLocaleString('fi-FI')} />
        <MetricRow label="Reach" value={metrics.reach.toLocaleString('fi-FI')} />
        <MetricRow label="Engagements" value={metrics.engagements.toLocaleString('fi-FI')} />
        <MetricRow label="Eng. rate" value={`${metrics.engagement_rate.toFixed(1)}%`} />
        <MetricRow label="Net followers" value={metrics.follower_change >= 0 ? `+${metrics.follower_change}` : metrics.follower_change.toString()} />
        <MetricRow label="Shares/reposts" value={metrics.shares.toLocaleString('fi-FI')} />
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: 13, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{value}</div>
    </div>
  );
}
