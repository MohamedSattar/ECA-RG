import * as React from "react";
import { useState, useRef } from "react";
import Reveal from "@/motion/Reveal";
import { toast } from "@/ui/use-toast";
import {
  Dialog as FluentDialog,
  DialogFooter as FluentDialogFooter,
  DialogType,
} from "@fluentui/react/lib/Dialog";
import { PrimaryButton, DefaultButton } from "@fluentui/react/lib/Button";
import { Label } from "@fluentui/react/lib/Label";
import { TextField } from "@fluentui/react/lib/TextField";
import { DatePicker } from "@fluentui/react/lib/DatePicker";
import { IconButton } from "@fluentui/react/lib/Button";
import { Icon } from "@fluentui/react/lib/Icon";
import { Dropdown, IDropdownOption } from "@fluentui/react/lib/Dropdown";
import { getFileKey } from "@/services/utility";
import { HEADING_TEXT } from "@/styles/constants";
import {
  popupInputStyles,
  popupLabelClass,
  popupFormGridClass,
  popupUploadZoneClass,
  popupFileItemClass,
  popupFieldWrapperClass,
} from "@/styles/popupInputStyles";

export interface DisseminationActivity {
  id: string;
  name: string;
  presenter: string;
  date: string;
  type: number;
  materialsUsed: string | null;
  files?: { file: File; action: "new" | "existing" | "remove" }[];
}

export interface AddDisseminationActivityForm {
  name: string;
  presenter: string;
  date: string;
  type: string;
  materialsUsed: string;
  files?: { file: File; action: "new" | "existing" | "remove" }[];
}

interface DisseminationActivitiesSectionProps {
  activities: DisseminationActivity[];
  onAddActivity: (item: AddDisseminationActivityForm) => void;
  onRemoveActivity: (id: string) => void;
  onEditActivity: (id: string, item: AddDisseminationActivityForm) => void;
  onDeleteFile?: (fileName: string, folder: string) => Promise<void>;
  onUploadFile?: (files: File[], folder: string) => Promise<void>;
  onUpdateItemFiles?: (
    itemId: string,
    files: { file: File; action: "new" | "existing" | "remove" }[],
  ) => void;
  form: any;
  edit?: boolean;
}

const INITIAL_ACTIVITY_FORM: AddDisseminationActivityForm = {
  name: "",
  presenter: "",
  date: "",
  type: "",
  materialsUsed: "",
  files: [],
};

const ACTIVITY_TYPE_OPTIONS: IDropdownOption[] = [
  { key: 1, text: "International" },
  { key: 2, text: "Local" },
  { key: 3, text: "Regional" },
  { key: 4, text: "Conference (or Symposium)" },
  { key: 5, text: "Webinar" },
  { key: 6, text: "Forum" },
  { key: 7, text: "Newsletter" },
  { key: 8, text: "Workshop" },
  { key: 9, text: "Local Stakeholder\\Academic Presentation" },
  { key: 10, text: "Other" },
];

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

const getTypeLabel = (typeValue: number): string => {
  const opt = ACTIVITY_TYPE_OPTIONS.find((o) => o.key === typeValue);
  return opt?.text ?? String(typeValue);
};

export const DisseminationActivitiesSection: React.FC<
  DisseminationActivitiesSectionProps
