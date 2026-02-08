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
import { Dropdown, IDropdownOption } from "@fluentui/react/lib/Dropdown";
import { IconButton } from "@fluentui/react/lib/Button";
import { Icon } from "@fluentui/react/lib/Icon";
import { getFileKey } from "@/services/utility";
import { HEADING_TEXT } from "@/styles/constants";
import {
  DeliverableTypeOptions,
  getDeliverableTypeText,
} from "@/constants/deliverables";

export interface Deliverable {
  id?: string;
  deliverableName: string;
  description: string;
  deliverableType: number;
  submissionDate: string;
  fileUrl?: string;
  fileName?: string;
  files?: { file: File; action: "new" | "existing" | "remove" }[];
  action?: "new" | "existing" | "remove";
}

interface AddDeliverableForm {
  deliverableName: string;
  description: string;
  deliverableType: string;
  files?: { file: File; action: "new" | "existing" | "remove" }[];
}

interface DeliverablesSectionProps {
  deliverables: Deliverable[];
  onAddDeliverable: (item: AddDeliverableForm) => Promise<void>;
  onRemoveDeliverable: (id: string) => void;
  onEditDeliverable: (id: string, item: AddDeliverableForm) => Promise<void>;
  onDeleteFile?: (fileName: string, folder: string) => Promise<void>;
  onUploadFile?: (files: File[], folder: string) => Promise<void>;
  onUpdateItemFiles?: (
    itemId: string,
    files: { file: File; action: "new" | "existing" | "remove" }[],
  ) => void;
  form: any;
  edit?: boolean;
}

