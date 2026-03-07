import * as React from "react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Reveal from "@/motion/Reveal";
import { IconButton } from "@fluentui/react/lib/Button";
import { PrimaryButton } from "@fluentui/react/lib/Button";
import { Icon } from "@fluentui/react/lib/Icon";
import { aedFormat, getFileKey } from "@/services/utility";
import { HEADING_TEXT } from "@/styles/constants";
import { popupInputStyles } from "@/styles/popupInputStyles";

export interface ReportItem {
  id?: string;
  prmtk_reporttitle: string;
  prmtk_reportingyear: string;
  prmtk_reportingmonth: string;
  reportingDate: string;
  prmtk_budgetspent: number;
  prmtk_researchhealthindicator?: number;
  prmtk_achievements?: string;
  prmtk_challenges?: string;
  prmtk_keyactivities?: string;
  prmtk_upcomingactivities?: string;
  prmtk_journalpublications?: string;
  prmtk_workforcedevelopment?: string;
  prmtk_changes?: string;
  prmtk_lessonslearnedandimplications?: string;
  prmtk_feedback?: string;
  files?: { file: File; action: "new" | "existing" | "remove" }[];
  action?: "new" | "existing" | "remove";
}

export interface AddReportForm {
  prmtk_reporttitle: string;
  prmtk_reportingyear: string;
  prmtk_reportingmonth: string;
  prmtk_budgetspent: string;
  prmtk_researchhealthindicator: string;
  prmtk_achievements: string;
  prmtk_challenges: string;
  prmtk_keyactivities: string;
  prmtk_upcomingactivities: string;
  prmtk_journalpublications: string;
  prmtk_workforcedevelopment: string;
  prmtk_changes: string;
  prmtk_lessonslearnedandimplications: string;
  prmtk_feedback: string;
  files?: { file: File; action: "new" | "existing" | "remove" }[];
}

interface ReportingSectionProps {
  reportItems: ReportItem[];
  onAddReportItem: (item: AddReportForm) => void;
  onRemoveReportItem: (id: string) => void;
  onEditReportItem: (id: string, item: AddReportForm) => void;
  onDeleteFile?: (fileName: string, folder: string) => Promise<void>;
  onUploadFile?: (files: File[], folder: string) => Promise<void>;
  onUpdateItemFiles?: (
    itemId: string,
    files: { file: File; action: "new" | "existing" | "remove" }[],
  ) => void;
  form: any;
  edit?: boolean;
}

export const INITIAL_REPORT_FORM: AddReportForm = {
  prmtk_reporttitle: "",
  prmtk_reportingyear: "",
  prmtk_reportingmonth: "",
  prmtk_budgetspent: "",
  prmtk_researchhealthindicator: "",
  prmtk_achievements: "",
  prmtk_challenges: "",
  prmtk_keyactivities: "",
  prmtk_upcomingactivities: "",
  prmtk_journalpublications: "",
  prmtk_workforcedevelopment: "",
  prmtk_changes: "",
  prmtk_lessonslearnedandimplications: "",
  prmtk_feedback: "",
  files: [],
};

// Helper to get health indicator text
const getHealthIndicatorText = (value: number | string | undefined): string => {
  if (!value) return "-";
  const numValue = typeof value === "string" ? parseInt(value) : value;
  switch (numValue) {
    case 1:
      return "Healthy (Green)";
    case 2:
      return "Challenging (Orange)";
    case 3:
      return "Risky (Red)";
    default:
      return "-";
  }
};

// Helper function to format date for display (only date part)
const formatDateOnly = (dateString: string): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  } catch {
    return dateString;
  }
};

