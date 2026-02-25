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
import { Dropdown, IDropdownOption } from "@fluentui/react/lib/Dropdown";
import {
  ResearchActivityStatusOptions,
  getResearchActivityStatusText,
} from "@/constants";

export interface ResearchActivityItem {
  id: string;
  title: string;
  date: string;
  deliveryFormat: string;
  audience: string;
  status: number;
  action?: "new" | "existing";
  removed?: boolean;
}

export interface AddResearchActivityForm {
  title: string;
  date: string;
  deliveryFormat: string;
  audience: string;
  status: number;
}

interface CapacityBuildingSectionProps {
  items: ResearchActivityItem[];
  onAdd: (form: AddResearchActivityForm) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, form: AddResearchActivityForm) => void;
  form: { type?: "new" | "edit" | "view" };
}

const INITIAL_FORM: AddResearchActivityForm = {
  title: "",
  date: "",
  deliveryFormat: "",
  audience: "",
  status: 1,
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

export const CapacityBuildingSection: React.FC<CapacityBuildingSectionProps> = ({
  items,
  onAdd,
  onRemove,
  onEdit,
  form,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] =
    useState<AddResearchActivityForm>(INITIAL_FORM);

  const isView = form.type === "view";

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormState(INITIAL_FORM);
    setDialogOpen(true);
  };

  const handleEditClick = (item: ResearchActivityItem) => {
    setFormState({
      title: item.title,
      date: item.date,
      deliveryFormat: item.deliveryFormat,
      audience: item.audience,
      status: 1, // Always Pending in dialog; field is disabled
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
    setFormState(INITIAL_FORM);
    setDialogOpen(false);
    setEditingId(null);
  };

  const visibleItems = items.filter((i) => !i.removed);

  return (
    <Reveal className="mt-6">
      {!isView && (
        <div className="flex items-center justify-end mb-3">
          <PrimaryButton onClick={handleOpenAdd}>
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
              disabled
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
              <th className="px-6 py-3 font-semibold text-white">Title</th>
              <th className="px-6 py-3 font-semibold text-white">Date</th>
              <th className="px-6 py-3 font-semibold text-white">
                Delivery Format
              </th>
              <th className="px-6 py-3 font-semibold text-white">Audience</th>
              <th className="px-6 py-3 font-semibold text-white">Status</th>
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
                      title="Delete"
                      ariaLabel="Delete"
                      styles={{ root: { color: "#dc2626" } }}
                    />
                  </td>
                )}
              </tr>
            ))}
            {visibleItems.length === 0 && (
              <tr>
                <td
                  colSpan={isView ? 5 : 6}
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
