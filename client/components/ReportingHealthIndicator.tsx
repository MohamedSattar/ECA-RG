import * as React from "react";
import type { IDropdownOption } from "@fluentui/react/lib/Dropdown";

export const REPORTING_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Display month as name; API/state may store "1"–"12" or numeric month. */
export function formatReportingMonthName(
  month: string | number | undefined | null,
): string {
  if (month === undefined || month === null || month === "") return "—";
  const s = String(month).trim();
  const n = parseInt(s, 10);
  if (Number.isNaN(n) || n < 1 || n > 12) return s;
  return REPORTING_MONTH_NAMES[n - 1];
}

type HealthKey = 1 | 2 | 3;

const HEALTH_META: Record<
  HealthKey,
  { label: string; dotClass: string; bgClass: string; textClass: string }
> = {
  1: {
    label: "Healthy",
    dotClass:
      "bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.28)]",
    bgClass: "border border-emerald-200/90 bg-emerald-50/90",
    textClass: "text-emerald-900",
  },
  2: {
    label: "Challenging",
    dotClass:
      "bg-orange-500 shadow-[0_0_0_2px_rgba(249,115,22,0.28)]",
    bgClass: "border border-orange-200/90 bg-orange-50/90",
    textClass: "text-orange-950",
  },
  3: {
    label: "Risky",
    dotClass: "bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.28)]",
    bgClass: "border border-red-200/90 bg-red-50/90",
    textClass: "text-red-950",
  },
};

export function parseHealthIndicatorKey(
  value: number | string | undefined | null,
): HealthKey | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "string" ? parseInt(value, 10) : value;
  if (n === 1 || n === 2 || n === 3) return n as HealthKey;
  return null;
}

export const HealthIndicatorPill: React.FC<{
  value: number | string | undefined | null;
}> = ({ value }) => {
  const key = parseHealthIndicatorKey(value);
  if (!key) {
    return <span className="text-[#94a3b8]">—</span>;
  }
  const meta = HEALTH_META[key];
  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-full px-2.5 py-1 text-sm font-medium ${meta.bgClass} ${meta.textClass}`}
    >
      <span
        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${meta.dotClass}`}
        aria-hidden
      />
      {meta.label}
    </span>
  );
};

/** Fluent Dropdown: each option row in the list */
export function renderHealthDropdownOption(
  option?: IDropdownOption,
): React.ReactElement {
  if (!option) {
    return <span />;
  }
  const key = parseHealthIndicatorKey(option.key as string);
  if (!key) {
    return <span>{option.text}</span>;
  }
  const meta = HEALTH_META[key];
  return (
    <span className="flex items-center gap-2 py-0.5">
      <span
        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${meta.dotClass}`}
        aria-hidden
      />
      <span className={meta.textClass}>{meta.label}</span>
    </span>
  );
}

/** Fluent Dropdown: selected value in the field */
export function renderHealthDropdownTitle(
  options?: IDropdownOption[],
): React.ReactElement {
  if (!options?.length) {
    return <span />;
  }
  return <HealthIndicatorPill value={options[0].key as string} />;
}
