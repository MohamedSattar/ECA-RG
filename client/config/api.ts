/**
 * Centralized API Configuration
 * All API and portal URLs are defined here for easy maintenance
 */

export const API_CONFIG = {
  /**
   * Base URL for the Power Pages portal
   * Configured via VITE_PUBLIC_API_BASE_URL environment variable
   */
  BASE_URL:
    import.meta.env.VITE_PUBLIC_API_BASE_URL ||
    "https://research-grants-spa.powerappsportals.com",

  /**
   * API endpoints
   */
  get API_ENDPOINT() {
    return `${this.BASE_URL}/_api`;
  },

  get DATAVERSE_API() {
    return this.API_ENDPOINT;
  },

  /**
   * Get full URL for any relative path
   */
  getFullUrl(path: string): string {
    if (path.startsWith("http")) {
      return path;
    }
    if (path.startsWith("/")) {
      return `${this.BASE_URL}${path}`;
    }
    return `${this.BASE_URL}/${path}`;
  },

  /**
   * Normalize image URLs to use full portal URLs
   * Converts relative paths to absolute URLs from the portal
   */
  normalizeImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    let cleanUrl = url;

    // Decode HTML entities (e.g., &amp; -> &)
    cleanUrl = cleanUrl.replace(/&amp;/g, "&");

    console.log("[normalizeImageUrl] Input URL:", cleanUrl);

    // Remove leading slash if URL contains an absolute URL (e.g., /https://...)
    if (cleanUrl.startsWith("/http://") || cleanUrl.startsWith("/https://")) {
      cleanUrl = cleanUrl.substring(1);
    }

    // If it's already an absolute URL from our portal, return as-is
    if (cleanUrl.startsWith("https://") || cleanUrl.startsWith("http://")) {
      console.log("[normalizeImageUrl] Already absolute URL, returning as-is");
      return cleanUrl;
    }

    // If URL is relative path (starts with /), prepend the base portal URL
    if (cleanUrl.startsWith("/")) {
      const fullUrl = `${this.BASE_URL}${cleanUrl}`;
      console.log(
        "[normalizeImageUrl] Relative path converted to full URL:",
        fullUrl,
      );
      return fullUrl;
    }

    // Fallback: prepend base URL
    console.log("[normalizeImageUrl] No pattern matched, prepending base URL");
    return `${this.BASE_URL}/${cleanUrl}`;
  },
};

export default API_CONFIG;
