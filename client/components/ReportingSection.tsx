import * as React from "react";
import { useMemo, useState, useRef } from "react";
import Reveal from "@/motion/Reveal";
import { toast } from "@/ui/use-toast";
import {
  Dialog as FluentDialog,
  DialogFooter as FluentDialogFooter,
  DialogType,
} from "@fluentui/react/lib/Dialog";
import { PrimaryButton, DefaultButton } from "@fluentui/react/lib/Button";
import { Label } from "@fluentui/react/lib/Label";
import { Dropdown, IDropdownOption } from "@fluentui/react/lib/Dropdown";
import { TextField } from "@fluentui/react/lib/TextField";
import { IconButton } from "@fluentui/react/lib/Button";
import { Icon } from "@fluentui/react/lib/Icon";
import { aedFormat, getFileKey } from "@/services/utility";
import { HEADING_TEXT } from "@/styles/constants";

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
  files?: { file: File; action: "new" | "existing" | "remove" }[];
  action?: "new" | "existing" | "remove";
}

interface AddReportForm {
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

const INITIAL_REPORT_FORM: AddReportForm = {
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
  files: [],
};

// Generate year options dynamically (current year to 4 years from now)
const generateYearOptions = (): IDropdownOption[] => {
  const currentYear = new Date().getFullYear();
  const years: IDropdownOption[] = [];
  for (let i = 0; i <= 4; i++) {
    const year = currentYear + i;
    years.push({ key: year.toString(), text: year.toString() });
  }
  return years;
};

// Month options with numeric keys
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
  { key: "1", text: "Healthy (Green)" },
  { key: "2", text: "Challenging (Orange)" },
  { key: "3", text: "Risky (Red)" },
];

