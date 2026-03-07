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
// Fallback verification token for when server endpoint is unavailable or unreachable
const FALLBACK_VERIFICATION_TOKEN = "H2mPseS4jqMjdACQIcTLuZYge-isZjkr_Pj37loAqcjZb6dp4bIZao9TZqN2uvXmMVwTGvkFsTtq5tnfPGfoCj2U15FDO8T8ESjcSTfguKw1";

const fetchRequestVerificationToken = async (forceRefresh: boolean = false) => {
  try {
    console.log(
      "[Token] Fetching verification token...",
      forceRefresh ? "(force refresh)" : "(cached allowed)",
    );

    // Use server-side endpoint to fetch token
    const response = await fetch(`/api/verification-token`, {
      credentials: "include",
      cache: forceRefresh ? "no-cache" : "default",
    });

    console.log(`[Token] Response status: ${response.status} ${response.statusText}`);
    console.log(`[Token] Response headers:`, {
      contentType: response.headers.get("content-type"),
    });

    if (!response.ok) {
      console.warn(`[Token] Server returned error ${response.status}, using fallback token`);
      return FALLBACK_VERIFICATION_TOKEN;
    }

    // Check content type before parsing
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      console.warn(
        `[Token] Expected JSON but got ${contentType}, using fallback token`
      );
      return FALLBACK_VERIFICATION_TOKEN;
    }

    const data = await response.json() as { token: string | null; available: boolean };

    if (!data.token) {
      console.warn(
        "[Token] Server returned null token, using fallback token",
        data
      );
      return FALLBACK_VERIFICATION_TOKEN;
    }

    console.log(
      "[Token] ✓ Successfully fetched verification token from server:",
      data.token?.substring(0, 20) + "...",
    );
    return data.token;
  } catch (err) {
    console.warn("[Token] Error fetching from server, using fallback token:", err);
    // Return fallback token on any error to ensure API calls can proceed
    return FALLBACK_VERIFICATION_TOKEN;
  }
};

