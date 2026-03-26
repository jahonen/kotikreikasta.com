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

const PLATFORM_COLORS = {
  x: '#000000',
  bluesky: '#0085ff',
  instagram: '#E4405F',
  facebook: '#1877F2',
  threads: '#000000',
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
        label: 'X',
        data: timeline.map(t => t.x.impressions),
        borderColor: PLATFORM_COLORS.x,
        backgroundColor: PLATFORM_COLORS.x + '20',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Instagram',
        data: timeline.map(t => t.instagram.impressions),
        borderColor: PLATFORM_COLORS.instagram,
        backgroundColor: PLATFORM_COLORS.instagram + '20',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Facebook',
        data: timeline.map(t => t.facebook.impressions),
        borderColor: PLATFORM_COLORS.facebook,
        backgroundColor: PLATFORM_COLORS.facebook + '20',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Threads',
        data: timeline.map(t => t.threads.impressions),
        borderColor: PLATFORM_COLORS.threads,
        backgroundColor: PLATFORM_COLORS.threads + '10',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Bluesky',
        data: timeline.map(t => t.bluesky.impressions),
        borderColor: PLATFORM_COLORS.bluesky,
        backgroundColor: PLATFORM_COLORS.bluesky + '20',
        fill: true,
        tension: 0.4,
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
      }] : []),
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
        grid: {
          display: false,
        },
      },
      y: {
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
