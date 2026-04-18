/**
 * Logical name → entity set for /api/dataverse-image (strict; extend when adding new image sources).
 */
const IMAGE_LOGICAL_TO_SET: Record<string, string> = {
  prmtk_researcharea: "prmtk_researchareas",
};

export function resolveImageEntitySetName(logicalName: string): string | null {
  const key = logicalName.trim().toLowerCase();
  return IMAGE_LOGICAL_TO_SET[key] ?? null;
}

/** Image column names must match Dataverse attribute naming (prmtk_*). */
export function isAllowedImageAttributeName(attribute: string): boolean {
  return /^prmtk_[a-z0-9_]+$/i.test(attribute) && attribute.length <= 200;
}
