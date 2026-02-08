import * as React from "react";
import { useMemo, useState } from "react";
import Reveal from "@/motion/Reveal";
import { toast } from "@/ui/use-toast";
import {
  Dialog as FluentDialog,
  DialogFooter as FluentDialogFooter,
  DialogType,
} from "@fluentui/react/lib/Dialog";
import { PrimaryButton, DefaultButton } from "@fluentui/react/lib/Button";
import { Label } from "@fluentui/react/lib/Label";
import { Dropdown, IDropdownOption } from "@fluentui/react/lib/Dropdown";
import { TextField } from "@fluentui/react/lib/TextField";
import { IconButton } from "@fluentui/react/lib/Button";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  customRoleName?: string;
  educationLevel?: string;
  action: "new" | "existing" | "remove";
}

interface AddMemberForm {
  name: string;
  role: string;
  customRoleName?: string;
  educationLevel?: string;
}

interface TeamMemberOption {
  key: string;
  text: string;
}

interface TeamMemberSectionProps {
  team: TeamMember[];
  teamMemberRoles: IDropdownOption[];
  onAddMember: (member: AddMemberForm) => void;
  onRemoveMember: (id: string) => void;
  onEditMember: (id: string, member: AddMemberForm) => void;
  form: any;
}

const INITIAL_MEMBER_FORM: AddMemberForm = {
  name: "",
  role: "",
  customRoleName: "",
  educationLevel: "",
};

export const TeamMemberSection: React.FC<TeamMemberSectionProps> = ({
  team,
  teamMemberRoles,
  onAddMember,
  onRemoveMember,
  onEditMember,
  form,
}) => {
  const [memberForm, setMemberForm] =
    useState<AddMemberForm>(INITIAL_MEMBER_FORM);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const dropdownOptions = useMemo<IDropdownOption[]>(
    () => teamMemberRoles.map((role) => ({ key: role.key, text: role.text })),
    [teamMemberRoles],
  );
  const handleAddMember = () => {
    const name = memberForm.name.trim();
    if (!name || !memberForm.role) {
      toast({
        title: "Missing information",
        description: "Please enter both name and role.",
      });
      return;
    }
    if (memberForm.role === "5" && !memberForm.customRoleName?.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a custom role name for 'Other' role.",
      });
      return;
    }

    if (editingMemberId) {
      onEditMember(editingMemberId, memberForm);
      setEditingMemberId(null);
    } else {
      onAddMember(memberForm);
    }

    setMemberForm(INITIAL_MEMBER_FORM);
    setIsDialogOpen(false);
  };

  const handleEditClick = (member: TeamMember) => {
    setMemberForm({
      name: member.name,
      role: String(member.role),
      customRoleName: member.customRoleName || "",
      educationLevel: member.educationLevel || "",
    });
    setEditingMemberId(member.id);
    setIsDialogOpen(true);
  };

  const handleDialogDismiss = () => {
    setIsDialogOpen(false);
    setEditingMemberId(null);
    setMemberForm(INITIAL_MEMBER_FORM);
  };

  return (
    <Reveal className="mt-6">
      <>
        {form.type !== "view" && (
          <div className="flex items-center justify-end">
            <PrimaryButton onClick={() => setIsDialogOpen(true)}>
              Add member
            </PrimaryButton>
          </div>
        )}
        <FluentDialog
          hidden={!isDialogOpen}
          onDismiss={handleDialogDismiss}
          minWidth={"50vw"}
          dialogContentProps={{
            type: DialogType.normal,
            title: editingMemberId ? "Edit team member" : "Add team member",
            subText: editingMemberId
              ? "Update the member information."
              : "Enter the member name and select a role.",
          }}
          modalProps={{ isBlocking: false }}
        >
          <div className="grid gap-4 py-2">
            <div>
              <Label htmlFor="memberName">Member name</Label>
              <TextField
                id="memberName"
                value={memberForm.name}
                onChange={(e, newValue) =>
                  setMemberForm({ ...memberForm, name: newValue || "" })
                }
              />
            </div>
            <div>
              <Label htmlFor="memberRole">Role</Label>
              <Dropdown
                id="memberRole"
                placeholder="Select a role"
                options={dropdownOptions}
                selectedKey={memberForm.role ? memberForm.role : undefined}
                onChange={(_, option) =>
                  setMemberForm({
                    ...memberForm,
                    role: (option?.key as string) || "",
                  })
                }
              />
            </div>
            {memberForm.role === "5" && (
              <div>
                <Label htmlFor="customRoleName">Role Name</Label>
                <TextField
                  id="customRoleName"
                  placeholder="Enter custom role name"
                  value={memberForm.customRoleName || ""}
                  onChange={(e, newValue) =>
                    setMemberForm({
                      ...memberForm,
                      customRoleName: newValue || "",
                    })
                  }
                />
              </div>
            )}
            <div>
              <Label htmlFor="educationLevel">Education Level</Label>
              <TextField
                id="educationLevel"
                placeholder="Enter education level"
                value={memberForm.educationLevel || ""}
                onChange={(e, newValue) =>
                  setMemberForm({
                    ...memberForm,
                    educationLevel: newValue || "",
                  })
                }
              />
            </div>
          </div>
          <FluentDialogFooter>
            <PrimaryButton
              onClick={handleAddMember}
              text={editingMemberId ? "Update" : "Add"}
            />
            <DefaultButton onClick={handleDialogDismiss} text="Cancel" />
          </FluentDialogFooter>
        </FluentDialog>
      </>

      <div className="mt-4 rounded-lg border border-[#e2e8f0] overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-[#1D2054]">
            <tr className="text-left">
              <th className="px-6 py-3 font-semibold text-white">
                Member name
              </th>
              <th className="px-6 py-3 font-semibold text-white">Role</th>
              <th className="px-6 py-3 font-semibold text-white">
                Education Level
              </th>
              <th className="px-6 py-3 font-semibold text-white text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {team.map((m, index) => (
              <tr
                key={m.id}
                className={`border-t border-[#e2e8f0] hover:bg-[#f0f4f8] transition-colors ${
                  index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                }`}
              >
                <td className="px-6 py-3 font-medium text-[#1e293b]">
                  {m.name}
                </td>
                <td className="px-6 py-3 text-[#475569]">
                  {m.role === "5" && m.customRoleName
                    ? m.customRoleName
                    : dropdownOptions.find((role) => role.key == m.role)
                        ?.text || m.role}
                </td>
                <td className="px-6 py-3 text-[#475569]">
                  {m.educationLevel || "N/A"}
                </td>
                <td className="px-6 py-3 text-right">
                  {m.action === "remove" ? (
                    <span className="text-[#94a3b8]">Removed</span>
                  ) : form.type !== "view" ? (
                    <>
                      <IconButton
                        onClick={() => handleEditClick(m)}
                        iconProps={{ iconName: "Edit" }}
                        title="Edit"
                        ariaLabel="Edit"
                        styles={{
                          root: { color: "#1D2054" },
                        }}
                      />
                      <IconButton
                        onClick={() => onRemoveMember(m.id)}
                        iconProps={{ iconName: "Delete" }}
                        title="Remove"
                        ariaLabel="Remove"
                        styles={{
                          root: { color: "#dc2626" },
                        }}
                      />
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
            {team.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-[#94a3b8]"
                >
                  No team members added.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Reveal>
  );
};
