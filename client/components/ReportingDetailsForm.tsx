import * as React from "react";
import { useEffect, useMemo, useRef } from "react";
import { PrimaryButton, DefaultButton } from "@fluentui/react/lib/Button";
import { Label } from "@fluentui/react/lib/Label";
import { Dropdown, IDropdownOption } from "@fluentui/react/lib/Dropdown";
import { TextField } from "@fluentui/react/lib/TextField";
import { IconButton } from "@fluentui/react/lib/Button";
import { Icon } from "@fluentui/react/lib/Icon";
import { getFileKey } from "@/services/utility";
import type { AddReportForm, ReportItem } from "@/components/ReportingSection";
import {
  renderHealthDropdownOption,
  renderHealthDropdownTitle,
} from "@/components/ReportingHealthIndicator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { popupInputStyles } from "@/styles/popupInputStyles";
import {
  type ReportType,
  choiceValueToReportType,
  getReportTypeEligibility,
} from "@/constants/reportType";

export type { ReportType };

const getTodayDate = (): string => {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let i = -1;
  let size = bytes;
  do {
    size = size / 1024;
    i++;
  } while (size >= 1024 && i < units.length - 1);
  return `${size.toFixed(1)} ${units[i]}`;
};

const generateYearOptions = (): IDropdownOption[] => {
  const currentYear = new Date().getFullYear();
  const years: IDropdownOption[] = [];
  for (let i = 0; i <= 4; i++) {
    years.push({
      key: (currentYear + i).toString(),
      text: (currentYear + i).toString(),
    });
  }
  return years;
};

const MONTH_OPTIONS: IDropdownOption[] = [
  { key: "1", text: "January" },
  { key: "2", text: "February" },
  { key: "3", text: "March" },
  { key: "4", text: "April" },
  { key: "5", text: "May" },
  { key: "6", text: "June" },
  { key: "7", text: "July" },
  { key: "8", text: "August" },
  { key: "9", text: "September" },
  { key: "10", text: "October" },
  { key: "11", text: "November" },
  { key: "12", text: "December" },
];

const HEALTH_INDICATOR_OPTIONS: IDropdownOption[] = [
  { key: "1", text: "Healthy" },
  { key: "2", text: "Challenging" },
  { key: "3", text: "Risky" },
];

type LabelConfig = { label: string; description: React.ReactNode | null };

function ReportTypeCard({
  selected,
  disabled,
  title,
  titleMuted = false,
  onSelect,
  children,
  disabledHint,
}: {
  selected: boolean;
  disabled: boolean;
  title: string;
  titleMuted?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  disabledHint?: string;
}) {
  const titleCls = selected
    ? "font-bold text-white"
    : disabled
      ? "font-bold text-slate-400"
      : titleMuted
        ? "font-bold text-[#93c5fd]"
        : "font-bold text-[#1D2054]";

  const shell =
    selected && !disabled
      ? "border-transparent bg-[#1D2054] shadow-md"
      : disabled
        ? "cursor-not-allowed border-slate-200 bg-slate-100/90 opacity-[0.65]"
        : "border-[#bfdbfe] bg-slate-50 hover:border-[#1D2054]/40 hover:bg-white";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      title={disabled ? disabledHint : undefined}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onSelect();
      }}
      className={`flex min-h-[128px] w-full flex-col rounded-2xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D2054] focus-visible:ring-offset-2 ${shell}`}
    >
      <span className={`${titleCls} mb-2 block`}>{title}</span>
      <div
        className={
          selected
            ? "[&_p]:text-slate-200 [&_strong]:text-white"
            : "[&_p]:text-slate-700 [&_strong]:text-slate-900"
        }
      >
        {children}
      </div>
    </button>
  );
}

