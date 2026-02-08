import { useMemo } from "react";

export interface FlowApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface FlowResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

/**
 * Hook for calling Power Automate flows
 * @returns Object with callFlow method
 */
export function useFlowApi() {
  const callFlow = async <T = any>(
    options: FlowApiOptions
  ): Promise<FlowResponse<T>> => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      };

      const controller = new AbortController();
      const timeoutId = options.timeout
        ? setTimeout(() => controller.abort(), options.timeout)
        : null;

      const response = await fetch(options.url, {
        method: options.method || "POST",
        headers,
        body: options.data ? JSON.stringify(options.data) : undefined,
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Parse response
      let responseData: T | undefined;
      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
        console
      } else {
        const text = await response.text();
        responseData = text as unknown as T;
      }

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP Error: ${response.status} ${response.statusText}`,
          status: response.status,
          data: responseData,
        };
      }

      return {
        success: true,
        data: responseData,
        status: response.status,
      };
    } catch (error) {
      console.error("Flow API Error:", error);
      
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            success: false,
            error: "Request timeout",
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: "Unknown error occurred",
      };
    }
  };

  /**
   * Call a Power Automate flow with HTTP request trigger
   * @param flowUrl - The full URL of the Power Automate flow
   * @param payload - Data to send to the flow
   * @param timeout - Optional timeout in milliseconds
   */
  const triggerFlow = async <TRequest = any, TResponse = any>(
    flowUrl: string,
    payload: TRequest,
    timeout: number = 30000
  ): Promise<FlowResponse<TResponse>> => {
    return callFlow<TResponse>({
      method: "POST",
      url: flowUrl,
      data: payload,
      timeout,
    });
  };

  /**
   * Call a flow and wait for response with polling
   * Useful for long-running flows
   */
  const triggerFlowWithPolling = async <TRequest = any, TResponse = any>(
    flowUrl: string,
    payload: TRequest,
    options?: {
      pollingInterval?: number;
      maxAttempts?: number;
      statusUrl?: string;
    }
  ): Promise<FlowResponse<TResponse>> => {
    const pollingInterval = options?.pollingInterval || 2000;
    const maxAttempts = options?.maxAttempts || 30;
    
    // Trigger the flow
    const initialResponse = await triggerFlow<TRequest, any>(flowUrl, payload);
    
    if (!initialResponse.success) {
      return initialResponse;
    }

    // If status URL is provided, poll for completion
    if (options?.statusUrl) {
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
        
        const statusResponse = await callFlow<TResponse>({
          method: "GET",
          url: options.statusUrl,
        });

        if (statusResponse.success && statusResponse.data) {
          return statusResponse;
        }

        attempts++;
      }

      return {
        success: false,
        error: "Polling timeout - max attempts reached",
      };
    }

    return initialResponse as FlowResponse<TResponse>;
  };

  return useMemo(
    () => ({
      callFlow,
      triggerFlow,
      triggerFlowWithPolling,
    }),
    []
  );
}

// Example usage types
export interface FlowEmailPayload {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  attachments?: Array<{
    name: string;
    contentBytes: string;
  }>;
}

export interface FlowNotificationPayload {
  title: string;
  message: string;
  userId: string;
  type?: "info" | "warning" | "error" | "success";
}

export interface FlowApprovalPayload {
  title: string;
  details: string;
  approvers: string[];
  requestorId: string;
  itemId: string;
}
