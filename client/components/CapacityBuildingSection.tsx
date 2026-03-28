import * as React from "react";
import { useRef, useState } from "react";
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
import {
  ResearchActivityStatusOptions,
  getResearchActivityStatusText,
} from "@/constants";
import { getFileKey } from "@/services/utility";
import { getResearchActivityFolderPath } from "@/services/reportFileUpload";
import { popupInputStyles } from "@/styles/popupInputStyles";

export interface ResearchActivityItem {
  id: string;
  title: string;
  date: string;
  deliveryFormat: string;
  audience: string;
  status: number;
  objective?: string;
  keyOutputsOrLessons?: string;
  action?: "new" | "existing";
  removed?: boolean;
  files?: { file: File; action: "new" | "existing" | "remove" }[];
}

export interface AddResearchActivityForm {
  title: string;
  date: string;
  deliveryFormat: string;
  audience: string;
  status: number;
  objective: string;
  keyOutputsOrLessons: string;
  files?: { file: File; action: "new" | "existing" | "remove" }[];
}

interface CapacityBuildingSectionProps {
  items: ResearchActivityItem[];
  onAdd: (form: AddResearchActivityForm) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, form: AddResearchActivityForm) => void;
  onDeleteFile?: (fileName: string, folder: string) => Promise<void>;
  onUploadFile?: (files: File[], folder: string) => Promise<void>;
  onUpdateItemFiles?: (
    itemId: string,
    files: { file: File; action: "new" | "existing" | "remove" }[],
  ) => void;
  form: { type?: "new" | "edit" | "view"; researchNumber?: string };
}

const INITIAL_FORM: AddResearchActivityForm = {
  title: "",
  date: "",
  deliveryFormat: "",
  audience: "",
  status: 1,
  objective: "",
  keyOutputsOrLessons: "",
  files: [],
};

const STATUS_OPTIONS: IDropdownOption[] = ResearchActivityStatusOptions.map(
  (o) => ({ key: o.key, text: o.text }),
);

const formatDateDisplay = (dateString: string): string => {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return dateString;
  }
};

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