// Helper to get month name from number
const getMonthName = (monthNumber: string | number): string => {
  const monthNames = [
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
  const index =
    typeof monthNumber === "string" ? parseInt(monthNumber) : monthNumber;
  return monthNames[index - 1] || monthNumber.toString();
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

// Helper function to format today's date
const getTodayDate = (): string => {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
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
  const [showSection, setShowSection] = useState(true);
  const [reportForm, setReportForm] =
    useState<AddReportForm>(INITIAL_REPORT_FORM);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const yearOptions = useMemo(() => generateYearOptions(), []);

  const handleAddReport = () => {
    const reportTitle = reportForm.prmtk_reporttitle.trim();
    const budgetSpent = parseFloat(reportForm.prmtk_budgetspent);

    if (
      !reportTitle ||
      !reportForm.prmtk_reportingyear ||
      !reportForm.prmtk_reportingmonth ||
      !reportForm.prmtk_budgetspent ||
      isNaN(budgetSpent)
    ) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
      });
      return;
    }

    if (editingReportId) {
      onEditReportItem(editingReportId, reportForm);
    } else {
      onAddReportItem(reportForm);
    }

    setReportForm(INITIAL_REPORT_FORM);
    setIsDialogOpen(false);
    setEditingReportId(null);
  };

  const openEditDialog = (item: ReportItem) => {
    setReportForm({
      prmtk_reporttitle: item.prmtk_reporttitle || "",
      prmtk_reportingyear: item.prmtk_reportingyear
        ? item.prmtk_reportingyear.toString()
        : "",
      prmtk_reportingmonth: item.prmtk_reportingmonth
        ? item.prmtk_reportingmonth.toString()
        : "",
      prmtk_budgetspent:
        item.prmtk_budgetspent != null ? item.prmtk_budgetspent.toString() : "",
      prmtk_researchhealthindicator: item.prmtk_researchhealthindicator
        ? item.prmtk_researchhealthindicator.toString()
        : "",
      prmtk_achievements: item.prmtk_achievements || "",
      prmtk_challenges: item.prmtk_challenges || "",
      prmtk_keyactivities: item.prmtk_keyactivities || "",
      prmtk_upcomingactivities: item.prmtk_upcomingactivities || "",
      prmtk_journalpublications: item.prmtk_journalpublications || "",
      prmtk_workforcedevelopment: item.prmtk_workforcedevelopment || "",
      files: item.files || [],
    });
    setEditingReportId(item.id);
    setIsDialogOpen(true);
  };

  const handleFilesSelect = async (newFiles: File[]) => {
    if (newFiles.length > 0) {
      // If editing and onUploadFile is available, upload immediately
      if (editingReportId && onUploadFile) {
        const reportItem = reportItems.find((r) => r.id === editingReportId);
        if (
          reportItem &&
          form.researchNumber &&
          reportItem.prmtk_reportingyear &&
          reportItem.prmtk_reportingmonth
        ) {
          setIsUploading(true);
          try {
            const paddedMonth = reportItem.prmtk_reportingmonth
              .toString()
              .padStart(2, "0");
            const folder = `${form.researchNumber}/Status Reports/${reportItem.prmtk_reportingyear}-${paddedMonth}`;
            await onUploadFile(newFiles, folder);

            // Update form state with new files
            const newFilesList = newFiles.map((f) => ({
              file: f,
              action: "existing" as const,
            }));
            const updatedFiles = [...(reportForm.files || []), ...newFilesList];
            setReportForm({
              ...reportForm,
              files: updatedFiles,
            });

            // Update parent form state
            if (onUpdateItemFiles && editingReportId) {
              const reportItem = reportItems.find(
                (r) => r.id === editingReportId,
              );
              if (reportItem) {
                const allFiles = [...(reportItem.files || []), ...newFilesList];
                onUpdateItemFiles(editingReportId, allFiles);
              }
            }

            toast({
              title: "Success",
              description: "Files uploaded successfully.",
            });
          } catch (error) {
            toast({
              title: "Error",
              description: "Failed to upload files.",
              variant: "destructive",
            });
            setIsUploading(false);
            return;
          } finally {
            setIsUploading(false);
          }
        }
      }

      const files = newFiles.map((f) => ({ file: f, action: "new" as const }));
      setReportForm({
        ...reportForm,
        files: [...(reportForm.files || []), ...files],
      });
    }
  };

  const handleFileRemove = async (
    fileKey: string,
    fileItem: { file: File; action: "new" | "existing" | "remove" },
  ) => {
    // If it's an existing file, delete it from SharePoint immediately
    if (fileItem.action === "existing" && onDeleteFile && editingReportId) {
      const reportItem = reportItems.find((r) => r.id === editingReportId);
      if (
        reportItem &&
        form.researchNumber &&
        reportItem.prmtk_reportingyear &&
        reportItem.prmtk_reportingmonth
      ) {
        setIsUploading(true);
        try {
          const paddedMonth = reportItem.prmtk_reportingmonth
            .toString()
            .padStart(2, "0");
          const folder = `${form.researchNumber}/Status Reports/${reportItem.prmtk_reportingyear}-${paddedMonth}`;
          await onDeleteFile(fileItem.file.name, folder);

          // Update parent form state
          if (onUpdateItemFiles && editingReportId) {
            const reportItem = reportItems.find(
              (r) => r.id === editingReportId,
            );
            if (reportItem) {
              const updatedFiles = (reportItem.files || []).filter(
                (f) => getFileKey(f.file) !== fileKey,
              );
              onUpdateItemFiles(editingReportId, updatedFiles);
            }
          }

          toast({
            title: "Success",
            description: "File deleted successfully.",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to delete file.",
            variant: "destructive",
          });
          return; // Don't remove from UI if deletion failed
        } finally {
          setIsUploading(false);
        }
      }
    }

    // Remove from form state
    setReportForm({
      ...reportForm,
      files: (reportForm.files || []).filter(
        (f) => getFileKey(f.file) !== fileKey,
      ),
    });
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

  const totalBudgetSpent = reportItems
    .filter((r) => r.action !== "remove")
    .reduce((sum, r) => sum + (r.prmtk_budgetspent || 0), 0);

  return (
    <div className="mt-8 rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className={HEADING_TEXT}>Reporting Details</h2>
        <IconButton
          iconProps={{
            iconName: showSection ? "ChevronUp" : "ChevronDown",
          }}
          onClick={() => setShowSection((prev) => !prev)}
          ariaLabel="Toggle reporting section"
        />
      </div>
      <Reveal className="mt-8">
        {showSection && (
          <div style={{ marginTop: "20px" }}>
            <div className="flex items-center justify-end mb-4">
              {edit && (
                <PrimaryButton
                  onClick={() => {
                    const now = new Date();
                    setReportForm({
                      ...INITIAL_REPORT_FORM,
                      prmtk_reportingyear: now.getFullYear().toString(),
                      prmtk_reportingmonth: (now.getMonth() + 1).toString(),
                    });
                    setEditingReportId(null);
                    setIsDialogOpen(true);
                  }}
                  disabled={form.type === "view"}
                >
                  Add Report
                </PrimaryButton>
              )}
            </div>

            <FluentDialog
              hidden={!isDialogOpen}
              onDismiss={() => {
                setIsDialogOpen(false);
                setEditingReportId(null);
                setReportForm(INITIAL_REPORT_FORM);
              }}
              dialogContentProps={{
                type: DialogType.normal,
                title: editingReportId ? "Edit Report" : "Add Report",
                subText: "Enter the report details.",
              }}
              modalProps={{ isBlocking: false }}
              minWidth={"50vw"}
            >
              <div className="grid gap-4 py-2">
                <div>
                  <Label htmlFor="reportTitle">
                    Report Title <span className="text-red-500">*</span>
                  </Label>
                  <TextField
                    id="reportTitle"
                    value={reportForm.prmtk_reporttitle}
                    onChange={(e, newValue) =>
                      setReportForm({
                        ...reportForm,
                        prmtk_reporttitle: newValue || "",
                      })
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
                      setReportForm({
                        ...reportForm,
                        prmtk_reportingyear: (option?.key as string) || "",
                      })
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
                      setReportForm({
                        ...reportForm,
                        prmtk_reportingmonth: (option?.key as string) || "",
                      })
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
                      setReportForm({
                        ...reportForm,
                        prmtk_budgetspent: newValue || "",
                      })
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
                    selectedKey={
                      reportForm.prmtk_researchhealthindicator || null
                    }
                    onChange={(_, option) =>
                      setReportForm({
                        ...reportForm,
                        prmtk_researchhealthindicator:
                          (option?.key as string) || "",
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="achievements">Achievements</Label>
                  <TextField
                    id="achievements"
                    value={reportForm.prmtk_achievements}
                    onChange={(e, newValue) =>
                      setReportForm({
                        ...reportForm,
                        prmtk_achievements: newValue || "",
                      })
                    }
                    multiline
                    rows={3}
                    placeholder="Enter achievements..."
                  />
                </div>
                <div>
                  <Label htmlFor="challenges">Challenges</Label>
                  <TextField
                    id="challenges"
                    value={reportForm.prmtk_challenges}
                    onChange={(e, newValue) =>
                      setReportForm({
                        ...reportForm,
                        prmtk_challenges: newValue || "",
                      })
                    }
                    multiline
                    rows={3}
                    placeholder="Enter challenges..."
                  />
                </div>
                <div>
                  <Label htmlFor="keyActivities">
                    Key Activities (this Period)
                  </Label>
                  <TextField
                    id="keyActivities"
                    value={reportForm.prmtk_keyactivities}
                    onChange={(e, newValue) =>
                      setReportForm({
                        ...reportForm,
                        prmtk_keyactivities: newValue || "",
                      })
                    }
                    multiline
                    rows={3}
                    placeholder="Enter key activities..."
                  />
                </div>
                <div>
                  <Label htmlFor="upcomingActivities">
                    Upcoming Activities (Next Period)
                  </Label>
                  <TextField
                    id="upcomingActivities"
                    value={reportForm.prmtk_upcomingactivities}
                    onChange={(e, newValue) =>
                      setReportForm({
                        ...reportForm,
                        prmtk_upcomingactivities: newValue || "",
                      })
                    }
                    multiline
                    rows={3}
                    placeholder="Enter upcoming activities..."
                  />
                </div>
                <div>
                  <Label htmlFor="journalPublications">
                    Journal Publications
                  </Label>
                  <TextField
                    id="journalPublications"
                    value={reportForm.prmtk_journalpublications}
                    onChange={(e, newValue) =>
                      setReportForm({
                        ...reportForm,
                        prmtk_journalpublications: newValue || "",
                      })
                    }
                    multiline
                    rows={3}
                    placeholder="Enter journal publications..."
                  />
                </div>
                <div>
                  <Label htmlFor="workforceDevelopment">
                    Workforce Development
                  </Label>
                  <TextField
                    id="workforceDevelopment"
                    value={reportForm.prmtk_workforcedevelopment}
                    onChange={(e, newValue) =>
                      setReportForm({
                        ...reportForm,
                        prmtk_workforcedevelopment: newValue || "",
                      })
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
                      if (e.target.files) {
                        handleFilesSelect(Array.from(e.target.files));
                      }
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
                    <p className="text-xs text-gray-500 mt-1">
                      Multiple files allowed
                    </p>
                  </div>
                  {reportForm.files &&
                    reportForm.files.filter((f) => f.action !== "remove")
                      .length > 0 && (
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
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                </div>
              </div>
              <FluentDialogFooter>
                <PrimaryButton
                  onClick={handleAddReport}
                  text={editingReportId ? "Update" : "Add"}
                  disabled={isUploading}
                />
                <DefaultButton
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingReportId(null);
                    setReportForm(INITIAL_REPORT_FORM);
                  }}
                  text="Cancel"
                  disabled={isUploading}
                />
              </FluentDialogFooter>
            </FluentDialog>

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
                      Reporting Date
                    </th>
                    <th className="px-6 py-3 font-semibold text-white">
                      Budget Spent (AED)
                    </th>
                    <th className="px-6 py-3 font-semibold text-white">
                      Overall Health
                    </th>
                    <th className="px-6 py-3 font-semibold text-white">
                      Achievements
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
                    <tr key={item.id || index} className={`border-t border-[#e2e8f0] transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'
                      } hover:bg-[#f0f4f8]`}>
                      <td className="px-6 py-3 font-medium text-[#1e293b]">
                        {item.prmtk_reporttitle}
                      </td>
                      <td className="px-6 py-3 text-[#475569]">{item.prmtk_reportingyear}</td>
                      <td className="px-6 py-3 text-[#475569]">{item.prmtk_reportingmonth}</td>
                      <td className="px-6 py-3 text-[#475569]">
                        {formatDateOnly(item.reportingDate)}
                      </td>
                      <td className="px-6 py-3 font-medium text-[#1e293b]">
                        {aedFormat(item.prmtk_budgetspent || 0)}
                      </td>
                      <td className="px-6 py-3 text-[#475569]">
                        {getHealthIndicatorText(
                          item.prmtk_researchhealthindicator,
                        )}
                      </td>
                      <td className="px-6 py-3 text-[#475569]">
                        {item.prmtk_achievements ? (
                          <div
                            className="max-w-xs truncate"
                            title={item.prmtk_achievements}
                          >
                            {item.prmtk_achievements}
                          </div>
                        ) : (
                          "-"
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
                                disabled={form.type === "view"}
                                onClick={() => openEditDialog(item)}
                                iconProps={{ iconName: "Edit" }}
                                title="Edit"
                                ariaLabel="Edit"
                                styles={{
                                  root: {
                                    color: '#1D2054',
                                  },
                                  rootDisabled: {
                                    color: '#cbd5e1',
                                  },
                                }}
                              />
                              <IconButton
                                disabled={form.type === "view"}
                                onClick={() => onRemoveReportItem(item.id)}
                                iconProps={{ iconName: "Delete" }}
                                title="Remove"
                                ariaLabel="Remove"
                                styles={{
                                  root: {
                                    color: '#dc2626',
                                  },
                                  rootDisabled: {
                                    color: '#cbd5e1',
                                  },
                                }}
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
                        colSpan={edit ? 9 : 8}
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
        )}
      </Reveal>
    </div>
  );
};