const INITIAL_DELIVERABLE_FORM: AddDeliverableForm = {
  deliverableName: "",
  description: "",
  deliverableType: "",
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

export const DeliverablesSection: React.FC<DeliverablesSectionProps> = ({
  deliverables,
  onAddDeliverable,
  onRemoveDeliverable,
  onEditDeliverable,
  onDeleteFile,
  onUploadFile,
  onUpdateItemFiles,
  form,
  edit = true,
}) => {
  const [showSection, setShowSection] = useState(true);
  const [deliverableForm, setDeliverableForm] = useState<AddDeliverableForm>(
    INITIAL_DELIVERABLE_FORM,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeliverableId, setEditingDeliverableId] = useState<
    string | null
  >(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = async (newFiles: File[]) => {
    if (newFiles.length > 0) {
      // If editing and onUploadFile is available, upload immediately
      if (editingDeliverableId && onUploadFile) {
        const deliverableItem = deliverables.find(
          (d) => d.id === editingDeliverableId,
        );
        if (
          deliverableItem &&
          form.researchNumber &&
          deliverableItem.deliverableName &&
          deliverableItem.deliverableType !== undefined
        ) {
          setIsUploading(true);
          try {
            const sanitizedDeliverableName =
              deliverableItem.deliverableName.replace(/[<>:"/\\|?*]/g, "-");
            const deliverableTypeName = getDeliverableTypeText(
              deliverableItem.deliverableType,
            );
            const sanitizedDeliverableType = deliverableTypeName.replace(
              /[<>:"/\\|?*]/g,
              "-",
            );
            const folder = `${form.researchNumber}/Deliverables/${sanitizedDeliverableName}-${sanitizedDeliverableType}`;
            await onUploadFile(newFiles, folder);

            // Update form state with new files
            const newFilesList = newFiles.map((f) => ({
              file: f,
              action: "existing" as const,
            }));
            const updatedFiles = [
              ...(deliverableForm.files || []),
              ...newFilesList,
            ];
            setDeliverableForm({
              ...deliverableForm,
              files: updatedFiles,
            });

            // Update parent form state
            if (onUpdateItemFiles && editingDeliverableId) {
              const deliverableItem = deliverables.find(
                (d) => d.id === editingDeliverableId,
              );
              if (deliverableItem) {
                const allFiles = [
                  ...(deliverableItem.files || []),
                  ...newFilesList,
                ];
                onUpdateItemFiles(editingDeliverableId, allFiles);
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
      setDeliverableForm({
        ...deliverableForm,
        files: [...(deliverableForm.files || []), ...files],
      });
    }
  };

  const handleFileRemove = async (
    fileKey: string,
    fileItem: { file: File; action: "new" | "existing" | "remove" },
  ) => {
    // If it's an existing file, delete it from SharePoint immediately
    if (
      fileItem.action === "existing" &&
      onDeleteFile &&
      editingDeliverableId
    ) {
      const deliverableItem = deliverables.find(
        (d) => d.id === editingDeliverableId,
      );
      if (
        deliverableItem &&
        form.researchNumber &&
        deliverableItem.deliverableName &&
        deliverableItem.deliverableType !== undefined
      ) {
        setIsUploading(true);
        try {
          const sanitizedDeliverableName =
            deliverableItem.deliverableName.replace(/[<>:"/\\|?*]/g, "-");
          const deliverableTypeName = getDeliverableTypeText(
            deliverableItem.deliverableType,
          );
          const sanitizedDeliverableType = deliverableTypeName.replace(
            /[<>:"/\\|?*]/g,
            "-",
          );
          const folder = `${form.researchNumber}/Deliverables/${sanitizedDeliverableName}-${sanitizedDeliverableType}`;
          await onDeleteFile(fileItem.file.name, folder);

          // Update parent form state
          if (onUpdateItemFiles && editingDeliverableId) {
            const deliverableItem = deliverables.find(
              (d) => d.id === editingDeliverableId,
            );
            if (deliverableItem) {
              const updatedFiles = (deliverableItem.files || []).filter(
                (f) => getFileKey(f.file) !== fileKey,
              );
              onUpdateItemFiles(editingDeliverableId, updatedFiles);
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
    setDeliverableForm({
      ...deliverableForm,
      files: (deliverableForm.files || []).filter(
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

  const handleAddDeliverable = async () => {
    const deliverableName = deliverableForm.deliverableName.trim();
    const deliverableType = deliverableForm.deliverableType;

    if (!deliverableName || !deliverableType) {
      toast({
        title: "Missing information",
        description:
          "Please fill in all required fields (Deliverable Name, Type, and File).",
      });
      return;
    }

    setIsUploading(true);
    try {
      if (editingDeliverableId) {
        await onEditDeliverable(editingDeliverableId, deliverableForm);
      } else {
        await onAddDeliverable(deliverableForm);
      }

      setDeliverableForm(INITIAL_DELIVERABLE_FORM);
      setIsDialogOpen(false);
      setEditingDeliverableId(null);
    } catch (error) {
      // Error handling is done in the parent handlers
    } finally {
      setIsUploading(false);
    }
  };

  const openEditDialog = (item: Deliverable) => {
    setDeliverableForm({
      deliverableName: item.deliverableName,
      description: item.description || "",
      deliverableType: item.deliverableType.toString(),
      files: item.files || [],
    });
    setEditingDeliverableId(item.id);
    setIsDialogOpen(true);
  };

  return (
    <div className="mt-8 rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className={HEADING_TEXT}>Deliverables</h2>
        <IconButton
          iconProps={{
            iconName: showSection ? "ChevronUp" : "ChevronDown",
          }}
          onClick={() => setShowSection((prev) => !prev)}
          ariaLabel="Toggle deliverables section"
        />
      </div>
      <Reveal className="mt-8">
        {showSection && (
          <div style={{ marginTop: "20px" }}>
            <div className="flex items-center justify-end mb-4">
              {edit && (
                <PrimaryButton
                  onClick={() => {
                    setDeliverableForm(INITIAL_DELIVERABLE_FORM);
                    setEditingDeliverableId(null);
                    setIsDialogOpen(true);
                  }}
                  disabled={form.type === "view"}
                >
                  Add Deliverable
                </PrimaryButton>
              )}
            </div>

            <FluentDialog
              hidden={!isDialogOpen}
              onDismiss={() => {
                setIsDialogOpen(false);
                setEditingDeliverableId(null);
                setDeliverableForm(INITIAL_DELIVERABLE_FORM);
              }}
              dialogContentProps={{
                type: DialogType.normal,
                title: editingDeliverableId
                  ? "Edit Deliverable"
                  : "Add Deliverable",
                subText: "Enter the deliverable details.",
              }}
              modalProps={{ isBlocking: false }}
              minWidth={"50vw"}
            >
              <div className="grid gap-4 py-2">
                <div>
                  <Label htmlFor="deliverableName">
                    Deliverable Name <span className="text-red-500">*</span>
                  </Label>
                  <TextField
                    id="deliverableName"
                    value={deliverableForm.deliverableName}
                    onChange={(e, newValue) =>
                      setDeliverableForm({
                        ...deliverableForm,
                        deliverableName: newValue || "",
                      })
                    }
                    placeholder="Enter deliverable name"
                    multiline
                    rows={2}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <TextField
                    id="description"
                    value={deliverableForm.description}
                    onChange={(e, newValue) =>
                      setDeliverableForm({
                        ...deliverableForm,
                        description: newValue || "",
                      })
                    }
                    placeholder="Enter description (optional)"
                    multiline
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="deliverableType">
                    Deliverable Type <span className="text-red-500">*</span>
                  </Label>
                  <Dropdown
                    id="deliverableType"
                    placeholder="Select deliverable type"
                    options={DeliverableTypeOptions.map((opt) => ({
                      key: opt.key.toString(),
                      text: opt.text,
                    }))}
                    selectedKey={deliverableForm.deliverableType || null}
                    onChange={(_, option) =>
                      setDeliverableForm({
                        ...deliverableForm,
                        deliverableType: option?.key?.toString() || "",
                      })
                    }
                    required
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
                  {deliverableForm.files &&
                    deliverableForm.files.filter((f) => f.action !== "remove")
                      .length > 0 && (
                      <div className="mt-4 space-y-2">
                        {deliverableForm.files
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
                <div>
                  <Label htmlFor="submissionDate">Submission Date</Label>
                  <TextField
                    id="submissionDate"
                    value={getTodayDate()}
                    readOnly
                    disabled
                  />
                </div>
              </div>
              <FluentDialogFooter>
                <PrimaryButton
                  onClick={handleAddDeliverable}
                  text={editingDeliverableId ? "Update" : "Add"}
                  disabled={isUploading}
                />
                <DefaultButton
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingDeliverableId(null);
                    setDeliverableForm(INITIAL_DELIVERABLE_FORM);
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
                      Deliverable Name
                    </th>
                    <th className="px-4 py-2 font-semibold text-[#2b201a]">
                      Description
                    </th>
                    <th className="px-4 py-2 font-semibold text-[#2b201a]">
                      Type
                    </th>
                    <th className="px-4 py-2 font-semibold text-[#2b201a]">
                      Submission Date
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
                  {deliverables.map((item, index) => (
                    <tr key={item.id || index} className="border-t">
                      <td className="px-4 py-2 font-medium text-[#2b201a]">
                        {item.deliverableName}
                      </td>
                      <td className="px-4 py-2">
                        <div
                          className="max-w-xs truncate"
                          title={item.description}
                        >
                          {item.description || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {getDeliverableTypeText(item.deliverableType)}
                        </span>
                      </td>

                      <td className="px-4 py-2">
                        {formatDateOnly(item.submissionDate)}
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
                                onClick={() => onRemoveDeliverable(item.id)}
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
                  {deliverables.length === 0 && (
                    <tr>
                      <td
                        colSpan={edit ? 6 : 5}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        No deliverables added.
                      </td>
                    </tr>
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
