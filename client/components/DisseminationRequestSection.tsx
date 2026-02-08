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
import { IconButton } from "@fluentui/react/lib/Button";
import { Icon } from "@fluentui/react/lib/Icon";
import { aedFormat, getFileKey } from "@/services/utility";
import { HEADING_TEXT } from "@/styles/constants";

export interface DisseminationRequest {
  id?: string;
  title: string;
  journalName: string;
  abstract: string;
  budgetNeeded: number;
  submissionDate: string;
  requestStatus: number;
  files?: { file: File; action: "new" | "existing" | "remove" }[];
  action?: "new" | "existing" | "remove";
}

interface AddDisseminationRequestForm {
  title: string;
  journalName: string;
  abstract: string;
  budgetNeeded: string;
  files?: { file: File; action: "new" | "existing" | "remove" }[];
}

interface DisseminationRequestSectionProps {
  disseminationRequests: DisseminationRequest[];
  onAddRequest: (item: AddDisseminationRequestForm) => void;
  onRemoveRequest: (id: string) => void;
  onEditRequest: (id: string, item: AddDisseminationRequestForm) => void;
  onDeleteFile?: (fileName: string, folder: string) => Promise<void>;
  onUploadFile?: (files: File[], folder: string) => Promise<void>;
  onUpdateItemFiles?: (
    itemId: string,
    files: { file: File; action: "new" | "existing" | "remove" }[],
  ) => void;
  form: any;
  edit?: boolean;
}

