import { useRef, useCallback } from "react";

export interface ApiOptions extends RequestInit {
  headers?: Record<string, string>;
}

const SESSION_TOKEN_KEY = "auth.sessionToken";

/** Dev-only: never use VITE_* verification fallbacks in production builds. */
const allowVerificationFallback =
  import.meta.env.DEV &&
  import.meta.env.VITE_ALLOW_VERIFICATION_TOKEN_FALLBACK === "true";

function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Same-origin API calls use the server session JWT as Authorization Bearer. */
function authHeadersForUrl(url: string): Record<string, string> {
  const isOurApi =
    url.startsWith("/_api") ||
    url.startsWith("/_layout") ||
    url.startsWith("/api/");
  if (!isOurApi) return {};
  const session = getSessionToken();
  if (!session) return {};
  return { Authorization: `Bearer ${session}` };
}

const fetchRequestVerificationToken = async (forceRefresh: boolean = false) => {
  if (!getSessionToken()) {
    return null;
  }
  const auth = authHeadersForUrl("/api/verification-token");
  const response = await fetch(`/api/verification-token`, {
    credentials: "include",
    cache: forceRefresh ? "no-cache" : "default",
    headers: {
      Accept: "application/json",
      ...auth,
    },
  });

  if (!response.ok) {
    if (allowVerificationFallback) {
      return import.meta.env.VITE_VERIFICATION_FALLBACK_TOKEN as
        | string
        | undefined;
    }
    return null;
  }

  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    if (allowVerificationFallback) {
      return import.meta.env.VITE_VERIFICATION_FALLBACK_TOKEN as
        | string
        | undefined;
    }
    return null;
  }

  const data = (await response.json()) as {
    token?: string | null;
    available?: boolean;
    error?: string;
  };

  if (data.token) {
    return data.token;
  }

  if (allowVerificationFallback) {
    return import.meta.env.VITE_VERIFICATION_FALLBACK_TOKEN as
      | string
      | undefined;
  }
  return null;
};

export function useDataverseApi() {
  const cachedTokenRef = useRef<string | null>(null);

  const getToken = useCallback(async (forceRefresh: boolean = false) => {
    if (!forceRefresh && cachedTokenRef.current) {
      return cachedTokenRef.current;
    }
    const t = await fetchRequestVerificationToken(forceRefresh);
    cachedTokenRef.current = t;
    return t;
  }, []);

  const callApi = useCallback(
    async <T = any>(options: {
      method?: "GET" | "POST" | "PATCH" | "DELETE";
      url: string;
      data?: unknown;
      headers?: Record<string, string>;
      skipAuth?: boolean;
      skipVerificationToken?: boolean;
      forceRefreshToken?: boolean;
    }): Promise<T> => {
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(options.data ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      };

      if (!options.skipAuth) {
        Object.assign(headers, authHeadersForUrl(options.url));
      }

      if (options.method === "GET") {
        headers["OData-Version"] = "4.0";
        headers["OData-MaxVersion"] = "4.0";
        headers["Prefer"] = "odata.include-annotations=*";
      }

      if (!options.skipAuth && !options.skipVerificationToken) {
        const shouldForceRefresh =
          options.forceRefreshToken || options.method === "PATCH";
        const token = await getToken(shouldForceRefresh);
        if (token) {
          headers.__RequestVerificationToken = token;
        }
      }

      const res = await fetch(options.url, {
        credentials: "include",
        method: options.method || "GET",
        body: options.data ? JSON.stringify(options.data) : null,
        headers,
      });

      if (res.redirected) {
        window.location.href = res.url;
        throw new Error("Not authenticated");
      }

      const text = await res.text();

      try {
        const returnvalue = text ? (JSON.parse(text) as T) : ({} as T);
        (returnvalue as { status?: number }).status = res.status;
        (returnvalue as { headers?: Headers }).headers = res.headers;
        return returnvalue;
      } catch {
        const result = {} as T;
        (result as { status?: number }).status = res.status;
        (result as { headers?: Headers }).headers = res.headers;
        return result;
      }
    },
    [getToken],
  );

  return { callApi };
}
