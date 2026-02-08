import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { API_CONFIG } from "@/config/api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize image URLs by replacing localhost with production portal URL
 * Uses centralized API_CONFIG for consistency
 */
export function normalizeImageUrl(url: string | null | undefined): string | null {
  return API_CONFIG.normalizeImageUrl(url);
}
