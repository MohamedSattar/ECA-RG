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
   * Normalize image URLs by replacing localhost with production URL
   * Used for Dataverse API image URLs that may contain localhost references
   */
  normalizeImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    // Remove leading slash if URL contains an absolute URL (e.g., /https://...)
    let cleanUrl = url;
    if (url.startsWith('/http://') || url.startsWith('/https://')) {
      cleanUrl = url.substring(1); // Remove the leading slash
    }

    // If URL is already using production base URL, return as-is
    if (cleanUrl.includes(this.BASE_URL)) {
      return cleanUrl;
    }

    // If URL contains localhost, replace it with production URL
    if (cleanUrl.includes('localhost')) {
      return cleanUrl.replace(/https?:\/\/localhost(:\d+)?\//, this.BASE_URL + '/');
    }

    // If URL is already absolute (starts with http), return as-is
    if (cleanUrl.startsWith('http')) {
      return cleanUrl;
    }

    // If URL is relative, prepend base URL
    if (cleanUrl.startsWith('/')) {
      return this.BASE_URL + cleanUrl;
    }

    return cleanUrl;
  },
};

export default API_CONFIG;
