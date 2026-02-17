import { useRef } from "react";
import Reveal from "../motion/Reveal";
import { DefaultButton, IconButton } from "@fluentui/react/lib/Button";
import { Icon } from "@fluentui/react/lib/Icon";
import React from "react";
import { HEADING_TEXT } from "@/styles/constants";
import { useToast } from "@/hooks/use-toast";

interface FileUploadSectionProps {
  applicationFiles: { file: File; action: "new" | "existing" | "remove" }[];
  generalFiles: { file: File; action: "new" | "existing" | "remove" }[];
  onApplicationFilesAdd: (
    files: { file: File; action: "new" | "existing" | "remove" }[],
  ) => void;
  onGeneralFilesAdd: (
    files: { file: File; action: "new" | "existing" | "remove" }[],
  ) => void;
  onApplicationFileRemove: (fileKey: string) => void;
  onGeneralFileRemove: (fileKey: string) => void;
  form: any;
}
function getFileKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let i = -1;
  let size = bytes;
  do {
    size = size / 1024;
    i++;
  } while (size >= 1024 && i < units.length - 1);
  return `${size.toFixed(1)} ${units[i]}`;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  applicationFiles,
  generalFiles,
  onApplicationFilesAdd,
  onGeneralFilesAdd,
  onApplicationFileRemove,
  onGeneralFileRemove,
  form,
}) => {
  const { toast } = useToast();
  const [showSection, setShowSection] = React.useState(true);
  const applicationFileInputRef = useRef<HTMLInputElement>(null);
  const generalFileInputRef = useRef<HTMLInputElement>(null);

  const handleApplicationFilesSelect = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      // Validate PDF only - take the first PDF found
      const pdfFile = newFiles.find(
        (f) =>
          f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      );
      if (!pdfFile) {
        toast({
          title: "Invalid File Type",
          description: "Only ONE PDF file is allowed for the main proposal.",
          variant: "destructive",
        });
        return;
      }

      // Show warning if replacing existing file
      if (
        applicationFiles.length > 0 &&
        applicationFiles[0].action !== "remove"
      ) {
        toast({
          title: "File Replaced",
          description: "The previous main proposal file has been replaced.",
        });
      }

      // Replace the entire array with just this one PDF
      const file = { file: pdfFile, action: "new" as const };
      onApplicationFilesAdd([file]);
    }
  };

  const handleGeneralFilesSelect = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      const files = newFiles.map((f) => ({ file: f, action: "new" as const }));
      onGeneralFilesAdd(files);
    }
  };

  const onApplicationDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const list: File[] = [];
    if (e.dataTransfer?.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) list.push(f);
        }
      }
    } else if (e.dataTransfer?.files) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        list.push(e.dataTransfer.files[i]);
      }
    }
    handleApplicationFilesSelect(list);
  };

  const onGeneralDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const list: File[] = [];
    if (e.dataTransfer?.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) list.push(f);
        }
      }
    } else if (e.dataTransfer?.files) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        list.push(e.dataTransfer.files[i]);
      }
    }
    handleGeneralFilesSelect(list);
  };

  const onApplicationFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    handleApplicationFilesSelect(list);
    // Reset input to allow re-selection of the same files
    e.target.value = "";
  };

  const onGeneralFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    handleGeneralFilesSelect(list);
    // Reset input to allow re-selection of the same files
    e.target.value = "";
  };
  const FileTag = ({ name, active }: { name: string; active: boolean }) => {
    return (
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-md border 
        ${active ? "border-blue-500 bg-blue-50" : "border-rose-200 bg-rose-50"}
      `}
      >
        <span>📄</span>
        <span className="text-sm">{name}</span>
        <button className="text-gray-600 hover:text-gray-800">⬇️</button>
      </div>
    );
  };
  return (
    <div className="mt-8 rounded-xl border border-[#e2e8f0] bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className={HEADING_TEXT}>Attachments</h2>
        <IconButton
          iconProps={{
            iconName: showSection ? "ChevronUp" : "ChevronDown",
          }}
          onClick={() => setShowSection((prev) => !prev)}
          ariaLabel="Toggle attachments"
        />
      </div>
      {showSection && (
        <Reveal className="mt-6">
          <div className="grid gap-8">
            {/* Application Files Section - PDF Only */}
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#1e293b]">
                  Main Proposal
                </h3>
                <p className="text-sm text-[#475569] mt-1">
                  Upload the main proposal document (PDF only)
                </p>
              </div>

              {form.type !== "view" && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                  }}
                  onDrop={onApplicationDrop}
                  onClick={(e) => {
                    e.stopPropagation();
                    applicationFileInputRef.current?.click();
                  }}
                  className="bg-[#f8fafc] flex flex-col items-center justify-center cursor-pointer rounded-lg border-2 border-dashed border-[#cbd5e1] px-6 py-12 text-center hover:bg-[#f0f4f8] hover:border-[#1D2054] transition-colors"
                >
                  <input
                    ref={applicationFileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={onApplicationFilePick}
                    disabled={form.type === "view"}
                  />
                  <Icon
                    iconName="PDF"
                    className="text-red-600 mb-3"
                    style={{ fontSize: "32px" }}
                  />
                  <p className="text-[#1e293b] font-semibold mb-1">
                    Drag and drop your PDF here
                  </p>
                  <p className="text-sm text-[#475569] mb-4">
                    or click to browse
                  </p>
                  <DefaultButton
                    text="Choose PDF File"
                    onClick={(e) => {
                      e.stopPropagation();
                      applicationFileInputRef.current?.click();
                    }}
                    styles={{
                      root: {
                        backgroundColor: "#1D2054",
                        borderColor: "#1D2054",
                        color: "#fff",
                      },
                    }}
                  />
                </div>
              )}

              <div className="mt-4">
                {applicationFiles.filter((f) => f.action !== "remove").length >
                0 ? (
                  <div className="space-y-2">
                    {applicationFiles.map((f) => {
                      const key = getFileKey(f.file);
                      if (f.action === "remove") return null;
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between bg-white border border-[#e2e8f0] rounded-lg px-4 py-3 hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Icon
                              className="text-red-600 flex-shrink-0"
                              iconName="PDF"
                              style={{ fontSize: "20px" }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1e293b] truncate">
                                {f.file.name}
                              </p>
                              <p className="text-xs text-[#475569]">
                                {formatSize(f.file.size)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <IconButton
                              iconProps={{ iconName: "Download" }}
                              title="Download file"
                              ariaLabel="Download file"
                              styles={{
                                root: { color: "#1D2054" },
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = URL.createObjectURL(f.file);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = f.file.name;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                            />
                            {form.type !== "view" && (
                              <IconButton
                                iconProps={{ iconName: "Delete" }}
                                title="Remove file"
                                ariaLabel="Remove file"
                                styles={{
                                  root: { color: "#dc2626" },
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApplicationFileRemove(key);
                                }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-[#94a3b8]">
                    No proposal file added
                  </div>
                )}
              </div>
            </div>

            {/* General Files Section - Any File Type */}
            <div className="border-t border-[#e2e8f0] pt-8">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#1e293b]">
                  Supporting Documents
                </h3>
                <p className="text-sm text-[#475569] mt-1">
                  Upload additional files (PDF, Word, Excel, Images, etc.)
                </p>
              </div>

              {form.type !== "view" && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                  }}
                  onDrop={onGeneralDrop}
                  onClick={(e) => {
                    e.stopPropagation();
                    generalFileInputRef.current?.click();
                  }}
                  className="bg-[#f8fafc] flex flex-col items-center justify-center cursor-pointer rounded-lg border-2 border-dashed border-[#cbd5e1] px-6 py-12 text-center hover:bg-[#f0f4f8] hover:border-[#1D2054] transition-colors"
                >
                  <input
                    ref={generalFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={onGeneralFilePick}
                    disabled={form.type === "view"}
                  />
                  <Icon
                    iconName="Attach"
                    className="text-[#1D2054] mb-3"
                    style={{ fontSize: "32px" }}
                  />
                  <p className="text-[#1e293b] font-semibold mb-1">
                    Drag and drop files here
                  </p>
                  <p className="text-sm text-[#475569] mb-4">
                    or click to browse
                  </p>
                  <DefaultButton
                    text="Choose Files"
                    onClick={(e) => {
                      e.stopPropagation();
                      generalFileInputRef.current?.click();
                    }}
                    styles={{
                      root: {
                        backgroundColor: "#1D2054",
                        borderColor: "#1D2054",
                        color: "#fff",
                      },
                    }}
                  />
                </div>
              )}

              <div className="mt-4">
                {generalFiles.filter((f) => f.action !== "remove").length >
                0 ? (
                  <div className="space-y-2">
                    {generalFiles.map((f) => {
                      const key = getFileKey(f.file);
                      if (f.action === "remove") return null;
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between bg-white border border-[#e2e8f0] rounded-lg px-4 py-3 hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Icon
                              className="text-[#1D2054] flex-shrink-0"
                              iconName="Attach"
                              style={{ fontSize: "20px" }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1e293b] truncate">
                                {f.file.name}
                              </p>
                              <p className="text-xs text-[#475569]">
                                {formatSize(f.file.size)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <IconButton
                              iconProps={{ iconName: "Download" }}
                              title="Download file"
                              ariaLabel="Download file"
                              styles={{
                                root: { color: "#1D2054" },
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = URL.createObjectURL(f.file);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = f.file.name;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                            />
                            {form.type !== "view" && (
                              <IconButton
                                iconProps={{ iconName: "Delete" }}
                                title="Remove file"
                                ariaLabel="Remove file"
                                styles={{
                                  root: { color: "#dc2626" },
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onGeneralFileRemove(key);
                                }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-[#94a3b8]">
                    No supporting documents added
                  </div>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
};
