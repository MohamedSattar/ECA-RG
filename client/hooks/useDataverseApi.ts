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
const DATAVERSE_API_BASE = "https://research-grants-spa.powerappsportals.com";

const fetchRequestVerificationToken = async () => {
  const response = await fetch(`${DATAVERSE_API_BASE}/_layout/tokenhtml`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch verification token");
  }

  const text = await response.text();
  const doc = new DOMParser().parseFromString(text, "text/html");

  const input = doc.querySelector<HTMLInputElement>(
    'input[name="__RequestVerificationToken"]',
  );

  if (!input?.value) {
    throw new Error("RequestVerificationToken not found");
  }

  return input.value;
};

export function useDataverseApi() {
  let cachedToken: string | null = null;
  const getToken = async () => {
    // return "FfOvx9ULJl5zJMz0uHfG_7KnekSL4NDLPUjk9AH3wNcxSKlqWJ2niXpe51VPre07eD_vfkHaXzohtPQxC_e2IXaz2GHqNJ3gcVSyUpPZhug1";
    // if (cachedToken) return cachedToken;
    try {
      cachedToken = await fetchRequestVerificationToken();
      return cachedToken;
    } catch {
      cachedToken = null;
      return null;
    }
  };

  const callApi = async <T = any>(options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    url: string;
    data?: any;
    headers?: Record<string, string>;
  }): Promise<T> => {
    const token = await getToken();
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { __RequestVerificationToken: token } : {}),
      ...(options.headers || {}),
    };

    // Call the Dataverse API directly
    const fullUrl = `${DATAVERSE_API_BASE}${options.url}`;
    const res = await fetch(fullUrl, {
      credentials: "include",
      method: options.method || "GET",
      body: options.data ? JSON.stringify(options.data) : null,
      headers,
    });

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
    } catch {
      // Non-JSON response — return raw text
      return text as unknown as T;
    }
  };
  return { callApi };
}
