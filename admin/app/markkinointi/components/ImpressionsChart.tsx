"use client";

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { TimelineDay } from '../lib/analytics-client';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ImpressionsChartProps {
  timeline: TimelineDay[];
  projections?: Array<{ date: string; value: number }>;
}

// Platform brand colors with opacity for stacked areas
const PLATFORM_COLORS = {
  instagram: {
    border: '#E4405F',
    background: 'rgba(228, 64, 95, 0.7)',
  },
  facebook: {
    border: '#1877F2',
    background: 'rgba(24, 119, 242, 0.7)',
  },
  threads: {
    border: '#000000',
    background: 'rgba(0, 0, 0, 0.7)',
  },
  x: {
    border: '#000000',
    background: 'rgba(0, 0, 0, 0.5)',
  },
  bluesky: {
    border: '#0085ff',
    background: 'rgba(0, 133, 255, 0.7)',
  },
};

export default function ImpressionsChart({ timeline, projections }: ImpressionsChartProps) {
  const labels = timeline.map(t => {
    const date = new Date(t.date);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });
  
  // Add projection labels
  const projectionLabels = projections?.map(p => {
    const date = new Date(p.date);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  }) || [];
  
  const allLabels = [...labels, ...projectionLabels];
  
  const data = {
    labels: allLabels,
    datasets: [
      {
        label: 'Instagram',
        data: timeline.map(t => t.instagram.impressions),
        borderColor: PLATFORM_COLORS.instagram.border,
        backgroundColor: PLATFORM_COLORS.instagram.background,
        fill: true,
        tension: 0.3,
        borderWidth: 0,
      },
      {
        label: 'Facebook',
        data: timeline.map(t => t.facebook.impressions),
        borderColor: PLATFORM_COLORS.facebook.border,
        backgroundColor: PLATFORM_COLORS.facebook.background,
        fill: true,
        tension: 0.3,
        borderWidth: 0,
      },
      {
        label: 'Threads',
        data: timeline.map(t => t.threads.impressions),
        borderColor: PLATFORM_COLORS.threads.border,
        backgroundColor: PLATFORM_COLORS.threads.background,
        fill: true,
        tension: 0.3,
        borderWidth: 0,
      },
      {
        label: 'X',
        data: timeline.map(t => t.x.impressions),
        borderColor: PLATFORM_COLORS.x.border,
        backgroundColor: PLATFORM_COLORS.x.background,
        fill: true,
        tension: 0.3,
        borderWidth: 0,
      },
      {
        label: 'Bluesky',
        data: timeline.map(t => t.bluesky.impressions),
        borderColor: PLATFORM_COLORS.bluesky.border,
        backgroundColor: PLATFORM_COLORS.bluesky.background,
        fill: true,
        tension: 0.3,
        borderWidth: 0,
      },
      // Projection line
      ...(projections ? [{
        label: 'Ennuste',
        data: [...Array(timeline.length).fill(null), ...projections.map(p => p.value)],
        borderColor: '#9ca3af',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      }] : []),
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            family: 'system-ui, -apple-system, sans-serif',
          },
        },
      },
      title: {
        display: true,
        text: 'Impressions ajan kuluessa',
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
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toLocaleString('fi-FI');
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            if (value >= 1000) {
              return (value / 1000).toFixed(0) + 'K';
            }
            return value;
          },
        },
      },
    },
  };
  
  return (
    <div style={{ height: 400, padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
      <Line data={data} options={options} />
    </div>
  );
}
