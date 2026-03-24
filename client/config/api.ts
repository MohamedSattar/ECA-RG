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
    "https://ecacrmdev.crm15.dynamics.com",
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

    let cleanUrl = url.replace(/&amp;/g, "&");

    if (cleanUrl.startsWith("/http://") || cleanUrl.startsWith("/https://")) {
      cleanUrl = cleanUrl.substring(1);
    }

    const normalizedUrl = cleanUrl.startsWith("https://") || cleanUrl.startsWith("http://")
      ? cleanUrl
      : cleanUrl.startsWith("/")
        ? `${this.BASE_URL}${cleanUrl}`
        : `${this.BASE_URL}/${cleanUrl}`;

    try {
      const baseUrl = new URL(this.BASE_URL);
      const parsedUrl = new URL(normalizedUrl);
      const isDataverseImageDownload =
        parsedUrl.origin === baseUrl.origin &&
        parsedUrl.pathname.toLowerCase() === "/image/download.aspx";

      if (isDataverseImageDownload) {
        if (!parsedUrl.searchParams.has("full")) {
          parsedUrl.searchParams.set("full", "true");
        }

        return `/api/dataverse-image?full=true&url=${encodeURIComponent(parsedUrl.toString())}`;
      }

      return parsedUrl.toString();
    } catch {
      return normalizedUrl;
    }
  },
};

export default API_CONFIG;
