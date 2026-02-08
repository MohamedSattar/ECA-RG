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
    <div className="mt-8 rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className={HEADING_TEXT}>Attachments</h2>
        <IconButton
          iconProps={{
            iconName: showSection ? "ChevronUp" : "ChevronDown",
          }}
          onClick={() => setShowSection((prev) => !prev)}
          ariaLabel="Toggle general information"
        />
      </div>
      {showSection && (
        <Reveal className="mt-6">
          {/* Application Files Section - PDF Only */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              Main Proposal
            </h3>
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
                className="bg-[#FFF8F3] flex cursor-pointer flex-row items-center justify-between rounded-lg border-2 border-dashed border-[#F3D1BF] px-6 py-10 text-center hover:bg-[#FAE7DD]"
              >
                <input
                  ref={applicationFileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={onApplicationFilePick}
                  disabled={form.type === "view"}
                />
                <div className="flex gap-10 items-center">
                  <div>
                    <Icon
                      iconName="PDF"
                      className="mx-auto mb-2 h-6 w-6 text-red-600 text-4xl text-bold"
                    />
                  </div>
                  <div className="text-[#2F3047] text-xl text-semibold">
                    Drag and drop PDF file here, or click to browse
                    <p className="text-[#8B6B50] text-left text-sm mt-2">
                      Main Proposal - PDF file only
                    </p>
                  </div>
                </div>
                <div className="bg-[#1D2054] w-[150px] py-2 px-3 rounded-md text-sm text-white cursor-pointer">
                  CHOOSE PDF FILE
                </div>
              </div>
            )}

            <div className="flex gap-6 mt-6 flex-row flex-wrap">
              {applicationFiles.map((f) => {
                const key = getFileKey(f.file);
                if (f.action === "remove") return null;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 bg-[#FFEBEE] px-4 py-2 rounded-xl shadow-sm"
                  >
                    <Icon className="text-red-600 text-xl" iconName="PDF" />
                    <span className="text-sm text-[#8B6B50]">
                      {f.file.name}
                    </span>
                    <IconButton
                      className="text-[#8B6B50]"
                      iconProps={{ iconName: "Download" }}
                      title="Download file"
                      ariaLabel="Download file"
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
                        className="text-red-600"
                        iconProps={{ iconName: "Delete" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onApplicationFileRemove(key);
                        }}
                        title="Remove file"
                      />
                    )}
                  </div>
                );
              })}
              {applicationFiles.filter((f) => f.action !== "remove").length ===
                0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No application files added.
                </div>
              )}
            </div>
          </div>

          {/* General Files Section - Any File Type */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              supported File
            </h3>
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
                className="bg-[#FFF8F3] flex cursor-pointer flex-row items-center justify-between rounded-lg border-2 border-dashed border-[#F3D1BF] px-6 py-10 text-center hover:bg-[#FAE7DD]"
              >
                <input
                  ref={generalFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={onGeneralFilePick}
                  disabled={form.type === "view"}
                />
                <div className="flex gap-10 items-center">
                  <div>
                    <Icon
                      iconName="Upload"
                      className="mx-auto mb-2 h-6 w-6 text-[#8B6B50] text-4xl text-bold"
                    />
                  </div>
                  <div className="text-[#2F3047] text-xl text-semibold">
                    Drag and drop files here, or click to browse
                    <p className="text-[#8B6B50] text-left text-sm mt-2">
                      Supports PDF, Word, Excel, Images, and other files
                    </p>
                  </div>
                </div>
                <div className="bg-[#1D2054] w-[150px] py-2 px-3 rounded-md text-sm text-white cursor-pointer">
                  CHOOSE FILES
                </div>
              </div>
            )}

            <div className="flex gap-6 mt-6 flex-row flex-wrap">
              {generalFiles.map((f) => {
                const key = getFileKey(f.file);
                if (f.action === "remove") return null;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 bg-[#FAEDE7] px-4 py-2 rounded-xl shadow-sm"
                  >
                    <Icon
                      className="text-[#8B6B50] text-xl"
                      iconName="Attach"
                    />
                    <span className="text-sm text-[#8B6B50]">
                      {f.file.name}
                    </span>
                    <IconButton
                      className="text-[#8B6B50]"
                      iconProps={{ iconName: "Download" }}
                      title="Download file"
                      ariaLabel="Download file"
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
                        className="text-red-600"
                        iconProps={{ iconName: "Delete" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onGeneralFileRemove(key);
                        }}
                        title="Remove file"
                      />
                    )}
                  </div>
                );
              })}
              {generalFiles.filter((f) => f.action !== "remove").length ===
                0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No files added.
                </div>
              )}
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
};