const KEY_ACTIVITIES_LABELS: Record<ReportType, LabelConfig> = {
  Monthly: {
    label:
      "Key Tasks and Activities Undertaken During the Reporting Period (Operational Progress)",
    description: (
      <>
        Please provide a concise and factual overview of the key tasks,
        milestones, and activities completed during the reporting period. This
        section should focus on what was done and should align with the approved
        workplan and deliverables outlined in the grant agreement. Examples may
        include (but are not limited to):
        <ul className="list-disc pl-4 mt-2 space-y-1">
          <li>Data collection, analysis, or instrument development</li>
          <li>Ethics submissions or approvals</li>
          <li>Recruitment of participants</li>
        </ul>
      </>
    ),
  },
  Interim: {
    label: "Planned Activities Executed to Date",
    description:
      "Please provide a detailed overview of the key tasks, milestones, and activities completed during the reporting period. This section should focus on what was done and should align with the approved workplan and deliverables outlined in the grant agreement.",
  },
  Final: {
    label: "Planned Activities Executed During the Project",
    description: (
      <>
        Provide a detailed summary of all activities conducted throughout the
        project period. Include:
        <ul className="list-disc pl-4 mt-2 space-y-1">
          <li>Data collection, analysis, and instrument development</li>
          <li>Ethics submissions and approvals</li>
          <li>Recruitment of staff and participants</li>
        </ul>
      </>
    ),
  },
};

const UPCOMING_ACTIVITIES_LABELS: Record<ReportType, LabelConfig> = {
  Monthly: {
    label: "Planned Upcoming Tasks and Activities",
    description:
      "Please outline the key tasks, milestones, and activities planned for the upcoming reporting period. Kindly note any dependencies, approvals, or resources required to support timely implementation.",
  },
  Interim: {
    label: "Upcoming Activities (Next Period)",
    description: null,
  },
  Final: {
    label: "Upcoming Activities (Next Period)",
    description: null,
  },
};

const CHALLENGES_LABELS: Record<ReportType, LabelConfig> = {
  Monthly: {
    label: "Challenges, Risks, and Mitigation Strategies",
    description: (
      <>
        Please describe any challenges or risks encountered during the reporting
        period, along with the steps taken or planned to address them. Where
        applicable, please comment on:
        <ul className="list-disc pl-4 mt-2 space-y-1">
          <li>Anticipated impacts on project timelines, scope, or deliverables</li>
          <li>Anticipated or actual budgetary implications</li>
          <li>Risk mitigation strategies and contingency plans</li>
        </ul>
      </>
    ),
  },
  Interim: {
    label: "Challenges Encountered and Strategies to Address Them",
    description: (
      <>
        Describe any challenges encountered in implementing planned activities
        and the strategies you have undertaken or plan to mitigate these
        challenges. For each challenge, indicate:
        <ul className="list-disc pl-4 mt-2 space-y-1">
          <li>Nature of the challenge (e.g., delays, resource constraints, external factors)</li>
          <li>Impact on project timelines, deliverables, or budget</li>
          <li>Actions taken or planned to address the challenge</li>
          <li>Outcome of mitigation strategies</li>
        </ul>
      </>
    ),
  },
  Final: {
    label: "Challenges Encountered and Strategies to Address Them",
    description: (
      <>
        Describe any challenges encountered in implementing planned activities
        and the strategies you have undertaken to mitigate these challenges.
        For each challenge, indicate:
        <ul className="list-disc pl-4 mt-2 space-y-1">
          <li>Nature of the challenge (e.g., delays, resource constraints, external factors)</li>
          <li>Impact on project timelines, deliverables, or budget</li>
          <li>Actions taken to address the challenge</li>
          <li>Outcome of mitigation strategies</li>
        </ul>
      </>
    ),
  },
};

const ACHIEVEMENTS_LABELS: Record<ReportType, LabelConfig> = {
  Monthly: {
    label: "Highlights, Achievements, and Notable Progress",
    description: (
      <>
        Please highlight the most significant achievements or developments
        during the reporting period. This section should focus on why the
        progress matters, rather than repeating routine tasks already reported
        in Section I. Content should be selective and value-adding. Examples
        may include (but are not limited to):
        <ul className="list-disc pl-4 mt-2 space-y-1">
          <li>Key research findings or methodological breakthroughs</li>
          <li>Publications, manuscripts, or conference acceptances</li>
          <li>Resolution of major challenges previously reported</li>
        </ul>
      </>
    ),
  },
  Interim: {
    label: "Project Achievements and Success Indicators",
    description: (
      <>
        Outline the main achievements and outputs delivered to date, including
        measurable indicators of success. Examples:
        <ul className="list-disc pl-4 mt-2 space-y-1">
          <li>Key research findings till date</li>
          <li>Publications, presentations, or workshops conducted</li>
          <li>Dissemination, stakeholder engagement or policy influence</li>
          <li>Capacity-building of research staff or Emirati workforce</li>
        </ul>
      </>
    ),
  },
  Final: {
    label: "Project Achievements and Success Indicators",
    description: (
      <>
        Provide a comprehensive summary of outputs and achievements, including:
        <ul className="list-disc pl-4 mt-2 space-y-1">
          <li>Key research findings and contributions</li>
          <li>Publications, conference presentations, and policy briefs</li>
          <li>Stakeholder engagement and dissemination impact</li>
          <li>Capacity-building workshops conducted and Emirati workforce</li>
        </ul>
      </>
    ),
  },
};

