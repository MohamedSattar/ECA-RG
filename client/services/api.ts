export interface ApiOptions extends RequestInit {
  headers?: Record<string, string>;
}
const fetchRequestVerificationToken = async () => {
    const response = await fetch('/_layout/tokenhtml');
    const text = await response.text();
    // Parse the response text to extract the token from the input element
    const doc = new DOMParser().parseFromString(text, "text/xml");
    const input = doc.querySelector("input");
    const token = input.getAttribute("value");
    return token;
};

export function usePortalApi() {


  const api = async <T = any>(url: string, options: ApiOptions = {}): Promise<T> => {
    const token = await fetchRequestVerificationToken();
    const response = await fetch(url, {
      credentials: "include",
      headers: {
        "Accept": "application/json",
        "__RequestVerificationToken": token,
        ...(options.headers || {}),
      },
      ...options,
    });

    // Detect redirects (usually not authenticated)
    if (response.redirected) {
      console.error("Redirect detected—user is not authenticated.");
      window.location.href = response.url;
      throw new Error("Not authenticated");
    }

    const text = await response.text();
    try {
        console.log("API response text:", JSON.parse(text));
      return text ? JSON.parse(text) : ({} as T);
    } catch {
      return text as any;
    }
  };

  return api;
}
