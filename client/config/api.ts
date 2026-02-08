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

    console.log('[normalizeImageUrl] Input URL:', cleanUrl);

    // Remove leading slash if URL contains an absolute URL (e.g., /https://...)
    if (cleanUrl.startsWith('/http://') || cleanUrl.startsWith('/https://')) {
      cleanUrl = cleanUrl.substring(1);
    }

    // Handle absolute URLs from our portal
    // Match: https://research-grants-spa.powerappsportals.com/... or http://...
    const absoluteUrlMatch = cleanUrl.match(/^https?:\/\/([^/]+)(\/.*)?$/);
    if (absoluteUrlMatch) {
      const domain = absoluteUrlMatch[1];
      const path = absoluteUrlMatch[2] || '';

      // If it's from our portal, route through proxy
      if (domain === 'research-grants-spa.powerappsportals.com' || domain.includes('powerappsportals.com')) {
        console.log('[normalizeImageUrl] Portal domain detected, routing through proxy');
        return `/_images${path}`;
      } else {
        // External domain, return as-is
        console.log('[normalizeImageUrl] External domain, returning as-is');
        return cleanUrl;
      }
    }

    // If URL is relative path from Dataverse API, route through our image proxy
    if (cleanUrl.startsWith('/_api/')) {
      console.log('[normalizeImageUrl] API URL detected, routing through proxy');
      return `/_images${cleanUrl}`;
    }

    // If URL starts with just /, assume it's a Dataverse API path
    if (cleanUrl.startsWith('/') && !cleanUrl.startsWith('http')) {
      console.log('[normalizeImageUrl] Relative URL detected, routing through proxy');
      return `/_images${cleanUrl}`;
    }

    // Fallback: return as-is
    console.log('[normalizeImageUrl] No pattern matched, returning as-is:', cleanUrl);
    return cleanUrl;
  },
};

export default API_CONFIG;
