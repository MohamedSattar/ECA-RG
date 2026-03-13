import * as React from "react";
import { useState, useEffect } from "react";
import {
  useNavigate,
  useSearchParams,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { toast } from "@/ui/use-toast";
import { ReportingDetailsForm } from "@/components/ReportingDetailsForm";
import type { AddReportForm, ReportItem } from "@/components/ReportingSection";

export interface FormResearchReportingContext {
  form: any;
  reportItems: ReportItem[];
  handleEditReport: (id: string, item: AddReportForm) => void;
  handleDeleteFile?: (fileName: string, folder: string) => Promise<void>;
  handleUploadFile?: (files: File[], folder: string) => Promise<void>;
  handleUpdateReportFiles?: (
    itemId: string,
    files: { file: File; action: "new" | "existing" | "remove" }[],
  ) => void;
}

export default function ReportingDetailsEdit() {
  const { reportId } = useParams<{ reportId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const context = useOutletContext<FormResearchReportingContext>();
  const {
    form,
    reportItems,
    handleEditReport,
    handleDeleteFile,
    handleUploadFile,
    handleUpdateReportFiles,
  } = context;

  const [reportForm, setReportForm] = useState<AddReportForm | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const reportItem = reportId
    ? reportItems.find((r) => r.id === reportId)
    : undefined;

  useEffect(() => {
    if (reportItem) {
      setReportForm({
        prmtk_reporttitle: reportItem.prmtk_reporttitle || "",
        prmtk_reportingyear: reportItem.prmtk_reportingyear
          ? reportItem.prmtk_reportingyear.toString()
          : "",
        prmtk_reportingmonth: reportItem.prmtk_reportingmonth
          ? reportItem.prmtk_reportingmonth.toString()
          : "",
        prmtk_budgetspent:
          reportItem.prmtk_budgetspent != null
            ? reportItem.prmtk_budgetspent.toString()
            : "",
        prmtk_researchhealthindicator: reportItem.prmtk_researchhealthindicator
          ? reportItem.prmtk_researchhealthindicator.toString()
          : "",
        prmtk_achievements: reportItem.prmtk_achievements || "",
        prmtk_challenges: reportItem.prmtk_challenges || "",
        prmtk_keyactivities: reportItem.prmtk_keyactivities || "",
        prmtk_upcomingactivities: reportItem.prmtk_upcomingactivities || "",
        prmtk_journalpublications: reportItem.prmtk_journalpublications || "",
        prmtk_workforcedevelopment:
          reportItem.prmtk_workforcedevelopment || "",
        prmtk_changes: reportItem.prmtk_changes || "",
        prmtk_lessonslearnedandimplications:
          reportItem.prmtk_lessonslearnedandimplications || "",
        prmtk_feedback: reportItem.prmtk_feedback || "",
        files: reportItem.files || [],
      });
    }
  }, [reportItem]);

  const buildBackUrl = () => {
    const q = searchParams.toString();
    return q ? `/applyresearch?${q}` : "/applyresearch";
  };

  const handleSubmit = () => {
    if (!reportId || !reportForm) return;
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

    handleEditReport(reportId, reportForm);
    navigate(buildBackUrl());
  };

  const handleCancel = () => {
    navigate(buildBackUrl());
  };

  if (!reportItem || !reportForm) {
    return (
      <div className="container py-8">
        <p className="text-gray-500">Loading report...</p>
        {!reportId && (
          <a
            href={buildBackUrl()}
            onClick={(e) => {
              e.preventDefault();
              navigate(buildBackUrl());
            }}
            className="text-[#1D2054] hover:underline font-medium mt-4 inline-block"
          >
            ← Back to Research Form
          </a>
        )}
      </div>
    );
  }

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
        Edit Reporting Details
      </h1>
      <ReportingDetailsForm
        reportForm={reportForm}
        setReportForm={setReportForm}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isUploading={isUploading}
        isEdit={true}
        editingReportId={reportId}
        reportItems={reportItems}
        form={form}
        onUploadFile={handleUploadFile}
        onDeleteFile={handleDeleteFile}
        onUpdateItemFiles={handleUpdateReportFiles}
      />
    </div>
  );
}
