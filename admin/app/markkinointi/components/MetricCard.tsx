/**
 * Metric Card Component
 * Displays a single KPI with comparison to previous period
 */

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  isPercentage?: boolean;
}

export default function MetricCard({ title, value, change, changeLabel, isPercentage }: MetricCardProps) {
  const formattedValue = typeof value === 'number' 
    ? value.toLocaleString('fi-FI')
    : value;
  
  const changeColor = change && change > 0 ? '#10b981' : change && change < 0 ? '#ef4444' : '#6b7280';
  const changePrefix = change && change > 0 ? '+' : '';
  
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 24,
      minWidth: 200,
    }}>
      <div style={{
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
        textTransform: 'uppercase',
        fontWeight: 600,
        letterSpacing: '0.05em',
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 32,
        fontWeight: 700,
        color: '#111827',
        marginBottom: 8,
      }}>
        {formattedValue}
      </div>
      {change !== undefined && (
        <div style={{
          fontSize: 14,
          color: changeColor,
          fontWeight: 600,
        }}>
          {changePrefix}{change.toFixed(1)}{isPercentage ? 'pp' : '%'} {changeLabel || 'vs edellinen'}
        </div>
      )}
    </div>
  );
}
