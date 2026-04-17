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

import { useAuth } from "@/state/auth";
import { useMsal } from "@azure/msal-react";
import clsx from "clsx";

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
// Development-only fallback when the portal token endpoint is unreachable (never used in production builds).
const DEV_FALLBACK_VERIFICATION_TOKEN =
  "H2mPseS4jqMjdACQIcTLuZYge-isZjkr_Pj37loAqcjZb6dp4bIZao9TZqN2uvXmMVwTGvkFsTtq5tnfPGfoCj2U15FDO8T8ESjcSTfguKw1";

const fetchRequestVerificationToken = async (forceRefresh: boolean = false) => {
  try {
    console.log(
      "[Token] Fetching verification token...",
      forceRefresh ? "(force refresh)" : "(cached allowed)",
    );

    const response = await fetch(`/api/verification-token`, {
      credentials: "include",
      cache: forceRefresh ? "no-cache" : "default",
    });

    if (!response.ok) {
      if (import.meta.env.PROD) {
        throw new Error(`Verification token endpoint error ${response.status}`);
      }
      console.warn(`[Token] Server returned error ${response.status}, using dev fallback`);
      return DEV_FALLBACK_VERIFICATION_TOKEN;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      if (import.meta.env.PROD) {
        throw new Error(`Unexpected verification token content type: ${contentType}`);
      }
      return DEV_FALLBACK_VERIFICATION_TOKEN;
    }

    const data = await response.json() as { token: string | null; available?: boolean };

    if (!data.token) {
      if (import.meta.env.PROD) {
        throw new Error("Verification token unavailable");
      }
      console.warn("[Token] Server returned null token, using dev fallback", data);
      return DEV_FALLBACK_VERIFICATION_TOKEN;
    }

    return data.token;
  } catch (err) {
    if (import.meta.env.PROD) {
      throw err;
    }
    console.warn("[Token] Error fetching from server, using dev fallback:", err);
    return DEV_FALLBACK_VERIFICATION_TOKEN;
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
      if (!accounts || accounts.length === 0) {
        return null;
      }

      try {
        const response = await instance.acquireTokenSilent({
          scopes: ["openid", "profile", "offline_access"],
          account: accounts[0],
          forceRefresh: false,
        });
        return response.idToken;
      } catch (silentErr) {
        if (import.meta.env.DEV) {
          const fallbackToken = import.meta.env.VITE_B2C_FALLBACK_TOKEN;
          if (fallbackToken) {
            console.warn("[Bearer] acquireTokenSilent failed; using dev fallback token");
            return fallbackToken;
          }
        }
        console.warn("[Bearer] acquireTokenSilent failed:", silentErr);
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
      const user = JSON.parse(localStorage.getItem("auth.user") || "{}");
        console.log("user",user);
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(options.data ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      };

      headers["x-user-id"]= user?.contact?.contactid
      headers["x-user-email"]= user?.email
      if(options.method =="GET"){
        headers["OData-Version"] = "4.0",
        headers["OData-MaxVersion"] = "4.0"
        headers["Prefer"]="odata.include-annotations=*"
      }
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

      const sessionToken = localStorage.getItem("auth.sessionToken");
      const url = options.url;
      const needsSessionHeader =
        url.startsWith("/_api") ||
        url.startsWith("/api/budget") ||
        url.startsWith("/api/dataverse-image");
      if (needsSessionHeader && sessionToken) {
        headers["X-Session-Token"] = sessionToken;
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
