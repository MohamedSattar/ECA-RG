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

    let cleanUrl = url;

    // Decode HTML entities (e.g., &amp; -> &)
    cleanUrl = cleanUrl.replace(/&amp;/g, '&');

    // Remove leading slash if URL contains an absolute URL (e.g., /https://...)
    if (cleanUrl.startsWith('/http://') || cleanUrl.startsWith('/https://')) {
      cleanUrl = cleanUrl.substring(1);
    }

    // If URL is from our production portal (e.g., https://research-grants-spa.powerappsportals.com/Image/download.aspx?...)
    if (cleanUrl.includes(this.BASE_URL)) {
      // Extract the path and query params after the domain
      // e.g., "https://research-grants-spa.powerappsportals.com/Image/download.aspx?..."
      // becomes "/Image/download.aspx?..."
      const path = cleanUrl.replace(this.BASE_URL, '');
      console.log('[normalizeImageUrl] Portal URL detected, converting to:', `/_images${path}`);
      return `/_images${path}`;
    }

    // If URL is relative path from Dataverse API, route through our image proxy
    if (cleanUrl.startsWith('/_api/')) {
      console.log('[normalizeImageUrl] API URL detected, converting to:', `/_images${cleanUrl}`);
      return `/_images${cleanUrl}`;
    }

    // If URL starts with just /, assume it's a Dataverse API path
    if (cleanUrl.startsWith('/') && !cleanUrl.startsWith('http')) {
      console.log('[normalizeImageUrl] Relative URL detected, converting to:', `/_images${cleanUrl}`);
      return `/_images${cleanUrl}`;
    }

    // If URL contains localhost, extract the path and route through proxy
    if (cleanUrl.includes('localhost')) {
      const match = cleanUrl.match(/localhost(?::\d+)?(\/.*)/);
      if (match?.[1]) {
        console.log('[normalizeImageUrl] Localhost URL detected, converting to:', `/_images${match[1]}`);
        return `/_images${match[1]}`;
      }
    }

    // If URL is already absolute (starts with http), return as-is (external images)
    if (cleanUrl.startsWith('http')) {
      console.log('[normalizeImageUrl] External URL, returning as-is:', cleanUrl);
      return cleanUrl;
    }

    // Fallback: return as-is
    console.log('[normalizeImageUrl] No match, returning as-is:', cleanUrl);
    return cleanUrl;
  },
};

export default API_CONFIG;