export function useDataverseApi() {
  const { instance, accounts } = useMsal();
  let cachedToken: string | null = null;

  const getToken = async (forceRefresh: boolean = false) => {
    if (!forceRefresh && cachedToken) {
      console.log("[Token] Using cached verification token");
      return cachedToken;
    }
    // fetchRequestVerificationToken always returns a token (fetched or fallback)
    cachedToken = await fetchRequestVerificationToken(forceRefresh);
    return cachedToken;
  };

  const getBearerToken = async () => {
    try {
      // PRIMARY APPROACH (DEFAULT): Use OAuth2 Client Credentials flow to obtain a bearer token.
      // Prefer calling Dataverse resource scope if configured via `DATAVERSE_RESOURCE`.
      console.log("[Bearer] Defaulting to client-credentials flow for bearer token acquisition");
      const clientId = import.meta.env.VITE_B2C_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_B2C_CLIENT_SECRET;
      const tokenUrl = import.meta.env.VITE_B2C_TOKEN_URL;
      // Use DATAVERSE_RESOURCE (tenant resource/.default) when present, otherwise fall back to configured B2C scopes
      const scopes = import.meta.env.DATAVERSE_RESOURCE || import.meta.env.VITE_B2C_SCOPES || "openid offline_access";

      console.log("[Bearer] Client credentials env check - ID:", !!clientId, "Secret:", !!clientSecret, "URL:", !!tokenUrl, "Scope:", scopes);

      if (clientId && clientSecret && tokenUrl) {
        try {
          console.log("[Bearer] Requesting token from:", tokenUrl);
          const params = new URLSearchParams();
          params.append("client_id", clientId);
          params.append("client_secret", clientSecret);
          params.append("grant_type", "client_credentials");
          params.append("scope", scopes);

          const tokenResp = await fetch(tokenUrl, {
            method: "POST",
            body: params,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });

          console.log("[Bearer] Token endpoint response:", tokenResp.status, tokenResp.statusText);

          if (tokenResp.ok) {
            const tokenBody = await tokenResp.json();
            console.log("[Bearer] Token response keys:", Object.keys(tokenBody));

            const token = tokenBody.access_token || tokenBody.id_token;
            if (token) {
              const expiresIn = Number(tokenBody.expires_in) || 3600;
              console.log("[Bearer] SUCCESS: Obtained token from B2C (expires in", expiresIn, "s)");
              console.log("[Bearer] FULL TOKEN:", token);
              return token;
            }
          } else {
            const errText = await tokenResp.text();
            console.error("[Bearer] Token endpoint error:", tokenResp.status, errText);
          }
        } catch (ccErr) {
          console.error("[Bearer] Client credentials flow failed:", ccErr);
        }
      } else {
        console.warn("[Bearer] Client credentials incomplete - skipping client credentials approach");
      }

      // FALLBACK: Try MSAL if client credentials failed
      console.log("[Bearer] Falling back to MSAL token acquisition");

      if (!accounts || accounts.length === 0) {
        console.warn("[Bearer] No MSAL accounts available");
        return null;
      }

      console.log("[Bearer] Attempting to acquire token silently (MSAL)");
      try {
        const response = await instance.acquireTokenSilent({
          scopes: ["openid", "profile", "offline_access"],
          account: accounts[0],
          forceRefresh: false,
        });

        const token = response.idToken;
        if (response.expiresOn) {
          // not caching; just logging expiry info
          console.log("[Bearer] MSAL token expires on:", response.expiresOn);
        }
        console.log("[Bearer] acquireTokenSilent succeeded. Token:", token.substring(0, 50) + "...");
        console.log("[Bearer] FULL DEBUG TOKEN:", token);
        return token;
      } catch (silentErr) {
        console.warn("[Bearer] acquireTokenSilent failed:", silentErr);
        
        // LAST RESORT: Use static fallback token (development only)
        const fallbackToken = import.meta.env.VITE_B2C_FALLBACK_TOKEN;
        if (fallbackToken) {
          console.warn("[Bearer] LAST RESORT: Using static fallback token for development");
          console.log("[Bearer] LAST RESORT TOKEN:", fallbackToken.substring(0, 50) + "...");
          return fallbackToken;
        }
        
        console.error("[Bearer] All token acquisition methods exhausted—returning null");
        return null;
      }
    } catch (err) {
      console.error("[Bearer] Unexpected error acquiring bearer token:", err);
      return null;
    }
  };

  const callApi = async <T = any>(options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    url: string;
    data?: any;
    headers?: Record<string, string>;
    skipAuth?: boolean;
    // When true, do not attempt to acquire a client-side bearer token — useful when using a server proxy that supplies Authorization.
    skipClientBearer?: boolean;
    // When true, do not add the __RequestVerificationToken header (useful for server proxy requests)
    skipVerificationToken?: boolean;
    forceRefreshToken?: boolean;
  }): Promise<T> => {
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(options.data ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      };

      // Add request verification token for CSRF protection, unless skipped
      if (!options.skipAuth && !options.skipVerificationToken) {
        // For PATCH requests (updates), always force a fresh token to avoid 401 errors
        const shouldForceRefresh =
          options.forceRefreshToken || options.method === "PATCH";

        const token = await getToken(shouldForceRefresh);
        headers.__RequestVerificationToken = token;
        console.log("[API] ✓ Request verification token added to headers");
      } else if (options.skipVerificationToken) {
        console.log("[API] Skipping __RequestVerificationToken as requested");
      }

      // Also attempt to add Authorization header (bearer token) if available, unless caller requested to skip client-side bearer acquisition
      if (!options.skipAuth) {
        if (!options.skipClientBearer) {
          try {
            const bearer = await getBearerToken();
            if (bearer) {
              headers.Authorization = `Bearer ${bearer}`;
              console.log("[API] Bearer token added to Authorization header:", bearer.substring(0, 50) + "...");
              console.log("[API] FULL DEBUG BEARER TOKEN:", bearer);
            } else {
              console.warn("[API] Bearer token not available; Authorization header omitted");
            }
          } catch (err) {
            console.error("[API] Error while acquiring bearer token:", err);
          }
        } else {
          console.log("[API] Skipping client-side bearer acquisition as requested");
        }
      }

      // Call through Power Pages API
      console.log(`[API] ${options.method || "GET"} ${options.url}`);

      // Log authentication headers
      console.log(`[API] Authentication headers:`, {
        __RequestVerificationToken: headers.__RequestVerificationToken
          ? "Present"
          : "Missing",
        Authorization: headers.Authorization ? headers.Authorization.substring(0, 50) + "..." : "Missing",
      });

      // Log full Authorization header for debugging
      if (headers.Authorization) {
        console.log(`[API] FULL DEBUG AUTHORIZATION:`, headers.Authorization);
      }

      if (options.data) {
        console.log(`[API] Request body:`, options.data);
      }

      // Confirm headers being sent
      console.log("[API] Final headers being sent:", {
        "Content-Type": headers["Content-Type"] || "none",
        __RequestVerificationToken: headers.__RequestVerificationToken
          ? "✓ SENT"
          : "✗ MISSING",
        Authorization: headers.Authorization ? headers.Authorization.substring(0, 50) + "..." : "✗ MISSING",
        Accept: headers.Accept || "none",
      });

      // Log full bearer token for debugging
      if (headers.Authorization) {
        console.log("[API] FULL DEBUG AUTHORIZATION HEADER:", headers.Authorization);
      }

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
