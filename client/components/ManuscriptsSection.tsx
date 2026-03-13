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
import { IconButton } from "@fluentui/react/lib/Button";
import { Dropdown, IDropdownOption } from "@fluentui/react/lib/Dropdown";
import { ManuscriptStatusOptions, getManuscriptStatusText } from "@/constants";
import { popupInputStyles } from "@/styles/popupInputStyles";

export interface ManuscriptItem {
  id: string;
  title: string;
  authors: string;
  journal: string;
  status: number;
  action?: "new" | "existing";
  removed?: boolean;
}

export interface AddManuscriptForm {
  title: string;
  authors: string;
  journal: string;
  status: number;
}

interface ManuscriptsSectionProps {
  items: ManuscriptItem[];
  onAdd: (form: AddManuscriptForm) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, form: AddManuscriptForm) => void;
  form: { type?: "new" | "edit" | "view" };
}

const INITIAL_FORM: AddManuscriptForm = {
  title: "",
  authors: "",
  journal: "",
  status: 1,
};

const STATUS_OPTIONS: IDropdownOption[] = ManuscriptStatusOptions.map(
  (o) => ({ key: o.key, text: o.text }),
);

export const ManuscriptsSection: React.FC<ManuscriptsSectionProps> = ({
  items,
  onAdd,
  onRemove,
  onEdit,
  form,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<AddManuscriptForm>(INITIAL_FORM);

  const isView = form.type === "view";

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormState(INITIAL_FORM);
    setDialogOpen(true);
  };

  const handleEditClick = (item: ManuscriptItem) => {
    setFormState({
      title: item.title,
      authors: item.authors,
      journal: item.journal,
      status: item.status,
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
          <PrimaryButton
            onClick={handleOpenAdd}
            styles={popupInputStyles.researchPrimaryButton}
          >
            Add Manuscript / Journal Publication
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
            ? "Edit Manuscript / Journal Publication"
            : "Add Manuscript / Journal Publication",
          subText: editingId
            ? "Update the record."
            : "Enter title, authors, journal and status.",
        }}
        modalProps={{ isBlocking: false }}
      >
        <div className="grid gap-4 py-2">
          <div>
            <Label htmlFor="ms-title">Title</Label>
            <TextField
              id="ms-title"
              value={formState.title}
              onChange={(_, v) =>
                setFormState((prev) => ({ ...prev, title: v ?? "" }))
              }
              placeholder="Title"
            />
          </div>
          <div>
            <Label htmlFor="ms-authors">Authors</Label>
            <TextField
              id="ms-authors"
              value={formState.authors}
              onChange={(_, v) =>
                setFormState((prev) => ({ ...prev, authors: v ?? "" }))
              }
              placeholder="Authors"
            />
          </div>
          <div>
            <Label htmlFor="ms-journal">Journal</Label>
            <TextField
              id="ms-journal"
              value={formState.journal}
              onChange={(_, v) =>
                setFormState((prev) => ({ ...prev, journal: v ?? "" }))
              }
              placeholder="Journal"
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
            styles={popupInputStyles.researchPrimaryButton}
          />
          <DefaultButton
            onClick={handleDismiss}
            text="Cancel"
            styles={popupInputStyles.researchSecondaryButton}
          />
        </FluentDialogFooter>
      </FluentDialog>

      <div className="rounded-lg border border-[#e2e8f0] overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-[#1D2054]">
            <tr className="text-left">
              <th className="px-6 py-3 font-semibold text-white">Title</th>
              <th className="px-6 py-3 font-semibold text-white">Authors</th>
              <th className="px-6 py-3 font-semibold text-white">Journal</th>
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
                  {item.authors || "—"}
                </td>
                <td className="px-6 py-3 text-[#475569]">
                  {item.journal || "—"}
                </td>
                <td className="px-6 py-3 text-[#475569]">
                  {getManuscriptStatusText(item.status)}
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
                  colSpan={isView ? 4 : 5}
                  className="px-6 py-8 text-center text-[#94a3b8]"
                >
                  No manuscripts or journal publications.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Reveal>
  );
};