const CHANGES_LABELS: Record<ReportType, LabelConfig> = {
  Monthly: {
    label: "Changes in Project Implementation",
    description: null,
  },
  Interim: {
    label: "Changes in Project Implementation",
    description: (
      <>
        If any modifications were made to the proposed timelines, Scope of Work,
        project management, or evaluation strategies, explain here, including:
        <ul className="list-disc pl-4 mt-2 space-y-1">
          <li>Justification for the change</li>
          <li>How the change affects project delivery, outputs, or outcomes</li>
        </ul>
      </>
    ),
  },
  Final: {
    label: "Changes in Project Implementation",
    description: (
      <>
        Explain any modifications made to timelines, Scope of Work, project
        management, or evaluation strategies. Include:
        <ul className="list-disc pl-4 mt-2 space-y-1">
          <li>Justification for changes</li>
          <li>Impacts on deliverables or outcomes</li>
          <li>How changes were managed to ensure project goals were met</li>
        </ul>
      </>
    ),
  },
};

const LESSONS_LEARNED_LABELS: Record<ReportType, LabelConfig> = {
  Monthly: {
    label: "Lessons Learned and Implications",
    description: null,
  },
  Interim: {
    label: "Lessons Learned and Implications",
    description: null,
  },
  Final: {
    label: "Lessons Learned and Implications",
    description: (
      <>
        Reflect on insights gained from the project, including:
        <ul className="list-disc pl-4 mt-2 space-y-1">
          <li>Lessons for improving research processes, collaboration, and methodology</li>
          <li>Implications for the ECD research ecosystem in the UAE</li>
          <li>Recommendations for future research or policy/practice interventions</li>
        </ul>
      </>
    ),
  },
};

const FEEDBACK_LABELS: Record<ReportType, LabelConfig> = {
  Monthly: {
    label: "Feedback (Optional)",
    description: null,
  },
  Interim: {
    label: "Feedback, Reflections, and Dissemination Quote (Optional)",
    description:
      "Provide constructive feedback on the grant management process, ECA research team support, and suggestions for improvement in future grant cycles. Optionally, you may include a short quote about the project for potential dissemination, highlighting the grantees' experience or impact.",
  },
  Final: {
    label: "Feedback, Reflections, and Dissemination Quote (Optional)",
    description: (
      <>
        Provide feedback on the grant management process, ECA research team
        support, and suggestions for future grant cycles. Optionally, include a
        short quote suitable for public dissemination (e.g., social media or
        website), highlighting the project's value or the grantee's experience.
      </>
    ),
  },
};

export interface ReportingDetailsFormProps {
  reportForm: AddReportForm;
  setReportForm: React.Dispatch<React.SetStateAction<AddReportForm>>;
  onSubmit: () => void;
  onCancel: () => void;
  isUploading: boolean;
  isEdit?: boolean;
  /** For edit mode: file handling */
  editingReportId?: string | null;
  reportItems?: ReportItem[];
  /** Research form (needs `startDate` for Interim/Final eligibility) */
  form?: any;
  onUploadFile?: (files: File[], folder: string) => Promise<void>;
  onDeleteFile?: (fileName: string, folder: string) => Promise<void>;
  onUpdateItemFiles?: (
    itemId: string,
    files: { file: File; action: "new" | "existing" | "remove" }[],
  ) => void;
}

