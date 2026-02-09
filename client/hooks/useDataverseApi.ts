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

  const getToken = async () => {
    try {
      if (cachedToken) {
        console.log("[Token] Using cached verification token");
        return cachedToken;
      }
      cachedToken = await fetchRequestVerificationToken();
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

      // For Azure AD B2C, we get the access token using the ID token request
      // The token endpoint will issue an access token for this application
      try {
        const response = await instance.acquireTokenSilent({
          scopes: ["openid", "offline_access"],
          account: accounts[0],
        });

        cachedBearerToken = response.accessToken;
        bearerTokenExpiryTime = response.expiresOn.getTime() - 5 * 60 * 1000;
        console.log("[Bearer] Successfully obtained bearer token from B2C");
        return cachedBearerToken;
      } catch (silentErr) {
        console.warn("[Bearer] Silent token acquisition failed, trying interactive:", silentErr);

        // Fallback to interactive token acquisition
        const response = await instance.acquireTokenPopup({
          scopes: ["openid", "offline_access"],
          account: accounts[0],
        });

        cachedBearerToken = response.accessToken;
        bearerTokenExpiryTime = response.expiresOn.getTime() - 5 * 60 * 1000;
        console.log("[Bearer] Successfully obtained bearer token via popup");
        return cachedBearerToken;
      }
    } catch (err) {
      console.error("[Bearer] Failed to get bearer token:", err);
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
  }): Promise<T> => {
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(options.data ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      };

      // Add request verification token only if not skipped (for public APIs)
      if (!options.skipAuth) {
        const token = await getToken();
        if (token) {
          headers.__RequestVerificationToken = token;
          console.log("[API] Request verification token added to headers");
        } else {
          console.error(
            "[API] Failed to obtain request verification token - request will likely fail",
          );
        }

        // Add Azure Bearer token for authenticated API calls
        const bearerToken = await getBearerToken();
        if (bearerToken) {
          headers.Authorization = `Bearer ${bearerToken}`;
          console.log("[API] Bearer token added to Authorization header");
        } else {
          console.warn("[API] Failed to obtain bearer token");
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
