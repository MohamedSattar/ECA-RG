/*export const useDataverseApi = () => {
  const callApi = <T = any>(options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    url: string;
    data?: any;
  }): Promise<T> => {
    return new Promise((resolve, reject) => {
      if(!window.safeAjax) {
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

export function useDataverseApi() {
  const { instance, accounts } = useMsal();

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
      } catch {
        if (import.meta.env.DEV) {
          const fallbackToken = import.meta.env.VITE_B2C_FALLBACK_TOKEN;
          if (fallbackToken) {
            return fallbackToken;
          }
        }
        return null;
      }
    } catch {
      return null;
    }
  };

  const callApi = async <T = any>(options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    url: string;
    data?: any;
    headers?: Record<string, string>;
    skipAuth?: boolean;
    /** When true, do not add client Authorization — server proxy supplies credentials. */
    skipClientBearer?: boolean;
  }): Promise<T> => {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.data ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    };

    if (options.method === "GET") {
      headers["OData-Version"] = "4.0";
      headers["OData-MaxVersion"] = "4.0";
      headers["Prefer"] = "odata.include-annotations=*";
    }

    if (!options.skipAuth && !options.skipClientBearer) {
      try {
        const bearer = await getBearerToken();
        if (bearer) {
          headers.Authorization = `Bearer ${bearer}`;
        }
      } catch {
        /* silent */
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
      (returnvalue as any).status = res.status;
      (returnvalue as any).headers = res.headers;
      return returnvalue;
    } catch {
      const result = {} as T;
      (result as any).status = res.status;
      (result as any).headers = res.headers;
      return result;
    }
  };
  return { callApi };
}
