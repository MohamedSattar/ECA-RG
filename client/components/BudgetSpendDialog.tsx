import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { PrimaryButton, DefaultButton } from "@fluentui/react/lib/Button";
import { TextField } from "@fluentui/react/lib/TextField";
import { Label } from "@fluentui/react/lib/Label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { BudgetLineItem } from "@/components/BudgetSection";
import { useDataverseApi } from "@/hooks/useDataverseApi";
import { HEADING_TEXT } from "@/styles/constants";
import { popupInputStyles } from "@/styles/popupInputStyles";
import { toast } from "@/ui/use-toast";
import { aedFormat } from "@/services/utility";

type SpendRow = {
  id?: string;
  month: string;
  year: string;
  amount: string;
};

interface BudgetSpendDialogProps {
  open: boolean;
  onClose: () => void;
  lineItem: BudgetLineItem | null;
  onSaved?: (summary: { totalSpend: number; remainingBudget: number }) => void;
}

const MONTH_OPTIONS = [
  { key: "1", text: "January" },
  { key: "2", text: "February" },
  { key: "3", text: "March" },
  { key: "4", text: "April" },
  { key: "5", text: "May" },
  { key: "6", text: "June" },
  { key: "7", text: "July" },
  { key: "8", text: "August" },
  { key: "9", text: "September" },
  { key: "10", text: "October" },
  { key: "11", text: "November" },
  { key: "12", text: "December" },
];

export const BudgetSpendDialog: React.FC<BudgetSpendDialogProps> = ({
  open,
  onClose,
  lineItem,
  onSaved,
}) => {
  const { callApi } = useDataverseApi();
  const [rows, setRows] = useState<SpendRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalSpend = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const value = parseFloat(r.amount.replace(/,/g, ""));
        return sum + (isNaN(value) ? 0 : value);
      }, 0),
    [rows],
  );

  const remainingBudget = useMemo(() => {
    if (!lineItem) return 0;
    const amount = Number(lineItem.prmtk_amount) || 0;
    return amount - totalSpend;
  }, [lineItem, totalSpend]);

  useEffect(() => {
    const loadSpends = async () => {
      if (!open || !lineItem?.id) return;
      setLoading(true);
      try {
        const res = await callApi<{ value?: any[] }>({
          url: `/api/budget/spends?budgetLineItemId=${lineItem.id}`,
          method: "GET",
          skipAuth: true,
        });
        const value = Array.isArray(res?.value) ? res.value : [];

        if (value.length === 0) {
          setRows([]);
          return;
        }

        const baseRows: SpendRow[] = value.map((v: any) => {
          const rawMonth =
            v.prmtk_reportingmonth ??
            v.prmtk_month ??
            v["prmtk_reportingmonth"] ??
            v["prmtk_month"];

          const rawYear =
            v.prmtk_reportingyear ??
            v.prmtk_year ??
            v["prmtk_reportingyear"] ??
            v["prmtk_year"];

          const rawAmount =
            v.prmtk_spent ??
            v.prmtk_amount ??
            v.prmtk_budgetspent ??
            v["prmtk_spent"] ??
            v["prmtk_budgetspent"];

          return {
            id:
              v.prmtk_budgetspendid ??
              v["prmtk_budgetspendid"] ??
              v.prmtk_budgetspendId,
            month: rawMonth != null ? String(rawMonth) : "",
            year: rawYear != null ? String(rawYear) : "",
            amount: rawAmount != null ? String(rawAmount) : "",
          };
        });

        setRows(baseRows);
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to load spend details.",
          variant: "destructive",
        });

        const emptyRows: SpendRow[] = Array.from({ length: 18 }).map(() => ({
          month: "",
          year: "",
          amount: "",
        }));
        setRows(emptyRows);
      } finally {
        setLoading(false);
      }
    };

    loadSpends();
  }, [open, lineItem?.id]);

  const handleRowChange = (
    index: number,
    field: keyof SpendRow,
    value: string,
  ) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const handleSave = async () => {
    if (!lineItem?.id) {
      onClose();
      return;
    }

    // Basic validation: ignore completely empty rows
    const cleaned = rows
      .map((r) => ({
        ...r,
        amount: r.amount.trim(),
      }))
      .filter(
        (r) =>
          r.month !== "" ||
          r.year !== "" ||
          (r.amount && !isNaN(Number(r.amount))),
      );

    const invalid = cleaned.find(
      (r) => !r.month || !r.year || r.amount === "" || isNaN(Number(r.amount)),
    );

    if (invalid) {
      toast({
        title: "Missing or invalid values",
        description:
          "Please make sure each spend row has Reporting Month, Reporting Year, and a valid Spent amount.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await callApi({
        url: "/api/budget/spends/bulk",
        method: "POST",
        data: {
          budgetLineItemId: lineItem.id,
          spends: cleaned.map((r) => ({
            id: r.id,
            month: r.month,
            year: r.year,
            amount: Number(r.amount),
          })),
        },
        skipAuth: true,
      });

      const remaining = remainingBudget;

      toast({
        title: "Spend updated",
        description: "Budget spend details have been updated successfully.",
      });

      if (onSaved && lineItem) {
        onSaved({
          totalSpend,
          remainingBudget: remaining,
        });
      }

      onClose();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update spend details.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!lineItem) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && !saving && onClose()}
    >
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={HEADING_TEXT}>Edit Budget Spend</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-2 md:grid-cols-4 rounded-lg border bg-slate-50 p-3 text-sm">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">
                Activity
              </p>
              <p className="mt-0.5 font-medium text-slate-900 line-clamp-1">
                {lineItem.prmtk_lineitemname}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">
                Category
              </p>
              <p className="mt-0.5 font-medium text-slate-900">
                {lineItem.prmtk_category}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">
                Amount
              </p>
              <p className="mt-0.5 font-semibold text-emerald-700">
                {aedFormat(lineItem.prmtk_amount)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">
                Description
              </p>
              <p className="mt-0.5 text-xs text-slate-800 line-clamp-1">
                {lineItem.prmtk_description || "-"}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-[#1D2054] mb-3">
              Spend Details
            </h3>
            <div className="rounded-lg border border-[#e2e8f0] overflow-hidden max-h-72 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#1D2054] text-white">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Month</th>
                    <th className="px-4 py-2 text-left font-semibold">Year</th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Spent (AED)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={index}
                      className={`border-t border-[#e2e8f0] ${
                        index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                      }`}
                    >
                      <td className="px-4 py-2 align-middle">
                        <span className="text-sm text-slate-800">
                          {MONTH_OPTIONS.find((m) => m.key === row.month)
                            ?.text ||
                            row.month ||
                            "-"}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <span className="text-sm text-slate-800">
                          {row.year || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <TextField
                          type="number"
                          value={row.amount}
                          onChange={(_, value) =>
                            handleRowChange(index, "amount", value || "")
                          }
                          placeholder="0.00"
                          styles={{
                            fieldGroup: { width: 120 },
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <Label>Amount</Label>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {aedFormat(lineItem.prmtk_amount)}
              </p>
            </div>
            <div>
              <Label>Total Spend</Label>
              <p className="mt-1 text-sm font-semibold text-emerald-700">
                {aedFormat(totalSpend)}
              </p>
            </div>
            <div>
              <Label>Remaining Budget</Label>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {aedFormat(remainingBudget)}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <PrimaryButton
              text="Update"
              onClick={handleSave}
              disabled={saving}
              styles={popupInputStyles.researchPrimaryButton}
            />
            <DefaultButton
              text="Cancel"
              onClick={onClose}
              disabled={saving}
              styles={popupInputStyles.researchSecondaryButton}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
