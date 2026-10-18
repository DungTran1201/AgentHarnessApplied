import {
  BotEntity,
  CreateBotData,
  UpdateBotData,
  TestBotConnectionResponse,
  ManagedBotItem,
  BotProjectBinding,
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ai_chan_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

export class BotService {
  /**
   * Retrieves all registered Discord bots for the authenticated user.
   */
  static async getBots(): Promise<BotEntity[]> {
    const res = await fetch(`${BASE_URL}/bots`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to fetch Discord bots.');
    }

    return res.json();
  }

  /**
   * Retrieves a single Discord bot by ID.
   */
  static async getBot(id: string): Promise<BotEntity> {
    const res = await fetch(`${BASE_URL}/bots/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Bot not found.');
    }

    return res.json();
  }

  /**
   * Registers a new Discord Bot with encrypted credentials.
   */
  static async createBot(data: CreateBotData): Promise<BotEntity> {
    const res = await fetch(`${BASE_URL}/bots`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to register Discord bot.');
    }

    return res.json();
  }

  /**
   * Updates bot configuration (metadata or token replacement).
   */
  static async updateBot(id: string, data: UpdateBotData): Promise<BotEntity> {
    const res = await fetch(`${BASE_URL}/bots/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to update bot configuration.');
    }

    return res.json();
  }

  /**
   * Deletes a bot configuration and terminates any active runtime.
   */
  static async deleteBot(id: string): Promise<{ success: boolean; message: string; bot_id: string }> {
    const res = await fetch(`${BASE_URL}/bots/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to delete bot.');
    }

    return res.json();
  }

  /**
   * Tests bot token against Discord REST API (/users/@me) without creating a WebSocket client.
   */
  static async testConnection(id: string): Promise<TestBotConnectionResponse> {
    const res = await fetch(`${BASE_URL}/bots/${id}/test-connection`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to test bot connection.');
    }

    return res.json();
  }

  /**
   * Starts an isolated Discord Gateway connection for this bot.
   */
  static async connectBot(id: string): Promise<{ success: boolean; status: string; message: string }> {
    const res = await fetch(`${BASE_URL}/bots/${id}/connect`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to connect bot.');
    }

    return res.json();
  }

  /**
   * Stops the Discord Gateway connection for this bot.
   */
  static async disconnectBot(id: string): Promise<{ success: boolean; status: string; message: string }> {
    const res = await fetch(`${BASE_URL}/bots/${id}/disconnect`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to disconnect bot.');
    }

    return res.json();
  }

  /**
   * Restarts the Discord Gateway connection for this bot.
   */
  static async reconnectBot(id: string): Promise<{ success: boolean; status: string; message: string }> {
    const res = await fetch(`${BASE_URL}/bots/${id}/reconnect`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to reconnect bot.');
    }

    return res.json();
  }

  /**
   * Links or unlinks a bot to an AI-Chan Project (1:1 constraint).
   */
  static async linkProject(botId: string, projectId: string | null): Promise<BotEntity> {
    const res = await fetch(`${BASE_URL}/bots/${botId}/project`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ project_id: projectId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to link bot to project.');
    }

    return res.json();
  }

  /**
   * Backward-compatibility: Fetch managed bots for legacy views.
   */
  static async getManagedBots(): Promise<ManagedBotItem[]> {
    const res = await fetch(`${BASE_URL}/bot/discord/bots`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      return [];
    }

    return res.json();
  }

  /**
   * Backward-compatibility: Fetch current binding.
   */
  static async getBotProjectBinding(): Promise<BotProjectBinding | null> {
    const res = await fetch(`${BASE_URL}/bot/discord/binding`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  }
}
