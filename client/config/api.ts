/**
 * Centralized API Configuration
 * All API and portal URLs are defined here for easy maintenance
 */

export const API_CONFIG = {
  /**
   * Base URL for the Power Pages portal
   * Configured via VITE_PUBLIC_API_BASE_URL environment variable
   */
  BASE_URL: import.meta.env.VITE_PUBLIC_API_BASE_URL || 'https://research-grants-spa.powerappsportals.com',

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
    if (path.startsWith('http')) {
      return path;
    }
    if (path.startsWith('/')) {
      return `${this.BASE_URL}${path}`;
    }
    return `${this.BASE_URL}/${path}`;
  },

  /**
   * Normalize image URLs by routing through proxy to handle CORS
   * Used for Dataverse API image URLs that may have CORS restrictions
   */
  normalizeImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    // Remove leading slash if URL contains an absolute URL (e.g., /https://...)
    let cleanUrl = url;
    if (url.startsWith('/http://') || url.startsWith('/https://')) {
      cleanUrl = url.substring(1); // Remove the leading slash
    }

    // If URL is relative path from Dataverse API, route through our image proxy
    if (cleanUrl.startsWith('/_api/')) {
      // Route through proxy endpoint: /_images/?imageUrl=<encoded-url>
      return `/_images/${cleanUrl.substring(1)}`; // Remove leading / from /_api -> _api
    }

    // If URL starts with just /, assume it's a Dataverse API path
    if (cleanUrl.startsWith('/') && !cleanUrl.startsWith('http')) {
      return `/_images/${cleanUrl.substring(1)}`; // Route through proxy
    }

    // If URL already uses production base URL, route through proxy
    if (cleanUrl.includes(this.BASE_URL)) {
      const path = cleanUrl.replace(this.BASE_URL, '');
      return `/_images/${path.substring(1)}`; // Remove leading / from path
    }

    // If URL contains localhost, extract the path and route through proxy
    if (cleanUrl.includes('localhost')) {
      const match = cleanUrl.match(/localhost(?::\d+)?(\/.*)/);
      if (match?.[1]) {
        return `/_images/${match[1].substring(1)}`; // Route through proxy
      }
    }

    // If URL is already absolute (starts with http), return as-is (external images)
    if (cleanUrl.startsWith('http')) {
      return cleanUrl;
    }

    // Fallback: return as-is
    return cleanUrl;
  },
};

export default API_CONFIG;
