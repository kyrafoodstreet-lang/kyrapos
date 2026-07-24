/**
 * Resilient Print Agent Client Library
 * Handles HTTPS (Vercel) -> HTTP (localhost:4000) requests with
 * AbortController timeouts, PNA headers, and zero unhandled rejections.
 */

const AGENT_BASE_URL = 'http://localhost:4000';
const DEFAULT_TIMEOUT_MS = 2000;

export interface PrintAgentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  isOffline?: boolean;
}

export class PrintAgentClient {
  /**
   * Safe fetch with AbortController timeout and PNA headers
   */
  private static async request<T = any>(
    path: string,
    options: RequestInit = {},
    timeoutMs = DEFAULT_TIMEOUT_MS
  ): Promise<PrintAgentResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Access-Control-Request-Private-Network': 'true',
      ...(options.headers as Record<string, string> || {}),
    };

    try {
      const response = await fetch(`${AGENT_BASE_URL}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        return {
          success: false,
          error: `Request timed out after ${timeoutMs}ms`,
          isOffline: true,
        };
      }

      return {
        success: false,
        error: err.message || 'Failed to connect to local print agent',
        isOffline: true,
      };
    }
  }

  /**
   * Health Check
   */
  public static async getHealth(): Promise<PrintAgentResponse> {
    return this.request('/health', { method: 'GET' }, 1200);
  }

  /**
   * Version Check
   */
  public static async getVersion(): Promise<PrintAgentResponse> {
    return this.request('/version', { method: 'GET' }, 1200);
  }

  /**
   * Print Customer Receipt
   */
  public static async printCustomerReceipt(payload: any): Promise<PrintAgentResponse> {
    return this.request('/print/customer', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, 2500);
  }

  /**
   * Print Kitchen Ticket (KOT)
   */
  public static async printKot(payload: any): Promise<PrintAgentResponse> {
    return this.request('/print/kot', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, 2500);
  }

  /**
   * Print Shift / Sales Report
   */
  public static async printReport(payload: any): Promise<PrintAgentResponse> {
    return this.request('/print/report', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, 2500);
  }
}