> = ({
  activities,
  onAddActivity,
  onRemoveActivity,
  onEditActivity,
  onDeleteFile,
  onUploadFile,
  onUpdateItemFiles,
  form,
  edit = true,
}) => {
  const [showSection, setShowSection] = useState(true);
  const [activityForm, setActivityForm] =
    useState<AddDisseminationActivityForm>(INITIAL_ACTIVITY_FORM);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dateToString = (d: Date | null | undefined): string => {
    if (!d) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const stringToDate = (s: string): Date | undefined => {
    if (!s) return undefined;
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : d;
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

  const getActivityFolder = (activityId: string, activityName: string) => {
    const researchNumber = form.researchNumber;
    if (!researchNumber || !activityId || !activityName) return null;
    const sanitized = activityName.replace(/[<>:"/\\|?*]/g, "-");
    return `${researchNumber}/Dissemination Activities/${sanitized}-${activityId}`;
  };

  const handleFilesSelect = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    if (editingActivityId && onUploadFile) {
      const activity = activities.find((a) => a.id === editingActivityId);
      const folder = activity
        ? getActivityFolder(editingActivityId, activity.name)
        : null;
      if (activity && folder && form.researchNumber) {
        setIsUploading(true);
        try {
          await onUploadFile(newFiles, folder);
          const newFilesList = newFiles.map((f) => ({
            file: f,
            action: "existing" as const,
          }));
          const updatedFiles = [
            ...(activityForm.files || []),
            ...newFilesList,
          ];
          setActivityForm((prev) => ({ ...prev, files: updatedFiles }));
          if (onUpdateItemFiles && editingActivityId) {
            const allFiles = [
              ...(activity.files || []),
              ...newFilesList,
            ];
            onUpdateItemFiles(editingActivityId, allFiles);
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
        } finally {
          setIsUploading(false);
          return;
        }
      }
    }
    const files = newFiles.map((f) => ({ file: f, action: "new" as const }));
    setActivityForm((prev) => ({
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
      editingActivityId
    ) {
      const activity = activities.find((a) => a.id === editingActivityId);
      const folder = activity
        ? getActivityFolder(editingActivityId, activity.name)
        : null;
      if (activity && folder && form.researchNumber) {
        setIsUploading(true);
        try {
          await onDeleteFile(fileItem.file.name, folder);
          if (onUpdateItemFiles && editingActivityId) {
            const updatedFiles = (activity.files || []).filter(
              (f) => getFileKey(f.file) !== fileKey,
            );
            onUpdateItemFiles(editingActivityId, updatedFiles);
          }
          setActivityForm((prev) => ({
            ...prev,
            files: (prev.files || []).filter(
              (f) => getFileKey(f.file) !== fileKey,
            ),
          }));
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
        } finally {
          setIsUploading(false);
          return;
        }
      }
    }
    setActivityForm((prev) => ({
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

  const handleAddActivity = () => {
    const name = activityForm.name.trim();

    if (!name) {
      toast({
        title: "Missing information",
        description: "Please enter the activity name (Event Name).",
      });
      return;
    }

    if (editingActivityId) {
      onEditActivity(editingActivityId, activityForm);
    } else {
      onAddActivity(activityForm);
    }

    setActivityForm(INITIAL_ACTIVITY_FORM);
    setIsDialogOpen(false);
    setEditingActivityId(null);
  };

  const openEditDialog = (item: DisseminationActivity) => {
    setActivityForm({
      name: item.name,
      presenter: item.presenter,
      date: item.date ? formatDateOnly(item.date) : "",
      type: item.type != null ? String(item.type) : "",
      materialsUsed: item.materialsUsed || "",
      files: item.files || [],
    });
    setEditingActivityId(item.id);
    setIsDialogOpen(true);
  };

  return (
    <div className="mt-8 rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className={HEADING_TEXT}>Dissemination Activities</h2>
        <IconButton
          iconProps={{
            iconName: showSection ? "ChevronUp" : "ChevronDown",
          }}
          onClick={() => setShowSection((prev) => !prev)}
          ariaLabel="Toggle dissemination activities section"
        />
      </div>
      <Reveal className="mt-8">
        {showSection && (
          <div style={{ marginTop: "20px" }}>
            <div className="flex items-center justify-end mb-4">
              {edit && (
                <PrimaryButton
                  onClick={() => {
                    setActivityForm({ ...INITIAL_ACTIVITY_FORM, files: [] });
                    setEditingActivityId(null);
                    setIsDialogOpen(true);
                  }}
                  disabled={form.type === "view"}
                >
                  Add Dissemination Activity
                </PrimaryButton>
              )}
            </div>

            <FluentDialog
              hidden={!isDialogOpen}
              onDismiss={() => {
                setIsDialogOpen(false);
                setEditingActivityId(null);
                setActivityForm({ ...INITIAL_ACTIVITY_FORM, files: [] });
              }}
              dialogContentProps={{
                type: DialogType.normal,
                title: editingActivityId
                  ? "Edit Dissemination Activity"
                  : "Add Dissemination Activity",
                subText: "Enter the dissemination activity details.",
              }}
              modalProps={{ isBlocking: false }}
              minWidth={"50vw"}
            >
              <div className={popupFormGridClass}>
                <div>
                  <Label className={popupLabelClass} htmlFor="activityName">
                    Event Name <span className="text-red-500">*</span>
                  </Label>
                  <div className={popupFieldWrapperClass}>
                    <TextField
                      id="activityName"
                      value={activityForm.name}
                      onChange={(e, newValue) =>
                        setActivityForm({ ...activityForm, name: newValue || "" })
                      }
                      placeholder="Enter event name"
                      required
                      styles={popupInputStyles.textField}
                    />
                  </div>
                </div>
                <div>
                  <Label className={popupLabelClass} htmlFor="activityPresenter">
                    Presenter
                  </Label>
                  <div className={popupFieldWrapperClass}>
                    <TextField
                      id="activityPresenter"
                      value={activityForm.presenter}
                      onChange={(e, newValue) =>
                        setActivityForm({
                          ...activityForm,
                          presenter: newValue || "",
                        })
                      }
                      placeholder="Enter presenter name"
                      styles={popupInputStyles.textField}
                    />
                  </div>
                </div>
                <div>
                  <Label className={popupLabelClass}>Date</Label>
                  <div className={popupFieldWrapperClass}>
                    <DatePicker
                      value={stringToDate(activityForm.date) ?? undefined}
                      onSelectDate={(d) =>
                        setActivityForm({
                          ...activityForm,
                          date: dateToString(d),
                        })
                      }
                      placeholder="Select date"
                      styles={popupInputStyles.datePicker}
                    />
                  </div>
                </div>
                <div>
                  <Label className={popupLabelClass} htmlFor="activityType">
                    Type
                  </Label>
                  <div className={popupFieldWrapperClass}>
                    <Dropdown
                      id="activityType"
                      placeholder="Select type"
                      options={ACTIVITY_TYPE_OPTIONS}
                      selectedKey={
                        activityForm.type
                          ? Number(activityForm.type)
                          : undefined
                      }
                      onChange={(_, opt) =>
                        setActivityForm({
                          ...activityForm,
                          type: opt?.key != null ? String(opt.key) : "",
                        })
                      }
                      styles={popupInputStyles.dropdown}
                    />
                  </div>
                </div>
                <div>
                  <Label className={popupLabelClass}>
                    Materials Used (Attachments)
                  </Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFilesSelect(Array.from(e.target.files));
                      }
                      e.target.value = "";
                    }}
                  />
                  <div
                    className={popupUploadZoneClass}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Icon
                      iconName="CloudUpload"
                      className="text-4xl mb-2"
                      style={{ color: "#e78f6a" }}
                    />
                    <p className="text-sm font-medium text-[#1e293b]">
                      Click to upload files or drag and drop
                    </p>
                    <p className="text-xs text-[#475569] mt-1">
                      Multiple files allowed
                    </p>
                  </div>
                  {activityForm.files &&
                    activityForm.files.filter((f) => f.action !== "remove")
                      .length > 0 && (
                      <div className="mt-3 space-y-2">
                        {activityForm.files
                          .filter((f) => f.action !== "remove")
                          .map((fileItem) => {
                            const key = getFileKey(fileItem.file);
                            const isExisting = fileItem.action === "existing";
                            return (
                              <div
                                key={key}
                                className={popupFileItemClass}
                              >
                                <div className="flex items-center gap-3">
                                  <Icon
                                    iconName="Page"
                                    style={{ color: "#e78f6a" }}
                                  />
                                  <div>
                                    <p className="text-sm font-medium text-[#1e293b]">
                                      {fileItem.file.name}
                                    </p>
                                    <p className="text-xs text-[#475569]">
                                      {formatFileSize(fileItem.file.size)}
                                      {isExisting && (
                                        <span className="ml-2 text-[#1D2054]">
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
                                      styles={popupInputStyles.iconButton}
                                    />
                                  )}
                                  <IconButton
                                    iconProps={{ iconName: "Delete" }}
                                    onClick={() =>
                                      handleFileRemove(key, fileItem)
                                    }
                                    title="Remove file"
                                    ariaLabel="Remove file"
                                    styles={popupInputStyles.iconButton}
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
                  onClick={handleAddActivity}
                  text={editingActivityId ? "Update" : "Add"}
                  disabled={isUploading}
                />
                <DefaultButton
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingActivityId(null);
                    setActivityForm({
                      ...INITIAL_ACTIVITY_FORM,
                      files: [],
                    });
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
                      Event Name
                    </th>
                    <th className="px-6 py-3 font-semibold text-white">
                      Presenter
                    </th>
                    <th className="px-6 py-3 font-semibold text-white">
                      Date
                    </th>
                    <th className="px-6 py-3 font-semibold text-white">
                      Type
                    </th>
                    {/* <th className="px-6 py-3 font-semibold text-white">
                      Materials / Attachments
                    </th> */}
                    {edit && (
                      <th className="px-6 py-3 font-semibold text-white text-right">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activities.length === 0 ? (
                    <tr>
                      <td
                        colSpan={edit ? 6 : 5}
                        className="px-6 py-8 text-center text-[#64748b]"
                      >
                        No dissemination activities yet. Add one using the
                        button above.
                      </td>
                    </tr>
                  ) : (
                    activities.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-t border-[#e2e8f0] hover:bg-[#f0f4f8] transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                        }`}
                      >
                        <td className="px-6 py-4 text-[#1e293b]">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 text-[#475569]">
                          {item.presenter || "—"}
                        </td>
                        <td className="px-6 py-4 text-[#475569]">
                          {item.date ? formatDateOnly(item.date) : "—"}
                        </td>
                        <td className="px-6 py-4 text-[#475569]">
                          {getTypeLabel(item.type)}
                        </td>
                        {/* <td className="px-6 py-4 text-[#475569]">
                          {item.files && item.files.length > 0
                            ? `${item.files.length} file(s)`
                            : item.materialsUsed || "—"}
                        </td> */}
                        {edit && (
                          <td className="px-6 py-4 text-right">
                            <IconButton
                              iconProps={{ iconName: "Edit" }}
                              onClick={() => openEditDialog(item)}
                              title="Edit"
                              ariaLabel="Edit activity"
                              styles={popupInputStyles.iconButton}
                            />
                            <IconButton
                              iconProps={{ iconName: "Delete" }}
                              onClick={() => onRemoveActivity(item.id)}
                              title="Remove"
                              ariaLabel="Remove activity"
                              styles={popupInputStyles.iconButton}
                            />
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Reveal>
    </div>
  );
};
