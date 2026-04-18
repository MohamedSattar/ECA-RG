/** Dataverse record id (GUID with optional braces). */
const GUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isDataverseGuid(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  const inner =
    s.startsWith("{") && s.endsWith("}") ? s.slice(1, -1).trim() : s;
  return GUID_RE.test(inner);
}
