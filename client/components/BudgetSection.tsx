import * as React from "react";
import { useMemo, useState } from "react";
import Reveal from "@/motion/Reveal";
import { toast } from "@/ui/use-toast";
import { Dialog as FluentDialog, DialogFooter as FluentDialogFooter, DialogType } from "@fluentui/react/lib/Dialog";
import { PrimaryButton, DefaultButton } from "@fluentui/react/lib/Button";
import { Label } from "@fluentui/react/lib/Label";
import { Dropdown, IDropdownOption } from "@fluentui/react/lib/Dropdown";
import { TextField } from "@fluentui/react/lib/TextField";
import { IconButton } from "@fluentui/react/lib/Button";
import { aedFormat } from "@/services/utility";
import { HEADING_TEXT } from "@/styles/constants";

export interface BudgetHeader {
  id: string;
  name: string;
  totalBudget: number;
  dataId?: string;
  action: "new" | "existing" | "remove";
}

export interface BudgetLineItem {
  id?: string;
  name?: string;
  prmtk_lineitemname: string;
  prmtk_description: string;
  prmtk_amount: number;
  prmtk_category: string;
  action?: "new" | "existing" | "remove";
}

interface AddBudgetLineForm {
  name: string;
  description: string;
  amount: string;
  category: string;
}

interface BudgetSectionProps {
  budgetCategories: IDropdownOption[];
  budgetHeader: BudgetHeader;
  budgetLineItem: BudgetLineItem[];
  onAddBudgetLineItem: (item: AddBudgetLineForm) => void;
  onRemoveBudgetLineItem: (id: string) => void;
  onEditBudgetLineItem: (id: string, item: AddBudgetLineForm) => void;
  form: any;
  edit?: boolean;
}

const INITIAL_LINE_FORM: AddBudgetLineForm = {
  name: "",
  description: "",
  amount: "",
  category: "",
};

