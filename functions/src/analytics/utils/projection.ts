/**
 * 30-Day Projection Calculations
 * Uses linear regression to forecast future metrics
 */

interface DataPoint {
  date: string;
  value: number;
}

/**
 * Calculate linear regression for time series data
 */
function linearRegression(data: DataPoint[]): { slope: number; intercept: number } {
  const n = data.length;
  
  if (n === 0) {
    return { slope: 0, intercept: 0 };
  }
  
  // Convert dates to day indices (0, 1, 2, ...)
  const points = data.map((d, i) => ({ x: i, y: d.value }));
  
  // Calculate means
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / n;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / n;
  
  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;
  
  for (const point of points) {
    numerator += (point.x - meanX) * (point.y - meanY);
    denominator += (point.x - meanX) ** 2;
  }
  
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;
  
  return { slope, intercept };
}

/**
 * Add days to a date string (YYYY-MM-DD)
 */
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Generate 30-day projection based on historical data
 */
export function generateProjection(
  historicalData: DataPoint[],
  projectionDays: number = 30
): DataPoint[] {
  if (historicalData.length < 2) {
    return []; // Need at least 2 data points
  }
  
  const { slope, intercept } = linearRegression(historicalData);
  const lastDate = historicalData[historicalData.length - 1].date;
  const startIndex = historicalData.length;
  
  const projections: DataPoint[] = [];
  
  for (let i = 1; i <= projectionDays; i++) {
    const projectedValue = Math.max(0, slope * (startIndex + i - 1) + intercept);
    const projectedDate = addDays(lastDate, i);
    
    projections.push({
      date: projectedDate,
      value: Math.round(projectedValue),
    });
  }
  
  return projections;
}

/**
 * Calculate growth rate from historical data
 */
export function calculateGrowthRate(data: DataPoint[]): number {
  if (data.length < 2) {
    return 0;
  }
  
  const { slope } = linearRegression(data);
  const avgValue = data.reduce((sum, d) => sum + d.value, 0) / data.length;
  
  if (avgValue === 0) {
    return 0;
  }
  
  // Return daily growth rate as percentage
  return (slope / avgValue) * 100;
}

/**
 * Calculate percentage change vs previous period
 */
export function calculateVsPrevious(
  currentPeriod: DataPoint[],
  previousPeriod: DataPoint[]
): number {
  const currentSum = currentPeriod.reduce((sum, d) => sum + d.value, 0);
  const previousSum = previousPeriod.reduce((sum, d) => sum + d.value, 0);
  
  if (previousSum === 0) {
    return currentSum > 0 ? 100 : 0;
  }
  
  return ((currentSum - previousSum) / previousSum) * 100;
}
