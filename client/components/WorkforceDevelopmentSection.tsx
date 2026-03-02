import * as React from "react";
import { useState } from "react";
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

export interface WorkforceDevelopmentItem {
  id: string;
  fullName: string;
  joiningDate: string;
  endDate: string;
  roleInProject: string;
  educationalLevel: string;
  action?: "new" | "existing";
  /** When true, item is marked for deletion (only DELETE when action was "existing") */
  removed?: boolean;
}

export interface AddWorkforceDevelopmentForm {
  fullName: string;
  joiningDate: string;
  endDate: string;
  roleInProject: string;
  educationalLevel: string;
}

interface WorkforceDevelopmentSectionProps {
  items: WorkforceDevelopmentItem[];
  onAdd: (form: AddWorkforceDevelopmentForm) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, form: AddWorkforceDevelopmentForm) => void;
  form: { type?: "new" | "edit" | "view" };
}

const INITIAL_FORM: AddWorkforceDevelopmentForm = {
  fullName: "",
  joiningDate: "",
  endDate: "",
  roleInProject: "",
  educationalLevel: "",
};

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

export const WorkforceDevelopmentSection: React.FC<
  WorkforceDevelopmentSectionProps
> = ({ items, onAdd, onRemove, onEdit, form }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] =
    useState<AddWorkforceDevelopmentForm>(INITIAL_FORM);

  const isView = form.type === "view";

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormState(INITIAL_FORM);
    setDialogOpen(true);
  };

  const handleEditClick = (item: WorkforceDevelopmentItem) => {
    setFormState({
      fullName: item.fullName,
      joiningDate: item.joiningDate,
      endDate: item.endDate,
      roleInProject: item.roleInProject,
      educationalLevel: item.educationalLevel,
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const handleDismiss = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormState(INITIAL_FORM);
  };

  const handleSubmit = () => {
    const name = formState.fullName.trim();
    if (!name) {
      toast({
        title: "Missing information",
        description: "Please enter Full Name.",
        variant: "destructive",
      });
      return;
    }
    if (editingId) {
      onEdit(editingId, formState);
    } else {
      onAdd(formState);
    }
    setFormState(INITIAL_FORM);
    setDialogOpen(false);
    setEditingId(null);
  };

  return (
    <Reveal className="mt-6">
      {!isView && (
        <div className="flex items-center justify-end mb-3">
          <PrimaryButton onClick={handleOpenAdd}>
            Add Emirates Workforce Development
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
            ? "Edit Emirates Workforce Development"
            : "Add Emirates Workforce Development",
          subText: editingId
            ? "Update the record."
            : "Enter full name, dates, role and educational level.",
        }}
        modalProps={{ isBlocking: false }}
      >
        <div className="grid gap-4 py-2">
          <div>
            <Label htmlFor="wd-fullName">Full Name</Label>
            <TextField
              id="wd-fullName"
              value={formState.fullName}
              onChange={(_, v) =>
                setFormState((prev) => ({ ...prev, fullName: v ?? "" }))
              }
              placeholder="Full name"
            />
          </div>
          <div>
            <Label>Joining Date</Label>
            <DatePicker
              value={stringToDate(formState.joiningDate) ?? undefined}
              onSelectDate={(d) =>
                setFormState((prev) => ({
                  ...prev,
                  joiningDate: dateToString(d),
                }))
              }
              placeholder="Select date"
            />
          </div>
          <div>
            <Label>End Date</Label>
            <DatePicker
              value={stringToDate(formState.endDate) ?? undefined}
              onSelectDate={(d) =>
                setFormState((prev) => ({
                  ...prev,
                  endDate: dateToString(d),
                }))
              }
              placeholder="Select date"
            />
          </div>
          <div>
            <Label htmlFor="wd-role">Role in the project</Label>
            <TextField
              id="wd-role"
              value={formState.roleInProject}
              onChange={(_, v) =>
                setFormState((prev) => ({ ...prev, roleInProject: v ?? "" }))
              }
              placeholder="Role in the project"
            />
          </div>
          <div>
            <Label htmlFor="wd-education">Educational Level</Label>
            <TextField
              id="wd-education"
              value={formState.educationalLevel}
              onChange={(_, v) =>
                setFormState((prev) => ({
                  ...prev,
                  educationalLevel: v ?? "",
                }))
              }
              placeholder="Educational level"
            />
          </div>
        </div>
        <FluentDialogFooter>
          <PrimaryButton
            onClick={handleSubmit}
            text={editingId ? "Update" : "Add"}
          />
          <DefaultButton onClick={handleDismiss} text="Cancel" />
        </FluentDialogFooter>
      </FluentDialog>

      <div className="rounded-lg border border-[#e2e8f0] overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-[#1D2054]">
            <tr className="text-left">
              <th className="px-6 py-3 font-semibold text-white">
                Full Name
              </th>
              <th className="px-6 py-3 font-semibold text-white">
                Joining Date
              </th>
              <th className="px-6 py-3 font-semibold text-white">
                End Date
              </th>
              <th className="px-6 py-3 font-semibold text-white">
                Role in the project
              </th>
              <th className="px-6 py-3 font-semibold text-white">
                Educational Level
              </th>
              {!isView && (
                <th className="px-6 py-3 font-semibold text-white text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {items
              .filter((i) => !i.removed)
              .map((item, index) => (
                <tr
                  key={item.id}
                  className={`border-t border-[#e2e8f0] hover:bg-[#f0f4f8] transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                  }`}
                >
                  <td className="px-6 py-3 font-medium text-[#1e293b]">
                    {item.fullName}
                  </td>
                  <td className="px-6 py-3 text-[#475569]">
                    {formatDateDisplay(item.joiningDate)}
                  </td>
                  <td className="px-6 py-3 text-[#475569]">
                    {formatDateDisplay(item.endDate)}
                  </td>
                  <td className="px-6 py-3 text-[#475569]">
                    {item.roleInProject || "—"}
                  </td>
                  <td className="px-6 py-3 text-[#475569]">
                    {item.educationalLevel || "—"}
                  </td>
                  {!isView && (
                    <td className="px-6 py-3 text-right">
                      <IconButton
                        onClick={() => handleEditClick(item)}
                        iconProps={{ iconName: "Edit" }}
                        title="Edit"
                        ariaLabel="Edit"
                        styles={{ root: { color: "#1D2054" } }}
                      />
                      <IconButton
                        onClick={() => onRemove(item.id)}
                        iconProps={{ iconName: "Delete" }}
                        title="Remove"
                        ariaLabel="Remove"
                        styles={{ root: { color: "#dc2626" } }}
                      />
                    </td>
                  )}
                </tr>
              ))}
            {items.filter((i) => !i.removed).length === 0 && (
              <tr>
                <td
                  colSpan={isView ? 5 : 6}
                  className="px-6 py-8 text-center text-[#94a3b8]"
                >
                  No Emirates Workforce Development records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Reveal>
  );
};
