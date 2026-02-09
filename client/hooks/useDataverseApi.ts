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
import { useMsal } from "@azure/msal-react";

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
const fetchRequestVerificationToken = async (forceRefresh: boolean = false) => {
  try {
    console.log("[Token] Fetching verification token...", forceRefresh ? "(force refresh)" : "(cached allowed)");
    const response = await fetch(`/_layout/tokenhtml`, {
      credentials: "include",
      cache: forceRefresh ? "no-cache" : "default",
    });

    console.log(`[Token] Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch verification token: ${response.status} ${response.statusText}`,
      );
    }

    const text = await response.text();
    console.log(
      "[Token] HTML Response (first 500 chars):",
      text?.substring(0, 500),
    );

    const doc = new DOMParser().parseFromString(text, "text/html");

    // Try multiple selectors to find the token
    let input = doc.querySelector<HTMLInputElement>(
      'input[name="__RequestVerificationToken"]',
    );

    if (!input) {
      console.log("[Token] Trying alternative selector...");
      input = doc.querySelector<HTMLInputElement>(
        "#__RequestVerificationToken",
      );
    }

    if (!input?.value) {
      console.warn(
        "[Token] RequestVerificationToken not found in HTML response",
      );
      console.warn("[Token] HTML content:", text);
      throw new Error("RequestVerificationToken not found");
    }

    console.log(
      "[Token] Successfully fetched verification token:",
      input.value?.substring(0, 20) + "...",
    );
    return input.value;
  } catch (err) {
    console.error("[Token] Error fetching verification token:", err);
    throw err;
  }
};

export function useDataverseApi() {
  const { instance, accounts, inProgress } = useMsal();
  let cachedToken: string | null = null;
  let cachedBearerToken: string | null = null;
  let bearerTokenExpiryTime: number = 0;

  const getToken = async (forceRefresh: boolean = false) => {
    try {
      if (!forceRefresh && cachedToken) {
        console.log("[Token] Using cached verification token");
        return cachedToken;
      }
      cachedToken = await fetchRequestVerificationToken(forceRefresh);
      return cachedToken;
    } catch (err) {
      console.error("[Token] Failed to get verification token:", err);
      cachedToken = null;
      return null;
    }
  };

  const getBearerToken = async () => {
    try {
      // Check if cached token is still valid (with 5 minute buffer)
      if (cachedBearerToken && bearerTokenExpiryTime > Date.now()) {
        console.log("[Bearer] Using cached bearer token");
        return cachedBearerToken;
      }

      if (!accounts || accounts.length === 0) {
        console.warn("[Bearer] No Azure accounts found");
        return null;
      }

      // For Azure AD B2C, we get the access token from the cached tokens obtained during login
      // This is a silent operation - NO POPUPS will appear
      // The tokens were already requested during the initial login/SSO flow
      const response = await instance.acquireTokenSilent({
        scopes: ["openid", "offline_access"],
        account: accounts[0],
        forceRefresh: false, // Use cached tokens if available
      });

      cachedBearerToken = response.accessToken;
      bearerTokenExpiryTime = response.expiresOn.getTime() - 5 * 60 * 1000;
      console.log("[Bearer] Successfully obtained bearer token (silent, no popup)");
      return cachedBearerToken;
    } catch (err) {
      console.warn("[Bearer] Unable to obtain bearer token silently:", err);
      console.warn("[Bearer] Token will not be included in API request");
      cachedBearerToken = null;
      bearerTokenExpiryTime = 0;
      return null;
    }
  };

  const callApi = async <T = any>(options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    url: string;
    data?: any;
    headers?: Record<string, string>;
    skipAuth?: boolean;
    forceRefreshToken?: boolean;
  }): Promise<T> => {
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(options.data ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      };

      // Add request verification token for CSRF protection (required by Power Apps Portals)
      if (!options.skipAuth) {
        // For PATCH requests (updates), always force a fresh token to avoid 401 errors
        const shouldForceRefresh = options.forceRefreshToken || options.method === "PATCH";

        const token = await getToken(shouldForceRefresh);
        if (token) {
          headers.__RequestVerificationToken = token;
          console.log("[API] Request verification token added to headers");
        } else {
          console.error(
            "[API] CRITICAL: Failed to obtain request verification token - request will fail",
          );
        }

        // Always attempt to get Bearer token for complete authentication
        try {
          const bearerToken = await getBearerToken();
          if (bearerToken) {
            headers.Authorization = `Bearer ${bearerToken}`;
            console.log("[API] Bearer token added to Authorization header");
          } else {
            console.warn("[API] Bearer token not available - will send only verification token");
          }
        } catch (err) {
          console.warn("[API] Error acquiring bearer token:", err);
        }
      }

      // Call through backend proxy (/_api/* routes to Dataverse API)
      console.log(`[API] ${options.method || "GET"} ${options.url}`);

      // Log both authentication headers
      const authHeadersLog = {
        "__RequestVerificationToken": headers.__RequestVerificationToken ? "Present" : "Missing",
        "Authorization": headers.Authorization ? "Bearer ***" : "Missing",
      };
      console.log(`[API] Authentication headers:`, authHeadersLog);
      console.log(`[API] All request headers:`, { ...headers, Authorization: headers.Authorization ? "Bearer ***" : "none" });

      if (options.data) {
        console.log(`[API] Request body:`, options.data);
      }

      // Confirm headers being sent
      console.log("[API] Final headers being sent:", {
        "Content-Type": headers["Content-Type"] || "none",
        "__RequestVerificationToken": headers.__RequestVerificationToken ? "✓ SENT" : "✗ MISSING",
        "Authorization": headers.Authorization ? "✓ SENT (Bearer token)" : "✗ MISSING",
        "Accept": headers.Accept || "none",
      });

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
      console.log(
        `[API] Response body (first 500 chars):`,
        text?.substring(0, 500),
      );

      if (!res.ok) {
        console.error(
          `[API] API Error ${res.status}: ${text?.substring(0, 200)}`,
        );
      }

      try {
        const returnvalue = text ? (JSON.parse(text) as T) : ({} as T);
        (returnvalue as any).status = res.status;
        (returnvalue as any).headers = res.headers;
        return returnvalue;
      } catch (parseErr) {
        // Non-JSON response — return empty object with status attached
        console.warn(
          `[API] Non-JSON response from ${options.url}:`,
          text?.substring(0, 200),
        );
        const result = {} as T;
        (result as any).status = res.status;
        (result as any).headers = res.headers;
        return result;
      }
    } catch (err) {
      console.error(`[API] Error calling ${options.url}:`, err);
      throw err;
    }
  };
  return { callApi };
}