export const BudgetSection: React.FC<BudgetSectionProps> = ({
  budgetCategories,
  budgetHeader,
  budgetLineItem,
  onAddBudgetLineItem,
  onRemoveBudgetLineItem,
  onEditBudgetLineItem,
  form,
  edit = true,
}) => {
  const [showSection, setShowSection] = useState(true);
  const [lineForm, setLineForm] =
    useState<AddBudgetLineForm>(INITIAL_LINE_FORM);
  const [isLineDialogOpen, setIsLineDialogOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const categoryOptions = useMemo<IDropdownOption[]>(
    () => budgetCategories.map((cat) => ({ key: cat.key, text: cat.text })),
    [budgetCategories],
  );

  const handleAddBudgetLine = () => {
    const name = lineForm.name.trim();
    const amount = parseFloat(lineForm.amount);

    if (!name || !lineForm.amount || isNaN(amount) || !lineForm.category) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
      });
      return;
    }

    if (editingLineId) {
      onEditBudgetLineItem(editingLineId, lineForm);
    } else {
      onAddBudgetLineItem(lineForm);
    }

    setLineForm(INITIAL_LINE_FORM);
    setIsLineDialogOpen(false);
    setEditingLineId(null);
  };

  const openEditLineDialog = (item: BudgetLineItem) => {
    setLineForm({
      name: item.prmtk_lineitemname,
      description: item.prmtk_description,
      amount: item.prmtk_amount.toString(),
      category: item.prmtk_category,
    });
    setEditingLineId(item.id);
    setIsLineDialogOpen(true);
  };

  const totalLineItemAmount = budgetLineItem
    .filter((l) => l.action !== "remove")
    .reduce((sum, l) => sum + l.prmtk_amount, 0);

  return (
    <div className="mt-8 rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className={HEADING_TEXT}>Budget Details</h2>
        <IconButton
          iconProps={{
            iconName: showSection ? "ChevronUp" : "ChevronDown",
          }}
          onClick={() => setShowSection((prev) => !prev)}
          ariaLabel="Toggle general information"
        />
      </div>
      <Reveal className="mt-8">
        {/* Budget Line Items Section */}
        {showSection && (
          <div style={{ marginTop: "20px" }}>
            <div className="flex items-center justify-end mb-4">
              {edit && (
                <PrimaryButton
                  onClick={() => {
                    setLineForm(INITIAL_LINE_FORM);
                    setEditingLineId(null);
                    setIsLineDialogOpen(true);
                  }}
                  disabled={form.type === "view"}
                >
                  Add Line Item
                </PrimaryButton>
              )}
            </div>

            <FluentDialog
              hidden={!isLineDialogOpen}
              onDismiss={() => {
                setIsLineDialogOpen(false);
                setEditingLineId(null);
                setLineForm(INITIAL_LINE_FORM);
              }}
              dialogContentProps={{
                type: DialogType.normal,
                title: editingLineId
                  ? "Edit Budget Line Item"
                  : "Add Budget Line Item",
                subText: "Enter the line item details.",
              }}
              modalProps={{ isBlocking: false }}
              minWidth={"50vw"}
            >
              <div className="grid gap-4 py-2">
                <div>
                  <Label htmlFor="lineName">Item Name</Label>
                  <TextField
                    id="lineName"
                    value={lineForm.name}
                    onChange={(e, newValue) =>
                      setLineForm({ ...lineForm, name: newValue || "" })
                    }
                    placeholder="e.g., Laboratory Equipment"
                  />
                </div>
                <div>
                  <Label htmlFor="lineDescription">Description</Label>
                  <TextField
                    id="lineDescription"
                    value={lineForm.description}
                    onChange={(e, newValue) =>
                      setLineForm({
                        ...lineForm,
                        description: newValue || "",
                      })
                    }
                    placeholder="Enter description"
                    multiline
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="lineAmount">Amount</Label>
                  <TextField
                    id="lineAmount"
                    value={lineForm.amount}
                    onChange={(e, newValue) =>
                      setLineForm({ ...lineForm, amount: newValue || "" })
                    }
                    placeholder="e.g., 15000"
                    type="number"
                  />
                </div>
                <div>
                  <Label htmlFor="lineCategory">Category</Label>
                  <Dropdown
                    id="lineCategory"
                    placeholder="Select a category"
                    options={categoryOptions}
                    selectedKey={lineForm.category || null}
                    onChange={(_, option) =>
                      setLineForm({
                        ...lineForm,
                        category: (option?.key as string) || "",
                      })
                    }
                  />
                </div>
              </div>
              <FluentDialogFooter>
                <PrimaryButton
                  onClick={handleAddBudgetLine}
                  text={editingLineId ? "Update" : "Add"}
                />
                <DefaultButton
                  onClick={() => {
                    setIsLineDialogOpen(false);
                    setEditingLineId(null);
                    setLineForm(INITIAL_LINE_FORM);
                  }}
                  text="Cancel"
                />
              </FluentDialogFooter>
            </FluentDialog>

            <div className="rounded-lg border border-[#e2e8f0] overflow-hidden shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-[#1D2054]">
                  <tr className="text-left">
                    <th className="px-6 py-3 font-semibold text-white">
                      Item Name
                    </th>
                    <th className="px-6 py-3 font-semibold text-white">
                      Description
                    </th>
                    <th className="px-6 py-3 font-semibold text-white">
                      Category
                    </th>
                    <th className="px-6 py-3 font-semibold text-white text-right">
                      Amount
                    </th>
                    {edit && (
                      <th className="px-6 py-3 font-semibold text-white text-right">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {budgetLineItem.map((item, index) => (
                    <tr
                      key={item.prmtk_amount + index}
                      className={`border-t border-[#e2e8f0] transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'
                      } hover:bg-[#f0f4f8]`}
                    >
                      <td className="px-6 py-3 font-medium text-[#1e293b]">
                        {item.prmtk_lineitemname}
                      </td>
                      <td className="px-6 py-3 text-[#475569]">{item.prmtk_description}</td>
                      <td className="px-6 py-3 text-[#475569]">
                        {categoryOptions.find(
                          (cat) => cat.key === item.prmtk_category,
                        )?.text || item.prmtk_category}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-[#1e293b]">
                        {aedFormat(item.prmtk_amount)}
                      </td>
                      {edit && (
                        <td className="px-6 py-3 text-right">
                          {item.action === "remove" ? (
                            <span className="text-[#94a3b8] line-through">
                              Removed
                            </span>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <IconButton
                                disabled={form.type === "view"}
                                onClick={() => openEditLineDialog(item)}
                                iconProps={{ iconName: "Edit" }}
                                title="Edit"
                                ariaLabel="Edit"
                                styles={{
                                  root: {
                                    color: '#1D2054',
                                  },
                                  rootDisabled: {
                                    color: '#cbd5e1',
                                  },
                                }}
                              />
                              <IconButton
                                disabled={form.type === "view"}
                                onClick={() => onRemoveBudgetLineItem(item.id)}
                                iconProps={{ iconName: "Delete" }}
                                title="Remove"
                                ariaLabel="Remove"
                                styles={{
                                  root: {
                                    color: '#dc2626',
                                  },
                                  rootDisabled: {
                                    color: '#cbd5e1',
                                  },
                                }}
                              />
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {budgetLineItem.length === 0 && (
                    <tr>
                      <td
                        colSpan={edit ? 5 : 4}
                        className="px-6 py-8 text-center text-[#94a3b8]"
                      >
                        No budget line items added.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-[#f8fafc] border-t-2 border-[#e2e8f0]">
                  <tr>
                    <td
                      colSpan={edit ? 3 : 2}
                      className="px-6 py-3 font-semibold text-[#1D2054]"
                    >
                      Total Amount
                    </td>
                    <td className="px-6 py-3 font-bold text-right text-[#1D2054] text-lg">
                      {aedFormat(totalLineItemAmount)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Reveal>
    </div>
  );
};
