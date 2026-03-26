"use client";

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { PlatformMetrics } from '../lib/analytics-client';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface EngagementRateChartProps {
  platforms: {
    instagram: PlatformMetrics;
    facebook: PlatformMetrics;
    threads: PlatformMetrics;
    x: PlatformMetrics;
    bluesky: PlatformMetrics;
  };
}

const PLATFORM_COLORS = {
  x: '#000000',
  bluesky: '#0085ff',
  instagram: '#E4405F',
  facebook: '#1877F2',
  threads: '#8B5CF6',
};

export default function EngagementRateChart({ platforms }: EngagementRateChartProps) {
  const data = {
    labels: ['X', 'Bluesky', 'Instagram', 'Facebook', 'Threads'],
    datasets: [
      {
        label: 'Eng. rate',
        data: [
          platforms.x.engagement_rate,
          platforms.bluesky.engagement_rate,
          platforms.instagram.engagement_rate,
          platforms.facebook.engagement_rate,
          platforms.threads.engagement_rate,
        ],
        backgroundColor: [
          PLATFORM_COLORS.x,
          PLATFORM_COLORS.bluesky,
          PLATFORM_COLORS.instagram,
          PLATFORM_COLORS.facebook,
          PLATFORM_COLORS.threads,
        ],
        borderRadius: 6,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Engagement rate alustittain',
        font: {
          size: 16,
          weight: 'bold' as const,
          family: 'system-ui, -apple-system, sans-serif',
        },
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.parsed.x.toFixed(2)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 5,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          },
        },
      },
    },
  };

  return (
    <div style={{ height: 400, padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
      <Bar data={data} options={options} />
    </div>
  );
}