export const ReportingSection: React.FC<ReportingSectionProps> = ({
  reportItems,
  onAddReportItem,
  onRemoveReportItem,
  onEditReportItem,
  onDeleteFile,
  onUploadFile,
  onUpdateItemFiles,
  form,
  edit = true,
}) => {
  const [showSection, setShowSection] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const buildReportingUrl = (path: string) => {
    const base = `/applyresearch/${path}`;
    const q = searchParams.toString();
    return q ? `${base}?${q}` : base;
  };

  const totalBudgetSpent = reportItems
    .filter((r) => r.action !== "remove")
    .reduce((sum, r) => sum + (r.prmtk_budgetspent || 0), 0);

  return (
    <div className="mt-8 rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between min-h-[52px]">
        <h2 className={HEADING_TEXT}>Reporting Details</h2>
        <IconButton
          iconProps={{
            iconName: showSection ? "ChevronUp" : "ChevronDown",
          }}
          onClick={() => setShowSection((prev) => !prev)}
          ariaLabel="Toggle reporting section"
        />
      </div>
      
        {showSection && (
          <Reveal className="mt-8">
          <div style={{ marginTop: "20px" }}>
            <div className="flex items-center justify-end mb-4">
              {edit && (
                <PrimaryButton
                  onClick={() => navigate(buildReportingUrl("reporting/add"))}
                  disabled={form.type === "view"}
                  styles={popupInputStyles.researchPrimaryButton}
                >
                  Add Report
                </PrimaryButton>
              )}
            </div>

            <div className="rounded-lg border border-[#e2e8f0] overflow-hidden shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-[#1D2054]">
                  <tr className="text-left">
                    <th className="px-6 py-3 font-semibold text-white">
                      Report Title
                    </th>
                    <th className="px-6 py-3 font-semibold text-white">
                      Reporting Year
                    </th>
                    <th className="px-6 py-3 font-semibold text-white">
                      Reporting Month
                    </th>
                    <th className="px-6 py-3 font-semibold text-white">
                      Overall Health
                    </th>
                    <th className="px-6 py-3 font-semibold text-white">
                      Attachments
                    </th>
                    {edit && (
                      <th className="px-6 py-3 font-semibold text-white text-right">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reportItems.map((item, index) => (
                    <tr
                      key={item.id || index}
                      className={`border-t border-[#e2e8f0] transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                      } hover:bg-[#f0f4f8]`}
                    >
                      <td className="px-6 py-3 font-medium text-[#1e293b]">
                        {item.prmtk_reporttitle}
                      </td>
                      <td className="px-6 py-3 text-[#475569]">
                        {item.prmtk_reportingyear}
                      </td>
                      <td className="px-6 py-3 text-[#475569]">
                        {item.prmtk_reportingmonth}
                      </td>
                      <td className="px-6 py-3 text-[#475569]">
                        {getHealthIndicatorText(
                          item.prmtk_researchhealthindicator,
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {item.files && item.files.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {item.files.map((fileItem, fileIdx) => {
                              const key = getFileKey(fileItem.file);
                              return (
                                <a
                                  key={key || fileIdx}
                                  href={URL.createObjectURL(fileItem.file)}
                                  download={fileItem.file.name}
                                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline text-xs"
                                  title={`Download ${fileItem.file.name}`}
                                >
                                  <Icon iconName="CloudDownload" />
                                  <span className="truncate max-w-[150px]">
                                    {fileItem.file.name}
                                  </span>
                                </a>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            No files
                          </span>
                        )}
                      </td>
                      {edit && (
                        <td className="px-6 py-3 text-right">
                          {item.action === "remove" ? (
                            <span className="text-[#94a3b8] line-through">
                              Removed
                            </span>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <IconButton
                                disabled={
                                  form.type === "view" || !item.id
                                }
                                onClick={() =>
                                  item.id &&
                                  navigate(
                                    buildReportingUrl(
                                      `reporting/edit/${item.id}`,
                                    ),
                                  )
                                }
                                iconProps={{ iconName: "Edit" }}
                                title="Edit"
                                ariaLabel="Edit"
                                styles={popupInputStyles.editButton}
                              />
                              <IconButton
                                disabled={form.type === "view"}
                                onClick={() => onRemoveReportItem(item.id)}
                                iconProps={{ iconName: "Delete" }}
                                title="Remove"
                                ariaLabel="Remove"
                                styles={popupInputStyles.deleteButton}
                              />
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {reportItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={edit ? 6 : 5}
                        className="px-6 py-8 text-center text-[#94a3b8]"
                      >
                        No reports added.
                      </td>
                    </tr>
                  )}
                </tbody>
                {/* <tfoot className="bg-[#f6e4d8]">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-2 font-semibold text-[#2b201a]"
                    >
                      Total Budget Spent
                    </td>
                    <td className="px-4 py-2 font-semibold text-[#2b201a]">
                      {aedFormat(totalBudgetSpent)}
                    </td>
                    <td colSpan={edit ? 3 : 2}></td>
                  </tr>
                </tfoot> */}
              </table>
            </div>
          </div>
          </Reveal>
        )}
      
    </div>
  );
};