export const ReportingDetailsForm: React.FC<ReportingDetailsFormProps> = ({
  reportForm,
  setReportForm,
  onSubmit,
  onCancel,
  isUploading,
  isEdit = false,
  editingReportId = null,
  reportItems = [],
  form,
  onUploadFile,
  onDeleteFile,
  onUpdateItemFiles,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const yearOptions = useMemo(() => generateYearOptions(), []);
  const researchStart =
    form?.startDate instanceof Date
      ? form.startDate
      : form?.startDate
        ? new Date(form.startDate)
        : null;
  const eligibility = useMemo(
    () => getReportTypeEligibility(researchStart),
    [researchStart],
  );
  const reportType = useMemo(
    () => choiceValueToReportType(reportForm.prmtk_reporttype),
    [reportForm.prmtk_reporttype],
  );

  useEffect(() => {
    if (!isEdit && reportForm.prmtk_reporttype === undefined) {
      setReportForm((prev) => ({ ...prev, prmtk_reporttype: 1 }));
    }
  }, [isEdit, reportForm.prmtk_reporttype, setReportForm]);

  useEffect(() => {
    const v = reportForm.prmtk_reporttype;
    if (v === 2 && !eligibility.canSelectInterim) {
      setReportForm((prev) => ({ ...prev, prmtk_reporttype: 1 }));
    } else if (v === 3 && !eligibility.canSelectFinal) {
      setReportForm((prev) => ({ ...prev, prmtk_reporttype: 1 }));
    }
  }, [
    eligibility.canSelectInterim,
    eligibility.canSelectFinal,
    reportForm.prmtk_reporttype,
    setReportForm,
  ]);

  const handleFilesSelect = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    if (
      isEdit &&
      editingReportId &&
      onUploadFile &&
      form?.researchNumber &&
      reportForm.prmtk_reportingyear &&
      reportForm.prmtk_reportingmonth
    ) {
      const reportItem = reportItems.find((r) => r.id === editingReportId);
      if (reportItem) {
        const paddedMonth = reportForm.prmtk_reportingmonth
          .toString()
          .padStart(2, "0");
        const folder = `${form.researchNumber}/Status Reports/${reportForm.prmtk_reportingyear}-${paddedMonth}`;
        await onUploadFile(newFiles, folder);
        const newFilesList = newFiles.map((f) => ({
          file: f,
          action: "existing" as const,
        }));
        const updatedFiles = [...(reportForm.files || []), ...newFilesList];
        setReportForm((prev) => ({ ...prev, files: updatedFiles }));
        if (onUpdateItemFiles && editingReportId) {
          const item = reportItems.find((r) => r.id === editingReportId);
          if (item)
            onUpdateItemFiles(editingReportId, [
              ...(item.files || []),
              ...newFilesList,
            ]);
        }
        return;
      }
    }
    const files = newFiles.map((f) => ({ file: f, action: "new" as const }));
    setReportForm((prev) => ({
      ...prev,
      files: [...(prev.files || []), ...files],
    }));
  };

  const handleFileRemove = async (
    fileKey: string,
    fileItem: { file: File; action: "new" | "existing" | "remove" },
  ) => {
    if (
      fileItem.action === "existing" &&
      onDeleteFile &&
      editingReportId &&
      form?.researchNumber &&
      reportForm.prmtk_reportingyear &&
      reportForm.prmtk_reportingmonth
    ) {
      const paddedMonth = reportForm.prmtk_reportingmonth
        .toString()
        .padStart(2, "0");
      const folder = `${form.researchNumber}/Status Reports/${reportForm.prmtk_reportingyear}-${paddedMonth}`;
      await onDeleteFile(fileItem.file.name, folder);
      if (onUpdateItemFiles && editingReportId) {
        const reportItem = reportItems.find((r) => r.id === editingReportId);
        if (reportItem) {
          const updatedFiles = (reportItem.files || []).filter(
            (f) => getFileKey(f.file) !== fileKey,
          );
          onUpdateItemFiles(editingReportId, updatedFiles);
        }
      }
    }
    setReportForm((prev) => ({
      ...prev,
      files: (prev.files || []).filter(
        (f) => getFileKey(f.file) !== fileKey,
      ),
    }));
  };

  const handleFileDownload = (file: File) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="grid gap-4">
        <div className="sm:max-w-none max-w-2xl">
          <Label className="mb-2 block">Report Type</Label>
          <div
            role="radiogroup"
            aria-label="Report type"
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            <ReportTypeCard
              selected={reportForm.prmtk_reporttype === 1}
              disabled={false}
              title="Monthly Report"
              onSelect={() =>
                setReportForm((prev) => ({ ...prev, prmtk_reporttype: 1 }))
              }
            >
              <p
                className={
                  reportForm.prmtk_reporttype === 1
                    ? "text-sm text-slate-200/90"
                    : "text-sm text-slate-600"
                }
              >
                The last day of each month
              </p>
              <p
                className={
                  reportForm.prmtk_reporttype === 1
                    ? "mt-1 text-sm text-[#fdba74]"
                    : "mt-1 text-sm text-amber-700/90"
                }
              >
                (No later than the 1st day of each month)
              </p>
            </ReportTypeCard>
            <ReportTypeCard
              selected={reportForm.prmtk_reporttype === 2}
              disabled={!eligibility.canSelectInterim}
              title="Interim Report"
              titleMuted={
                reportForm.prmtk_reporttype !== 2 &&
                eligibility.canSelectInterim
              }
              onSelect={() =>
                setReportForm((prev) => ({ ...prev, prmtk_reporttype: 2 }))
              }
              disabledHint="Available from 9 months after the research start date."
            >
              <p className="text-sm">
                <strong>Nine (9) months</strong> after project start date
              </p>
            </ReportTypeCard>
            <ReportTypeCard
              selected={reportForm.prmtk_reporttype === 3}
              disabled={!eligibility.canSelectFinal}
              title="Final Report"
              titleMuted={
                reportForm.prmtk_reporttype !== 3 && eligibility.canSelectFinal
              }
              onSelect={() =>
                setReportForm((prev) => ({ ...prev, prmtk_reporttype: 3 }))
              }
              disabledHint="Available from 18 months after the research start date."
            >
              <p className="text-sm">
                <strong>Eighteen (18) months</strong> after project start date
              </p>
            </ReportTypeCard>
          </div>
          {!researchStart && (
            <p className="mt-2 text-xs text-amber-800">
              Set the research <strong>Start Date</strong> on the main research
              form to unlock Interim and Final report types (based on elapsed
              time).
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="reportTitle">
            Report Title <span className="text-red-500">*</span>
          </Label>
          <TextField
            id="reportTitle"
            value={reportForm.prmtk_reporttitle}
            onChange={(e, newValue) =>
              setReportForm((prev) => ({
                ...prev,
                prmtk_reporttitle: newValue || "",
              }))
            }
            placeholder="e.g., Quarterly Progress Report"
          />
        </div>
        <div>
          <Label htmlFor="reportingYear">
            Reporting Year <span className="text-red-500">*</span>
          </Label>
          <Dropdown
            id="reportingYear"
            placeholder="Select year"
            options={yearOptions}
            selectedKey={reportForm.prmtk_reportingyear || null}
            onChange={(_, option) =>
              setReportForm((prev) => ({
                ...prev,
                prmtk_reportingyear: (option?.key as string) || "",
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor="reportingMonth">
            Reporting Month <span className="text-red-500">*</span>
          </Label>
          <Dropdown
            id="reportingMonth"
            placeholder="Select month"
            options={MONTH_OPTIONS}
            selectedKey={reportForm.prmtk_reportingmonth || null}
            onChange={(_, option) =>
              setReportForm((prev) => ({
                ...prev,
                prmtk_reportingmonth: (option?.key as string) || "",
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor="reportingDate">Reporting Date</Label>
          <TextField
            id="reportingDate"
            value={getTodayDate()}
            readOnly
            disabled
          />
        </div>
        <div>
          <Label htmlFor="budgetSpent">
            Budget Spent (AED) <span className="text-red-500">*</span>
          </Label>
          <TextField
            id="budgetSpent"
            value={reportForm.prmtk_budgetspent}
            onChange={(e, newValue) =>
              setReportForm((prev) => ({
                ...prev,
                prmtk_budgetspent: newValue || "",
              }))
            }
            placeholder="e.g., 25000"
            type="number"
          />
        </div>
        <div>
          <Label htmlFor="healthIndicator">Overall Health</Label>
          <Dropdown
            id="healthIndicator"
            placeholder="Select health indicator"
            options={HEALTH_INDICATOR_OPTIONS}
            selectedKey={reportForm.prmtk_researchhealthindicator || null}
            onChange={(_, option) =>
              setReportForm((prev) => ({
                ...prev,
                prmtk_researchhealthindicator: (option?.key as string) || "",
              }))
            }
            onRenderOption={renderHealthDropdownOption}
            onRenderTitle={renderHealthDropdownTitle}
          />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor="achievements">
              {ACHIEVEMENTS_LABELS[reportType].label}
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex cursor-help text-[#605e5c]"
                  aria-label="Achievements description"
                >
                  <Icon iconName="Info" />
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="max-w-sm whitespace-normal"
              >
                {ACHIEVEMENTS_LABELS[reportType].description}
              </TooltipContent>
            </Tooltip>
          </div>
          <TextField
            id="achievements"
            value={reportForm.prmtk_achievements}
            onChange={(e, newValue) =>
              setReportForm((prev) => ({
                ...prev,
                prmtk_achievements: newValue || "",
              }))
            }
            multiline
            rows={3}
            placeholder="Enter achievements..."
          />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor="challenges">
              {CHALLENGES_LABELS[reportType].label}
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex cursor-help text-[#605e5c]"
                  aria-label="Challenges description"
                >
                  <Icon iconName="Info" />
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="max-w-sm whitespace-normal"
              >
                {CHALLENGES_LABELS[reportType].description}
              </TooltipContent>
            </Tooltip>
          </div>
          <TextField
            id="challenges"
            value={reportForm.prmtk_challenges}
            onChange={(e, newValue) =>
              setReportForm((prev) => ({
                ...prev,
                prmtk_challenges: newValue || "",
              }))
            }
            multiline
            rows={3}
            placeholder="Enter challenges..."
          />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor="keyActivities">
              {KEY_ACTIVITIES_LABELS[reportType].label}
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex cursor-help text-[#605e5c]"
                  aria-label="Key activities description"
                >
                  <Icon iconName="Info" />
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="max-w-sm whitespace-normal"
              >
                {KEY_ACTIVITIES_LABELS[reportType].description}
              </TooltipContent>
            </Tooltip>
          </div>
          <TextField
            id="keyActivities"
            value={reportForm.prmtk_keyactivities}
            onChange={(e, newValue) =>
              setReportForm((prev) => ({
                ...prev,
                prmtk_keyactivities: newValue || "",
              }))
            }
            multiline
            rows={3}
            placeholder="Enter key activities..."
          />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor="upcomingActivities">
              {UPCOMING_ACTIVITIES_LABELS[reportType].label}
            </Label>
            {UPCOMING_ACTIVITIES_LABELS[reportType].description != null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex cursor-help text-[#605e5c]"
                    aria-label="Upcoming activities description"
                  >
                    <Icon iconName="Info" />
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="max-w-sm whitespace-normal"
                >
                  {UPCOMING_ACTIVITIES_LABELS[reportType].description}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <TextField
            id="upcomingActivities"
            value={reportForm.prmtk_upcomingactivities}
            onChange={(e, newValue) =>
              setReportForm((prev) => ({
                ...prev,
                prmtk_upcomingactivities: newValue || "",
              }))
            }
            multiline
            rows={3}
            placeholder="Enter upcoming activities..."
          />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor="changes">
              {CHANGES_LABELS[reportType].label}
            </Label>
            {CHANGES_LABELS[reportType].description != null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex cursor-help text-[#605e5c]"
                    aria-label="Changes description"
                  >
                    <Icon iconName="Info" />
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="max-w-sm whitespace-normal"
                >
                  {CHANGES_LABELS[reportType].description}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <TextField
            id="changes"
            value={reportForm.prmtk_changes}
            onChange={(e, newValue) =>
              setReportForm((prev) => ({
                ...prev,
                prmtk_changes: newValue || "",
              }))
            }
            multiline
            rows={3}
            placeholder="Enter changes in project implementation..."
          />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor="lessonsLearned">
              {LESSONS_LEARNED_LABELS[reportType].label}
            </Label>
            {LESSONS_LEARNED_LABELS[reportType].description != null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex cursor-help text-[#605e5c]"
                    aria-label="Lessons learned description"
                  >
                    <Icon iconName="Info" />
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="max-w-sm whitespace-normal"
                >
                  {LESSONS_LEARNED_LABELS[reportType].description}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <TextField
            id="lessonsLearned"
            value={reportForm.prmtk_lessonslearnedandimplications}
            onChange={(e, newValue) =>
              setReportForm((prev) => ({
                ...prev,
                prmtk_lessonslearnedandimplications: newValue || "",
              }))
            }
            multiline
            rows={3}
            placeholder="Enter lessons learned and implications..."
          />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor="feedback">
              {FEEDBACK_LABELS[reportType].label}
            </Label>
            {FEEDBACK_LABELS[reportType].description != null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex cursor-help text-[#605e5c]"
                    aria-label="Feedback description"
                  >
                    <Icon iconName="Info" />
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="max-w-sm whitespace-normal"
                >
                  {FEEDBACK_LABELS[reportType].description}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <TextField
            id="feedback"
            value={reportForm.prmtk_feedback}
            onChange={(e, newValue) =>
              setReportForm((prev) => ({
                ...prev,
                prmtk_feedback: newValue || "",
              }))
            }
            multiline
            rows={3}
            placeholder="Enter feedback (optional)..."
          />
        </div>
        <div>
          <Label htmlFor="journalPublications">Journal Publications</Label>
          <TextField
            id="journalPublications"
            value={reportForm.prmtk_journalpublications}
            onChange={(e, newValue) =>
              setReportForm((prev) => ({
                ...prev,
                prmtk_journalpublications: newValue || "",
              }))
            }
            multiline
            rows={3}
            placeholder="Enter journal publications..."
          />
        </div>
        <div>
          <Label htmlFor="workforceDevelopment">Workforce Development</Label>
          <TextField
            id="workforceDevelopment"
            value={reportForm.prmtk_workforcedevelopment}
            onChange={(e, newValue) =>
              setReportForm((prev) => ({
                ...prev,
                prmtk_workforcedevelopment: newValue || "",
              }))
            }
            multiline
            rows={3}
            placeholder="Enter workforce development..."
          />
        </div>
        <div>
          <Label>Supporting Documents</Label>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            multiple
            onChange={(e) => {
              if (e.target.files)
                handleFilesSelect(Array.from(e.target.files));
            }}
          />
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#c77946] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon
              iconName="CloudUpload"
              className="text-4xl text-gray-400 mb-2"
            />
            <p className="text-sm text-gray-600">
              Click to upload files or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">Multiple files allowed</p>
          </div>
          {reportForm.files &&
            reportForm.files.filter((f) => f.action !== "remove").length >
              0 && (
              <div className="mt-4 space-y-2">
                {reportForm.files
                  .filter((f) => f.action !== "remove")
                  .map((fileItem) => {
                    const key = getFileKey(fileItem.file);
                    const isExisting = fileItem.action === "existing";
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            iconName="Page"
                            className="text-[#c77946]"
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {fileItem.file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(fileItem.file.size)}
                              {isExisting && (
                                <span className="ml-2 text-blue-600">
                                  (Uploaded)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {isExisting && (
                            <IconButton
                              iconProps={{ iconName: "Download" }}
                              onClick={() =>
                                handleFileDownload(fileItem.file)
                              }
                              title="Download file"
                              ariaLabel="Download file"
                            />
                          )}
                          <IconButton
                            iconProps={{ iconName: "Delete" }}
                            onClick={() =>
                              handleFileRemove(key, fileItem)
                            }
                            title="Remove file"
                            ariaLabel="Remove file"
                            styles={popupInputStyles.deleteButton}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
        </div>
      </div>
      <div className="flex gap-3 pt-4">
        <PrimaryButton
          onClick={onSubmit}
          text={isEdit ? "Update" : "Add"}
          disabled={isUploading}
          styles={popupInputStyles.researchPrimaryButton}
        />
        <DefaultButton
          onClick={onCancel}
          text="Cancel"
          disabled={isUploading}
          styles={popupInputStyles.researchSecondaryButton}
        />
      </div>
    </div>
  );
};
