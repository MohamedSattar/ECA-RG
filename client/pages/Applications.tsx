// ...existing code...
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Reveal from "@/motion/Reveal";
import { useDataverseApi } from "@/hooks/useDataverseApi";
import {
  ApplicationKeys,
  APPLICATION_STATUS_LABELS,
  ContactKeys,
  GrantCycleFields,
  ResearchAreaFields,
  TableName,
} from "@/constants/index";
import { useAuth } from "@/state/auth";
import { OverlayLoader } from "@/components/Loader";
import { IconButton } from "@fluentui/react";
import { popupInputStyles } from "@/styles/popupInputStyles";
import { applicationsSample } from "@/samples/applications";

function StatusBadge({ value }: { value?: string | null }) {
  const text = value || "Unknown";
  const cls =
    text === "Approved"
      ? "bg-green-100 text-green-800 border-green-200"
      : text === "Rejected"
        ? "bg-red-100 text-red-800 border-red-200"
        : text === "In Review"
          ? "bg-amber-100 text-amber-800 border-amber-200"
          : text === "Submitted"
            ? "bg-blue-100 text-blue-800 border-blue-200"
            : "bg-slate-100 text-slate-800 border-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
      aria-hidden
    >
      {text}
    </span>
  );
}

export default function Applications() {
  const { callApi } = useDataverseApi();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: replace with actual current user id from auth context
  const currentUserId = user?.contact?.[ContactKeys.CONTACTID] || "";

  const filter = `${ApplicationKeys.MAINAPPLICANT} eq ${currentUserId}`;
  // Use $expand to get Grant Cycle and Research Area names (FormattedValue in $select causes 400)
  const expand =
    "prmtk_GrantCycle($select=prmtk_cyclename),prmtk_ResearchArea($select=prmtk_areaname)";
  const currentUserApplicationURL = `/_api/${TableName.APPLICATIONS}?$select=*&$filter=${filter}&$expand=${expand}`;

  const loadApps = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await callApi<{ value: any }>({
        url: currentUserApplicationURL,
        method: "GET",
      });
      const list = res?.value ?? [];
      console.log(list);
      // console.log("Fetched applications:", list);
      setApps(list);
    } catch (err) {
      console.error("Failed to load applications:", err);
      setError("Unable to load applications. Please try again later.");
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, []);

  const applications = useMemo(() => apps || [], [apps]);

  const getStatusLabel = (app: any): string => {
    const statusCode = app[ApplicationKeys.STATUS];
    const num =
      statusCode !== undefined && statusCode !== null
        ? Number(statusCode)
        : null;
    if (num !== null && APPLICATION_STATUS_LABELS[num as keyof typeof APPLICATION_STATUS_LABELS]) {
      return APPLICATION_STATUS_LABELS[num as keyof typeof APPLICATION_STATUS_LABELS];
    }
    return (app[ApplicationKeys.STATUS_FORMATTED] as string) ?? "Unknown";
  };

  const mapStatusToColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("awarded") || s.includes("approved")) return "bg-green-100 text-green-800 border-green-200";
    if (s.includes("rejected")) return "bg-red-100 text-red-800 border-red-200";
    if (s.includes("disqualified")) return "bg-red-100 text-red-800 border-red-200";
    if (s.includes("submitted")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (s === "draft") return "bg-slate-100 text-slate-800 border-slate-200";
    if (s.includes("return for updates")) return "bg-amber-100 text-amber-800 border-amber-200";
    if (s.includes("shortlisted")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (s.includes("pending review")) return "bg-amber-100 text-amber-800 border-amber-200";
    if (s.includes("review completed")) return "bg-sky-100 text-sky-800 border-sky-200";
    if (s.includes("active")) return "bg-green-100 text-green-800 border-green-200";
    if (s.includes("archived")) return "bg-slate-100 text-slate-600 border-slate-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  const onView = (item: any) => {
    const statusLabel = getStatusLabel(item);
    navigate(
      `/application/${item[ApplicationKeys.APPLICATIONID]}`,
      {
        state: {
          applicationId: item[ApplicationKeys.APPLICATIONID],
          grantCycleId: item[ApplicationKeys.GRANTCYCLE],
          researchAreaId: item[ApplicationKeys.RESEARCHAREA],
          formType: "view",
          item: item,
          status: statusLabel,
        },
      },
    );
  };

  const onEdit = (item: any) => {
    const statusLabel = getStatusLabel(item);
    navigate(
      `/application/${item[ApplicationKeys.APPLICATIONID]}`,
      {
        state: {
          applicationId: item[ApplicationKeys.APPLICATIONID],
          grantCycleId: item[ApplicationKeys.GRANTCYCLE],
          researchAreaId: item[ApplicationKeys.RESEARCHAREA],
          formType: "edit",
          item: item,
          status: statusLabel,
        },
      },
    );
  };

  const ApplicationRow = ({
    number,
    title,
    submittedDate,
    researchArea,
    grantCycle,
    desc,
    status,
    comment,
    app,
  }) => {
    return (
      <div
        className="
      bg-white border border-[#e2e8f0] rounded-lg p-6
      hover:shadow-md transition-all
    "
      >
        {/* Top Row: Number, Title, Status, Action */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-4 flex-1">
            {/* Application Number */}
            <div className="flex-shrink-0">
              <span className="inline-block bg-[#f0f4f8] text-[#1D2054] font-bold text-sm px-3 py-1 rounded">
                {number}
              </span>
            </div>

            {/* Title */}
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-[#1e293b]">{title}</h3>
            </div>
          </div>

          {/* Status and Action */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-bold text-center whitespace-nowrap border ${mapStatusToColor(status)}`}
            >
              {status}
            </div>
            <IconButton
              iconProps={{ iconName:  status.toLowerCase() === "draft" ||
                  status.toLowerCase() === "return for updates" ?"Edit" : "View"}}
              title="Edit Application"
              onClick={() => {
                if (
                  status.toLowerCase() === "draft" ||
                  status.toLowerCase() === "return for updates"
                ) {
                  onEdit(app);
                } else {
                  onView(app);
                }
              }}
              aria-label={`Edit ${title}`}
              styles={popupInputStyles.editButton}
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-[#475569] mb-4 line-clamp-2">{desc}</p>

        {/* Metadata Row: Grant Cycle, Research Area, Submitted Date */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[#e2e8f0]">
          <div>
            <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide">
              Grant Cycle
            </p>
            <p className="text-sm text-[#1e293b] mt-1 font-medium">
              {grantCycle}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide">
              Research Area
            </p>
            <p className="text-sm text-[#1e293b] mt-1 font-medium">
              {researchArea}
            </p>
          </div>
          {  status.toLowerCase() != "draft" &&
          <div>
            <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide">
              Submitted
            </p>
            <p className="text-sm text-[#1e293b] mt-1 font-medium">
              {submittedDate}
            </p>
       
          </div>
             }
        </div>
      </div>
    );
  };
  const SummaryCard = ({ number, label, link, color }) => {
    return (
      <div className="flex items-center gap-4">
        <div
          className={`${color} text-white w-12 h-12 flex items-center justify-center rounded-full font-bold`}
        >
          {number}
        </div>

        <div>
          <p className="font-semibold text-[#1e293b]">{label}</p>
          <a href="#" className="text-sm text-[#475569] underline">
            {link}
          </a>
        </div>
      </div>
    );
  };
  const SummaryCards = () => {
    const getStatus = (app: any) => getStatusLabel(app).toLowerCase();

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 border border-[#e2e8f0] rounded-xl mt-10 mb-6">
        <SummaryCard
          number={applications.length.toString()}
          label="Total Requests"
          link="Check all requests"
          color="bg-[#1D2054]"
        />

        <SummaryCard
          number={applications
            .filter(
              (app) =>
                getStatus(app).includes("reject"),
            )
            .length.toString()}
          label="Rejected"
          link="Check all requests"
          color="bg-red-500"
        />

        <SummaryCard
          number={applications
            .filter(
              (app) =>
                getStatus(app).includes("approve"),
            )
            .length.toString()}
          label="Approved"
          link="Check all requests"
          color="bg-green-500"
        />
      </div>
    );
  };

  return (
    <>
      {/* Header Banner */}
      <section className="relative overflow-hidden bg-[#1D2054]">
        <Reveal>
          <div className="container py-4 md:py-4 grid gap-10 md:grid-cols-2 items-center">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-white">
                My Applications (Proposals)
              </h1>
            </div>

            {/* Hero Collage */}
            <div className="relative flex justify-center md:justify-end">
              <img
                src="/images/application.png"
                alt="Illustration"
                className="h-auto w-auto max-w-none"
              />
            </div>
          </div>
        </Reveal>
      </section>
      {/* Page Content */}
      <div>
        <section className="bg-white">
          <div className="container py-8 md:py-8">
            {/* Header Row */}
            <div className="flex flex-wrap justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[#1e293b]">
                Applications
              </h2>

              {/* <Link
                to="/application"
                className="bg-[#E46D5A] text-white px-6 py-2 rounded flex items-center gap-2 mt-4 md:mt-0"
              >
                <span className="text-lg">＋</span>
                CREATE NEW REQUEST
              </Link> */}
            </div>

            {/* Application Rows */}
            {loading ? (
              <OverlayLoader
                isVisible={loading}
                label="Your request is being processed..."
              />
            ) : error ? (
              <div className="px-5 py-10 text-center text-red-600">{error}</div>
            ) : applications.length === 0 ? (
              <div className="px-5 py-10 text-center text-[#94a3b8]">
                No applications yet. Click "Apply for a Grant" to start your
                first application.
              </div>
            ) : (
              <div className="space-y-3">
                {
                  //applications
                  applications.map((app, index) => {
                    const id =
                      (app[ApplicationKeys.APPLICATIONID] as string) ??
                      Math.random().toString(36);
                    const title =
                      (app[ApplicationKeys.APPLICATIONTITLE] as string) ??
                      "Untitled";
                    const submittedFormatted = app[
                      ApplicationKeys.SUBMISSIONDATE_FORMATTED
                    ] as string | undefined;
                    const submittedRaw = app[
                      ApplicationKeys.SUBMISSIONDATE
                    ] as string | undefined;
                    const submitted =
                      submittedFormatted ||
                      (submittedRaw
                        ? new Date(submittedRaw).toLocaleDateString()
                        : "-");
                    const researchArea =
                      (app.prmtk_ResearchArea?.[
                        ResearchAreaFields.AREANAME
                      ] as string) ??
                      (app[ApplicationKeys.RESEARCHAREA_FORMATTED] as string) ??
                      "-";
                    const grantCycle =
                      (app.prmtk_GrantCycle?.[
                        GrantCycleFields.CYCLENAME
                      ] as string) ??
                      (app[ApplicationKeys.GRANTCYCLE_FORMATTED] as string) ??
                      "-";
                    const status = getStatusLabel(app);
                    const applicationNumber =
                      (app[ApplicationKeys.APPLICATIONNUMBER] as string) ?? "-";
                    const desc =
                      (app[ApplicationKeys.ABSTRACT] as string) ?? "-";
                    return (
                      <ApplicationRow
                        number={applicationNumber}
                        title={title}
                        submittedDate={submitted}
                        researchArea={researchArea}
                        grantCycle={grantCycle}
                        desc={desc}
                        status={status}
                        comment="Need to implement comments"
                        app={app}
                        key={title + index}
                      />
                    );
                  })
                }
              </div>
            )}
            <div className="border border-[#e2e8f0] my-8"></div>
            {/* Summary Section */}
            <SummaryCards />
          </div>
        </section>
      </div>
    </>
  );
}
