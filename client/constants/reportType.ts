export type ReportType = "Monthly" | "Interim" | "Final";

/**
 * Global choice `prmkt_reporttype` on prmtk_statusreport (Web API shows e.g. Interim = 2).
 * Adjust if your environment uses different option values.
 */
export const PRMKT_REPORT_TYPE_VALUES = [
  { value: 1, label: "Monthly" },
  { value: 2, label: "Interim" },
  { value: 3, label: "Final" },
] as const;

export function prmktReportTypeDropdownOptions(): {
  key: string;
  text: string;
}[] {
  return PRMKT_REPORT_TYPE_VALUES.map((o) => ({
    key: String(o.value),
    text: o.label,
  }));
}

export function choiceValueToReportType(v: number | undefined): ReportType {
  if (v === 2) return "Interim";
  if (v === 3) return "Final";
  return "Monthly";
}

export function labelForPrmktReportType(v: number | undefined): string {
  if (v == null) return "—";
  const row = PRMKT_REPORT_TYPE_VALUES.find((o) => o.value === v);
  return row?.label ?? String(v);
}

export function parsePrmktReportTypeFromApi(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

/** Interim selectable only from 9 months after research start; Final from 18 months. */
export function getReportTypeEligibility(
  researchStartDate: Date | undefined | null,
  now: Date = new Date(),
): {
  canSelectMonthly: boolean;
  canSelectInterim: boolean;
  canSelectFinal: boolean;
} {
  if (!researchStartDate || isNaN(researchStartDate.getTime())) {
    return {
      canSelectMonthly: true,
      canSelectInterim: false,
      canSelectFinal: false,
    };
  }
  const start = new Date(researchStartDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const interimOk = new Date(start);
  interimOk.setMonth(interimOk.getMonth() + 9);

  const finalOk = new Date(start);
  finalOk.setMonth(finalOk.getMonth() + 18);

  return {
    canSelectMonthly: true,
    canSelectInterim: today >= interimOk,
    canSelectFinal: today >= finalOk,
  };
}