export const CapacityBuildingSection: React.FC<CapacityBuildingSectionProps> = ({
  items,
  onAdd,
  onRemove,
  onEdit,
  onDeleteFile,
  onUploadFile,
  onUpdateItemFiles,
  form,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] =
    useState<AddResearchActivityForm>(INITIAL_FORM);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isView = form.type === "view";

  const getActivityFolder = (
    activityId: string,
    title: string,
    date: string,
  ) => {
    const researchNumber = form.researchNumber;
    if (!researchNumber || !activityId) return null;
    return getResearchActivityFolderPath(
      researchNumber,
      title,
      date,
      activityId,
    );
  };

  const handleFilesSelect = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    if (editingId && onUploadFile) {
      const activity = items.find((a) => a.id === editingId);
      const folder = activity
        ? getActivityFolder(
            editingId,
            activity.title,
            activity.date,
          )
        : null;
      if (activity && folder && form.researchNumber) {
        setIsUploading(true);
        try {
          await onUploadFile(newFiles, folder);
          const newFilesList = newFiles.map((f) => ({
            file: f,
            action: "existing" as const,
          }));
          const updatedFiles = [...(formState.files || []), ...newFilesList];
          setFormState((prev) => ({ ...prev, files: updatedFiles }));
          if (onUpdateItemFiles && editingId) {
            const allFiles = [...(activity.files || []), ...newFilesList];
            onUpdateItemFiles(editingId, allFiles);
          }
          toast({
            title: "Success",
            description: "Files uploaded successfully.",
          });
        } catch {
          toast({
            title: "Error",
            description: "Failed to upload files.",
            variant: "destructive",
          });
        } finally {
          setIsUploading(false);
        }
        return;
      }
    }
    const files = newFiles.map((f) => ({ file: f, action: "new" as const }));
    setFormState((prev) => ({
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
      editingId
    ) {
      const activity = items.find((a) => a.id === editingId);
      const folder = activity
        ? getActivityFolder(editingId, activity.title, activity.date)
        : null;
      if (activity && folder && form.researchNumber) {
        setIsUploading(true);
        try {
          await onDeleteFile(fileItem.file.name, folder);
          if (onUpdateItemFiles && editingId) {
            const updatedFiles = (activity.files || []).filter(
              (f) => getFileKey(f.file) !== fileKey,
            );
            onUpdateItemFiles(editingId, updatedFiles);
          }
          setFormState((prev) => ({
            ...prev,
            files: (prev.files || []).filter(
              (f) => getFileKey(f.file) !== fileKey,
            ),
          }));
          toast({
            title: "Success",
            description: "File deleted successfully.",
          });
        } catch {
          toast({
            title: "Error",
            description: "Failed to delete file.",
            variant: "destructive",
          });
        } finally {
          setIsUploading(false);
        }
        return;
      }
    }
    setFormState((prev) => ({
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

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormState({ ...INITIAL_FORM, files: [] });
    setDialogOpen(true);
  };

  const handleEditClick = (item: ResearchActivityItem) => {
    setFormState({
      title: item.title,
      date: item.date,
      deliveryFormat: item.deliveryFormat,
      audience: item.audience,
      objective: item.objective ?? "",
      keyOutputsOrLessons: item.keyOutputsOrLessons ?? "",
      status: item.status ?? 1,
      files: item.files ? [...item.files] : [],
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const handleDismiss = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormState({ ...INITIAL_FORM, files: [] });
  };

  const handleSubmit = () => {
    const title = formState.title.trim();
    if (!title) {
      toast({
        title: "Missing information",
        description: "Please enter Title.",
        variant: "destructive",
      });
      return;
    }
    if (editingId) {
      onEdit(editingId, formState);
    } else {
      onAdd(formState);
    }
    setFormState({ ...INITIAL_FORM, files: [] });
    setDialogOpen(false);
    setEditingId(null);
  };

  const visibleItems = items.filter((i) => !i.removed);

  return (
    <Reveal className="mt-6">
      {!isView && (
        <div className="flex items-center justify-end mb-3">
          <PrimaryButton
            onClick={handleOpenAdd}
            styles={popupInputStyles.researchPrimaryButton}
          >
            Add capacity building / research activity
          </PrimaryButton>
        </div>
      )}

      <FluentDialog
        hidden={!dialogOpen}
        onDismiss={handleDismiss}
        minWidth="50vw"
        dialogContentProps={{
          type: DialogType.normal,
          title: editingId
            ? "Edit capacity building / research activity"
            : "Add capacity building / research activity",
          subText: editingId
            ? "Update the record."
            : "Enter title, date, delivery format, audience and status.",
        }}
        modalProps={{ isBlocking: false }}
      >
        <div className="grid gap-4 py-2">
          <div>
            <Label htmlFor="cb-title">Title</Label>
            <TextField
              id="cb-title"
              value={formState.title}
              onChange={(_, v) =>
                setFormState((prev) => ({ ...prev, title: v ?? "" }))
              }
              placeholder="Title"
            />
          </div>
          <div>
            <Label>Date</Label>
            <DatePicker
              value={stringToDate(formState.date) ?? undefined}
              onSelectDate={(d) =>
                setFormState((prev) => ({ ...prev, date: dateToString(d) }))
              }
              placeholder="Select date"
            />
          </div>
          <div>
            <Label htmlFor="cb-delivery">Delivery Format</Label>
            <TextField
              id="cb-delivery"
              value={formState.deliveryFormat}
              onChange={(_, v) =>
                setFormState((prev) => ({
                  ...prev,
                  deliveryFormat: v ?? "",
                }))
              }
              placeholder="Delivery format"
            />
          </div>
          <div>
            <Label htmlFor="cb-audience">Audience</Label>
            <TextField
              id="cb-audience"
              value={formState.audience}
              onChange={(_, v) =>
                setFormState((prev) => ({ ...prev, audience: v ?? "" }))
              }
              placeholder="Audience"
            />
          </div>
          <div>
            <Label htmlFor="cb-objective">Objective of the Activity</Label>
            <TextField
              id="cb-objective"
              multiline
              value={formState.objective}
              onChange={(_, v) =>
                setFormState((prev) => ({ ...prev, objective: v ?? "" }))
              }
              placeholder="Enter objective of the activity"
            />
          </div>
          <div>
            <Label htmlFor="cb-key-outputs">
              Key Outputs or Lessons
            </Label>
            <TextField
              id="cb-key-outputs"
              multiline
              value={formState.keyOutputsOrLessons}
              onChange={(_, v) =>
                setFormState((prev) => ({
                  ...prev,
                  keyOutputsOrLessons: v ?? "",
                }))
              }
              placeholder="Enter key outputs or lessons"
            />
          </div>
          <div>
            <Label>Status</Label>
            <Dropdown
              placeholder="Select status"
              options={STATUS_OPTIONS}
              selectedKey={formState.status}
              onChange={(_, opt) =>
                setFormState((prev) => ({
                  ...prev,
                  status: (opt?.key as number) ?? 1,
                }))
              }
            />
          </div>

          <div>
            <Label>Attachments</Label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const fl = e.target.files;
                if (fl?.length) {
                  void handleFilesSelect(Array.from(fl));
                }
                e.target.value = "";
              }}
            />
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#1D2054] transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
            >
              <Icon
                iconName="CloudUpload"
                className="text-4xl text-gray-400 mb-2"
              />
              <p className="text-sm text-gray-600">
                Click to upload files or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Multiple files allowed — saved under Researches / Capacity
                Building
              </p>
            </div>
            {formState.files &&
              formState.files.filter((f) => f.action !== "remove").length >
                0 && (
                <div className="mt-4 space-y-2">
                  {formState.files
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
                              onClick={() => handleFileRemove(key, fileItem)}
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
            onClick={handleSubmit}
            text={editingId ? "Update" : "Add"}
            disabled={isUploading}
            styles={popupInputStyles.researchPrimaryButton}
          />
          <DefaultButton
            onClick={handleDismiss}
            text="Cancel"
            disabled={isUploading}
            styles={popupInputStyles.researchSecondaryButton}
          />
        </FluentDialogFooter>
      </FluentDialog>

      <div className="rounded-lg border border-[#e2e8f0] overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-[#1D2054]">
            <tr className="text-left">
              <th className="px-6 py-3 font-semibold text-white">Title</th>
              <th className="px-6 py-3 font-semibold text-white">Date</th>
              <th className="px-6 py-3 font-semibold text-white">
                Delivery Format
              </th>
              <th className="px-6 py-3 font-semibold text-white">Audience</th>
              <th className="px-6 py-3 font-semibold text-white">Status</th>
              <th className="px-6 py-3 font-semibold text-white">
                Attachments
              </th>
              {!isView && (
                <th className="px-6 py-3 font-semibold text-white text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item, index) => (
              <tr
                key={item.id}
                className={`border-t border-[#e2e8f0] hover:bg-[#f0f4f8] transition-colors ${
                  index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                }`}
              >
                <td className="px-6 py-3 font-medium text-[#1e293b]">
                  {item.title || "—"}
                </td>
                <td className="px-6 py-3 text-[#475569]">
                  {formatDateDisplay(item.date)}
                </td>
                <td className="px-6 py-3 text-[#475569]">
                  {item.deliveryFormat || "—"}
                </td>
                <td className="px-6 py-3 text-[#475569]">
                  {item.audience || "—"}
                </td>
                <td className="px-6 py-3 text-[#475569]">
                  {getResearchActivityStatusText(item.status)}
                </td>
                <td className="px-6 py-3">
                  {item.files && item.files.filter((f) => f.action !== "remove")
                    .length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {item.files
                        .filter((f) => f.action !== "remove")
                        .map((fileItem, fileIdx) => {
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
                    <span className="text-gray-400 text-xs">No files</span>
                  )}
                </td>
                {!isView && (
                  <td className="px-6 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <IconButton
                        onClick={() => handleEditClick(item)}
                        iconProps={{ iconName: "Edit" }}
                        title="Edit"
                        ariaLabel="Edit"
                        styles={popupInputStyles.editButton}
                      />
                      <IconButton
                        onClick={() => onRemove(item.id)}
                        iconProps={{ iconName: "Delete" }}
                        title="Delete"
                        ariaLabel="Delete"
                        styles={popupInputStyles.deleteButton}
                      />
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {visibleItems.length === 0 && (
              <tr>
                <td
                  colSpan={isView ? 6 : 7}
                  className="px-6 py-8 text-center text-[#94a3b8]"
                >
                  No capacity building or research activities.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Reveal>
  );
};