const INITIAL_REQUEST_FORM: AddDisseminationRequestForm = {
  title: "",
  journalName: "",
  abstract: "",
  budgetNeeded: "",
  files: [],
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

// Helper function to get status label
const getStatusLabel = (status: number): string => {
  const statusMap: Record<number, string> = {
    1: "Pending",
    2: "Approved",
    3: "Rejected",
  };
  return statusMap[status] || "Unknown";
};

export const DisseminationRequestSection: React.FC<
  DisseminationRequestSectionProps
> = ({
  disseminationRequests,
  onAddRequest,
  onRemoveRequest,
  onEditRequest,
  onDeleteFile,
  onUploadFile,
  onUpdateItemFiles,
  form,
  edit = true,
}) => {
  const [showSection, setShowSection] = useState(true);
  const [requestForm, setRequestForm] =
    useState<AddDisseminationRequestForm>(INITIAL_REQUEST_FORM);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = async (newFiles: File[]) => {
    if (newFiles.length > 0) {
      // If editing and onUploadFile is available, upload immediately
      if (editingRequestId && onUploadFile) {
        const requestItem = disseminationRequests.find(
          (r) => r.id === editingRequestId,
        );
        if (requestItem && form.researchNumber && requestItem.journalName) {
          setIsUploading(true);
          try {
            const sanitizedJournalName = requestItem.journalName.replace(
              /[<>:"/\\|?*]/g,
              "-",
            );
            const folder = `${form.researchNumber}/Dissemination Requests/${sanitizedJournalName}`;
            await onUploadFile(newFiles, folder);

            // Update form state with new files
            const newFilesList = newFiles.map((f) => ({
              file: f,
              action: "existing" as const,
            }));
            const updatedFiles = [
              ...(requestForm.files || []),
              ...newFilesList,
            ];
            setRequestForm({
              ...requestForm,
              files: updatedFiles,
            });

            // Update parent form state
            if (onUpdateItemFiles && editingRequestId) {
              const requestItem = disseminationRequests.find(
                (r) => r.id === editingRequestId,
              );
              if (requestItem) {
                const allFiles = [
                  ...(requestItem.files || []),
                  ...newFilesList,
                ];
                onUpdateItemFiles(editingRequestId, allFiles);
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
      setRequestForm({
        ...requestForm,
        files: [...(requestForm.files || []), ...files],
      });
    }
  };

  const handleFileRemove = async (
    fileKey: string,
    fileItem: { file: File; action: "new" | "existing" | "remove" },
  ) => {
    // If it's an existing file, delete it from SharePoint immediately
    if (fileItem.action === "existing" && onDeleteFile && editingRequestId) {
      const requestItem = disseminationRequests.find(
        (r) => r.id === editingRequestId,
      );
      if (requestItem && form.researchNumber && requestItem.journalName) {
        setIsUploading(true);
        try {
          const sanitizedJournalName = requestItem.journalName.replace(
            /[<>:"/\\|?*]/g,
            "-",
          );
          const folder = `${form.researchNumber}/Dissemination Requests/${sanitizedJournalName}`;
          await onDeleteFile(fileItem.file.name, folder);

          // Update parent form state
          if (onUpdateItemFiles && editingRequestId) {
            const requestItem = disseminationRequests.find(
              (r) => r.id === editingRequestId,
            );
            if (requestItem) {
              const updatedFiles = (requestItem.files || []).filter(
                (f) => getFileKey(f.file) !== fileKey,
              );
              onUpdateItemFiles(editingRequestId, updatedFiles);
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
    setRequestForm({
      ...requestForm,
      files: (requestForm.files || []).filter(
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

  const handleAddRequest = () => {
    const title = requestForm.title.trim();
    const journalName = requestForm.journalName.trim();
    const budgetNeeded = parseFloat(requestForm.budgetNeeded);

    if (
      !title ||
      !journalName ||
      !requestForm.budgetNeeded ||
      isNaN(budgetNeeded)
    ) {
      toast({
        title: "Missing information",
        description:
          "Please fill in all required fields (Title, Journal Name, and Budget Needed).",
      });
      return;
    }

    if (editingRequestId) {
      onEditRequest(editingRequestId, requestForm);
    } else {
      onAddRequest(requestForm);
    }

    setRequestForm(INITIAL_REQUEST_FORM);
    setIsDialogOpen(false);
    setEditingRequestId(null);
  };

  const openEditDialog = (item: DisseminationRequest) => {
    setRequestForm({
      title: item.title,
      journalName: item.journalName,
      abstract: item.abstract,
      budgetNeeded: item.budgetNeeded.toString(),
      files: item.files || [],
    });
    setEditingRequestId(item.id);
    setIsDialogOpen(true);
  };

  const totalBudgetNeeded = disseminationRequests
    .filter((r) => r.action !== "remove")
    .reduce((sum, r) => sum + r.budgetNeeded, 0);

  return (
    <div className="mt-8 rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className={HEADING_TEXT}>Dissemination Requests</h2>
        <IconButton
          iconProps={{
            iconName: showSection ? "ChevronUp" : "ChevronDown",
          }}
          onClick={() => setShowSection((prev) => !prev)}
          ariaLabel="Toggle dissemination requests section"
        />
      </div>
      <Reveal className="mt-8">
        {showSection && (
          <div style={{ marginTop: "20px" }}>
            <div className="flex items-center justify-end mb-4">
              {edit && (
                <PrimaryButton
                  onClick={() => {
                    setRequestForm(INITIAL_REQUEST_FORM);
                    setEditingRequestId(null);
                    setIsDialogOpen(true);
                  }}
                  disabled={form.type === "view"}
                >
                  Add Request
                </PrimaryButton>
              )}
            </div>

            <FluentDialog
              hidden={!isDialogOpen}
              onDismiss={() => {
                setIsDialogOpen(false);
                setEditingRequestId(null);
                setRequestForm(INITIAL_REQUEST_FORM);
              }}
              dialogContentProps={{
                type: DialogType.normal,
                title: editingRequestId
                  ? "Edit Dissemination Request"
                  : "Add Dissemination Request",
                subText: "Enter the dissemination request details.",
              }}
              modalProps={{ isBlocking: false }}
              minWidth={"50vw"}
            >
              <div className="grid gap-4 py-2">
                <div>
                  <Label htmlFor="title">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <TextField
                    id="title"
                    value={requestForm.title}
                    onChange={(e, newValue) =>
                      setRequestForm({ ...requestForm, title: newValue || "" })
                    }
                    placeholder="Enter title"
                    multiline
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="journalName">
                    Journal Name <span className="text-red-500">*</span>
                  </Label>
                  <TextField
                    id="journalName"
                    value={requestForm.journalName}
                    onChange={(e, newValue) =>
                      setRequestForm({
                        ...requestForm,
                        journalName: newValue || "",
                      })
                    }
                    placeholder="Enter journal name"
                    multiline
                    rows={2}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="abstract">Abstract</Label>
                  <TextField
                    id="abstract"
                    value={requestForm.abstract}
                    onChange={(e, newValue) =>
                      setRequestForm({
                        ...requestForm,
                        abstract: newValue || "",
                      })
                    }
                    placeholder="Enter abstract (optional)"
                    multiline
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="budgetNeeded">
                    Budget Needed (AED) <span className="text-red-500">*</span>
                  </Label>
                  <TextField
                    id="budgetNeeded"
                    value={requestForm.budgetNeeded}
                    onChange={(e, newValue) =>
                      setRequestForm({
                        ...requestForm,
                        budgetNeeded: newValue || "",
                      })
                    }
                    placeholder="e.g., 10000"
                    type="number"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="submissionDate">Submission Date</Label>
                  <TextField
                    id="submissionDate"
                    value={getTodayDate()}
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <TextField id="status" value="Pending" readOnly disabled />
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
                  {requestForm.files &&
                    requestForm.files.filter((f) => f.action !== "remove")
                      .length > 0 && (
                      <div className="mt-4 space-y-2">
                        {requestForm.files
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
                  onClick={handleAddRequest}
                  text={editingRequestId ? "Update" : "Add"}
                  disabled={isUploading}
                />
                <DefaultButton
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingRequestId(null);
                    setRequestForm(INITIAL_REQUEST_FORM);
                  }}
                  text="Cancel"
                  disabled={isUploading}
                />
              </FluentDialogFooter>
            </FluentDialog>

            <div className="rounded-lg border overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f6e4d8]">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-semibold text-[#2b201a]">
                      Title
                    </th>
                    <th className="px-4 py-2 font-semibold text-[#2b201a]">
                      Journal Name
                    </th>
                    <th className="px-4 py-2 font-semibold text-[#2b201a]">
                      Abstract
                    </th>
                    <th className="px-4 py-2 font-semibold text-[#2b201a]">
                      Budget Needed (AED)
                    </th>
                    <th className="px-4 py-2 font-semibold text-[#2b201a]">
                      Submission Date
                    </th>
                    <th className="px-4 py-2 font-semibold text-[#2b201a]">
                      Status
                    </th>
                    <th className="px-4 py-2 font-semibold text-[#2b201a]">
                      Attachments
                    </th>
                    {edit && (
                      <th className="px-4 py-2 font-semibold text-[#2b201a] text-right">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {disseminationRequests.map((item, index) => (
                    <tr key={item.id || index} className="border-t">
                      <td className="px-4 py-2 font-medium text-[#2b201a]">
                        {item.title}
                      </td>
                      <td className="px-4 py-2">{item.journalName}</td>
                      <td className="px-4 py-2">
                        <div
                          className="max-w-xs truncate"
                          title={item.abstract}
                        >
                          {item.abstract || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {aedFormat(item.budgetNeeded)}
                      </td>
                      <td className="px-4 py-2">
                        {formatDateOnly(item.submissionDate)}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            item.requestStatus === 1
                              ? "bg-yellow-100 text-yellow-800"
                              : item.requestStatus === 2
                                ? "bg-green-100 text-green-800"
                                : item.requestStatus === 3
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {getStatusLabel(item.requestStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
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
                        <td className="px-4 py-2 text-right">
                          {item.action === "remove" ? (
                            <span className="text-muted-foreground">
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
                              />
                              <IconButton
                                disabled={form.type === "view"}
                                onClick={() => onRemoveRequest(item.id)}
                                iconProps={{ iconName: "Delete" }}
                                title="Remove"
                                ariaLabel="Remove"
                              />
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {disseminationRequests.length === 0 && (
                    <tr>
                      <td
                        colSpan={edit ? 8 : 7}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        No dissemination requests added.
                      </td>
                    </tr>
                  )}
                </tbody>
                {/* <tfoot className="bg-[#f6e4d8]">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-2 font-semibold text-[#2b201a]"
                    >
                      Total Budget Needed
                    </td>
                    <td className="px-4 py-2 font-semibold text-[#2b201a]">
                      {aedFormat(totalBudgetNeeded)}
                    </td>
                    <td colSpan={3}></td>
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
