import { useRef } from "react";
import Reveal from "../motion/Reveal";
import { IconButton } from "@fluentui/react/lib/Button";
import { Icon } from "@fluentui/react/lib/Icon";
import React from "react";
import { HEADING_TEXT } from "@/styles/constants";
import { useToast } from "@/hooks/use-toast";

interface FileUploadSectionResearchProps {
  files: { file: File; action: "new" | "existing" | "remove" }[];
  onFilesAdd: (
    files: { file: File; action: "new" | "existing" | "remove" }[],
  ) => void;
  onFileRemove: (fileKey: string) => void;
  form: any;
}

function getFileKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

export const FileUploadSectionResearch: React.FC<
  FileUploadSectionResearchProps
> = ({ files, onFilesAdd, onFileRemove, form }) => {
  const { toast } = useToast();
  const [showSection, setShowSection] = React.useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      const fileList = newFiles.map((f) => ({
        file: f,
        action: "new" as const,
      }));
      onFilesAdd(fileList);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
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
    handleFilesSelect(list);
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    handleFilesSelect(list);
    // Reset input to allow re-selection of the same files
    e.target.value = "";
  };

  return (
    <div className="mt-8 rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className={HEADING_TEXT}>Files</h2>
        <IconButton
          iconProps={{
            iconName: showSection ? "ChevronUp" : "ChevronDown",
          }}
          onClick={() => setShowSection((prev) => !prev)}
          ariaLabel="Toggle files section"
        />
      </div>
      {showSection && (
        <Reveal className="mt-6">
          {/* Files Section - Multiple Files Allowed */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              Upload Files
            </h3>
            {form.type !== "view" && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={onDrop}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="bg-[#FFF8F3] flex cursor-pointer flex-row items-center justify-between rounded-lg border-2 border-dashed border-[#F3D1BF] px-6 py-10 text-center hover:bg-[#FAE7DD]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={onFilePick}
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
              {files.map((f) => {
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
                      iconProps={{ iconName: "View" }}
                      title="View file"
                      ariaLabel="View file"
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = URL.createObjectURL(f.file);
                        // For PDFs and images, open in new tab
                        if (
                          f.file.type === "application/pdf" ||
                          f.file.type.startsWith("image/")
                        ) {
                          window.open(url, "_blank");
                          setTimeout(() => URL.revokeObjectURL(url), 100);
                        } else {
                          // For other file types, download
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = f.file.name;
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      }}
                    />
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
                          onFileRemove(key);
                        }}
                        title="Remove file"
                      />
                    )}
                  </div>
                );
              })}
              {files.filter((f) => f.action !== "remove").length === 0 && (
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
