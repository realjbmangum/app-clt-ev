import type { Env } from '../types';

export class ChargePointClient {
  private apiUrl: string;
  private apiKey: string;
  private r2: R2Bucket;

  constructor(env: Env) {
    this.apiUrl = env.CHARGEPOINT_API_URL;
    this.apiKey = env.CHARGEPOINT_API_KEY;
    this.r2 = env.R2;
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.apiUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ChargePoint API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as T;

    // Archive raw response to R2
    const dateKey = new Date().toISOString().split('T')[0];
    const timeKey = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `chargepoint/${dateKey}/${endpoint.replace(/\//g, '_')}_${timeKey}.json`;
    await this.r2.put(key, JSON.stringify(data), {
      httpMetadata: { contentType: 'application/json' },
    });

    return data;
  }

  async getStationStatus(stationIds?: string[]): Promise<any[]> {
    const params: Record<string, string> = {};
    if (stationIds?.length) {
      params.stationIDs = stationIds.join(',');
    }
    const result = await this.request<{ stations: any[] }>('/stations/status', params);
    return result.stations || [];
  }

  async getChargingSessions(params?: {
    startTime?: string;
    endTime?: string;
    stationId?: string;
  }): Promise<any[]> {
    const queryParams: Record<string, string> = {};
    if (params?.startTime) queryParams.startTime = params.startTime;
    if (params?.endTime) queryParams.endTime = params.endTime;
    if (params?.stationId) queryParams.stationId = params.stationId;

    const result = await this.request<{ sessions: any[] }>('/sessions', queryParams);
    return result.sessions || [];
  }

  async getStationDetails(stationId: string): Promise<any> {
    return this.request(`/stations/${stationId}`);
  }
}
