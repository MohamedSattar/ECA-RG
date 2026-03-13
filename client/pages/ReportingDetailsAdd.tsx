import * as React from "react";
import { useState } from "react";
import { useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import { toast } from "@/ui/use-toast";
import { ReportingDetailsForm } from "@/components/ReportingDetailsForm";
import {
  INITIAL_REPORT_FORM,
  type AddReportForm,
} from "@/components/ReportingSection";

export interface FormResearchReportingContext {
  form: any;
  handleAddReport: (item: AddReportForm) => void;
}

export default function ReportingDetailsAdd() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const context = useOutletContext<FormResearchReportingContext>();
  const { form, handleAddReport } = context;

  const now = new Date();
  const [reportForm, setReportForm] = useState<AddReportForm>({
    ...INITIAL_REPORT_FORM,
    prmtk_reportingyear: now.getFullYear().toString(),
    prmtk_reportingmonth: (now.getMonth() + 1).toString(),
  });
  const [isUploading, setIsUploading] = useState(false);

  const buildBackUrl = () => {
    const q = searchParams.toString();
    return q ? `/applyresearch?${q}` : "/applyresearch";
  };

  const handleSubmit = () => {
    const reportTitle = reportForm.prmtk_reporttitle.trim();
    const budgetSpent = parseFloat(reportForm.prmtk_budgetspent);

    if (
      !reportTitle ||
      !reportForm.prmtk_reportingyear ||
      !reportForm.prmtk_reportingmonth ||
      !reportForm.prmtk_budgetspent ||
      isNaN(budgetSpent)
    ) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
      });
      return;
    }

    handleAddReport(reportForm);
    navigate(buildBackUrl());
  };

  const handleCancel = () => {
    navigate(buildBackUrl());
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <a
          href={buildBackUrl()}
          onClick={(e) => {
            e.preventDefault();
            navigate(buildBackUrl());
          }}
          className="text-[#1D2054] hover:underline font-medium"
        >
          ← Back to Research Form
        </a>
      </div>
      <h1 className="text-2xl font-semibold text-[#1D2054] mb-6">
        Add Reporting Details
      </h1>
      <ReportingDetailsForm
        reportForm={reportForm}
        setReportForm={setReportForm}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isUploading={isUploading}
        isEdit={false}
      />
    </div>
  );
}
