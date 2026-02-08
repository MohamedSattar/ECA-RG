/*export const useDataverseApi = () => {
  const callApi = <T = any>(options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    url: string;
    data?: any;
  }): Promise<T> => {
    return new Promise((resolve, reject) => {
      if(!window.safeAjax) {
        console.error("safeAjax is not defined on window");
        return reject("safeAjax is not available on window");
      }
      window.safeAjax({
        type: options.method || "GET",
        url: options.url,
        contentType: "application/json",
        data: options.data ? JSON.stringify(options.data) : null,       
        success: (res: T) => resolve(res),
        error: (xhr, status, error) => reject(error)
      });
    });
  };

  return { callApi };
};*/

import { stat } from "fs";

export interface ApiOptions extends RequestInit {
  headers?: Record<string, string>;
}
// const fetchRequestVerificationToken = async () => {
//   const response = await fetch("/_layout/tokenhtml");
//   const text = await response.text();

//   // Parse the response text to extract the token from the input element
//   const doc = new DOMParser().parseFromString(text, "text/xml");
//   const input = doc.querySelector("input");
//   console.log(text);
//   const token = input.getAttribute("value");
//   return token;
// };;
const fetchRequestVerificationToken = async () => {
  try {
    console.log("[Token] Fetching verification token...");
    const response = await fetch(`/_layout/tokenhtml`, {
      credentials: "include",
    });

    console.log(`[Token] Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch verification token: ${response.status} ${response.statusText}`,
      );
    }

    const text = await response.text();
    const doc = new DOMParser().parseFromString(text, "text/html");

    const input = doc.querySelector<HTMLInputElement>(
      'input[name="__RequestVerificationToken"]',
    );

    if (!input?.value) {
      console.warn(
        "[Token] RequestVerificationToken not found in HTML response",
      );
      throw new Error("RequestVerificationToken not found");
    }

    console.log("[Token] Successfully fetched verification token");
    return input.value;
  } catch (err) {
    console.error("[Token] Error fetching verification token:", err);
    throw err;
  }
};

export function useDataverseApi() {
  let cachedToken: string | null = null;

  const getToken = async () => {
    try {
      if (cachedToken) {
        console.log("[Token] Using cached token");
        return cachedToken;
      }
      cachedToken = await fetchRequestVerificationToken();
      return cachedToken;
    } catch (err) {
      console.error("[Token] Failed to get token:", err);
      cachedToken = null;
      return null;
    }
  };

  const callApi = async <T = any>(options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    url: string;
    data?: any;
    headers?: Record<string, string>;
    skipAuth?: boolean;
  }): Promise<T> => {
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(options.data ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      };

      // Add authentication only if not skipped (for public APIs)
      if (!options.skipAuth) {
        const token = await getToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
          headers.__RequestVerificationToken = token;
        } else {
          console.warn("[API] No authentication token available");
        }
      }

      // Call through backend proxy (/_api/* routes to Dataverse API)
      console.log(`[API] ${options.method || "GET"} ${options.url}`);

      const res = await fetch(options.url, {
        credentials: "include",
        method: options.method || "GET",
        body: options.data ? JSON.stringify(options.data) : null,
        headers,
      });

      console.log(`[API] Response: ${res.status} ${res.statusText}`);

      // Detect redirects (usually not authenticated)
      if (res.redirected) {
        console.error("Redirect detected—user is not authenticated.");
        window.location.href = res.url;
        throw new Error("Not authenticated");
      }

      const text = await res.text();
      try {
        const returnvalue = text ? (JSON.parse(text) as T) : ({} as T);
        (returnvalue as any).status = res.status;
        (returnvalue as any).headers = res.headers;
        return returnvalue;
      } catch (parseErr) {
        // Non-JSON response — return raw text
        console.warn(
          `[API] Non-JSON response from ${options.url}:`,
          text?.substring(0, 200),
        );
        return text as unknown as T;
      }
    } catch (err) {
      console.error(`[API] Error calling ${options.url}:`, err);
      throw err;
    }
  };
  return { callApi };
}
