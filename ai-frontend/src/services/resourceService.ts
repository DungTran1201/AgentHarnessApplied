import { ResourceSummary, UserQuotaStatus, ApiMetricLogItem, SSEMetricEvent } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

export class ResourceService {
  /**
   * Fetch aggregated KPI metrics for performance and token quota (OP-018)
   */
  static async getSummary(range: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<ResourceSummary> {
    const res = await fetch(`${BASE_URL}/resources/summary?range=${range}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to fetch resource summary statistics.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch detailed token quota status for current user (OP-020)
   */
  static async getQuota(): Promise<UserQuotaStatus> {
    const res = await fetch(`${BASE_URL}/resources/quota`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to fetch token quota information.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch recent telemetry log history (OP-021)
   */
  static async getHistory(limit: number = 50, offset: number = 0): Promise<ApiMetricLogItem[]> {
    const res = await fetch(`${BASE_URL}/resources/history?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to fetch API telemetry history.');
    }

    const json = await res.json();
    return json.data.items || [];
  }

  /**
   * Initialize SSE EventSource stream for real-time telemetry (OP-019)
   */
  static subscribeStream(
    callbacks: {
      onInitialState?: (data: ResourceSummary) => void;
      onMetricUpdate?: (data: SSEMetricEvent) => void;
      onQuotaAlert?: (data: any) => void;
      onError?: (err: any) => void;
      onOpen?: () => void;
    }
  ): () => void {
    const sseUrl = `${BASE_URL}/resources/stream`;
    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onopen = () => {
      if (callbacks.onOpen) callbacks.onOpen();
    };

    eventSource.addEventListener('initial_state', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (callbacks.onInitialState) callbacks.onInitialState(data);
      } catch (err) {
        console.error('Error parsing SSE initial_state:', err);
      }
    });

    eventSource.addEventListener('metric_update', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (callbacks.onMetricUpdate) callbacks.onMetricUpdate(data);
      } catch (err) {
        console.error('Error parsing SSE metric_update:', err);
      }
    });

    eventSource.addEventListener('quota_alert', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (callbacks.onQuotaAlert) callbacks.onQuotaAlert(data);
      } catch (err) {
        console.error('Error parsing SSE quota_alert:', err);
      }
    });

    eventSource.onerror = (err) => {
      if (callbacks.onError) callbacks.onError(err);
    };

    // Cleanup function to close SSE connection
    return () => {
      eventSource.close();
    };
  }
}
