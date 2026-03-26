import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30';
    const refresh = searchParams.get('refresh') || 'false';
    
    // Call the Cloud Function
    // Note: This endpoint is protected by the admin dashboard authentication
    // The Cloud Function itself needs to be publicly accessible
    const functionUrl = `https://europe-west1-kotikreikasta.cloudfunctions.net/analyticsAggregator?period=${period}&refresh=${refresh}`;
    
    const response = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Analytics function error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
