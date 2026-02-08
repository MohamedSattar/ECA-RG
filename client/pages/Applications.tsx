// ...existing code...
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Reveal from "@/motion/Reveal";
import { useDataverseApi } from "@/hooks/useDataverseApi";
import {
  ApplicationKeys,
  ContactKeys,
  GrantCycleFields,
  TableName,
} from "@/constants/index";
import { useAuth } from "@/state/auth";
import { OverlayLoader } from "@/components/Loader";
import { IconButton } from "@fluentui/react";
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

  const select = `${ApplicationKeys.APPLICATIONID},${ApplicationKeys.APPLICATIONTITLE},${ApplicationKeys.SUBMISSIONDATE_FORMATTED},
  ${ApplicationKeys.RESEARCHAREA_FORMATTED},${ApplicationKeys.GRANTCYCLE_FORMATTED},${ApplicationKeys.STATUS_FORMATTED}`;
  const filter = `${ApplicationKeys.MAINAPPLICANT} eq ${currentUserId}`;
  const currentUserApplicationURL = `/_api/${TableName.APPLICATIONS}?$select=*&$filter=${filter}`;

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

  const onView = (item: any) => {
    const title =
      (item[ApplicationKeys.APPLICATIONTITLE] as string) ?? "Application";
    navigate(
      `/applyapplication?item=${item[ApplicationKeys.APPLICATIONID]}&grantCycleId=${item[ApplicationKeys.GRANTCYCLE]}&researchAreaId=${item[ApplicationKeys.RESEARCHAREA]}&status=${item[GrantCycleFields.STATUS_FORMATTED]}&applicationNumber=${item[ApplicationKeys.APPLICATIONNUMBER]}&formType=view`,
      {
        state: {
          applicationId: item[ApplicationKeys.APPLICATIONID],
          grantCycleId: item[ApplicationKeys.GRANTCYCLE],
          researchAreaId: item[ApplicationKeys.RESEARCHAREA],
          formType: "view",
          item: item,
          status: item[GrantCycleFields.STATUS_FORMATTED],
        },
      },
    );
  };

  const onEdit = (item: any) => {
    const title =
      (item[ApplicationKeys.APPLICATIONTITLE] as string) ?? "Application";
    navigate(
      `/applyapplication?item=${item[ApplicationKeys.APPLICATIONID]}&grantCycleId=${item[ApplicationKeys.GRANTCYCLE]}&researchAreaId=${item[ApplicationKeys.RESEARCHAREA]}&status=${item[GrantCycleFields.STATUS_FORMATTED]}&applicationNumber=${item[ApplicationKeys.APPLICATIONNUMBER]}&formType=edit`,
      {
        state: {
          applicationId: item[ApplicationKeys.APPLICATIONID],
          grantCycleId: item[ApplicationKeys.GRANTCYCLE],
          researchAreaId: item[ApplicationKeys.RESEARCHAREA],
          formType: "edit",
          item: item,
        },
      },
    );
  };
  const mapStatusToColor = (status: string) => {
    const upperStatus = status.toUpperCase();
    if (upperStatus.indexOf("APPROVE") !== -1) {
      return "bg-green-500 text-white";
    } else if (upperStatus.indexOf("REJECT") !== -1) {
      return "bg-red-500 text-white";
    } else {
      return "bg-blue-300 text-black";
    }
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
      bg-[#FFF8F3] border border-[#FAE7DD] rounded-lg p-4 
      grid grid-cols-1 
      lg:grid-cols-[100px_1fr_1fr_200px_80px]
      items-start gap-4
    "
      >
        {/* Number */}
        <div className="text-sm font-semibold text-orange-500 space-y-2 self-center">
          {number}
        </div>

        {/* Main Title + Description */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{title}</h3>

          <p className="text-base text-gray-500 mt-2">{desc}</p>
        </div>
        {/* Sub Info */}
        <div className="space-y-2">
          <div>
            <b className="text-brown">Grant Cycle:</b>
            {grantCycle}
          </div>
          <div>
            <b className="text-brown">Research Area:</b>
            {researchArea}
          </div>
          <div>
            <b className="text-brown">Submitted on:</b>
            {submittedDate}
          </div>
        </div>
        {/* Status Pill */}
        <div
          className={`px-2 py-2 rounded text-sm font-bold text-center self-center ${mapStatusToColor(status)}`}
        >
          {status}
        </div>

        {/* Comment 
        <div className="text-sm text-gray-500">
          {comment || ""}
        </div>
*/}
        {/* File Download Button */}
        <div className="flex gap-2 justify-end self-center">
          {/* <IconButton
            iconProps={{ iconName: "View" }}
            title="View Application"
            onClick={() => onView(app)}
            aria-label={`View ${title}`}
          /> */}
          <IconButton
            iconProps={{ iconName: "Edit" }}
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
          />
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
          <p className="font-semibold">{label}</p>
          <a href="#" className="text-sm text-gray-500 underline">
            {link}
          </a>
        </div>
      </div>
    );
  };
  const SummaryCards = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 border border-[#FAE7DD] rounded-xl mt-10 mb-6">
        <SummaryCard
          number={applications.length.toString()}
          label="Total Requests"
          link="Check all requests"
          color="bg-[#1D2153]"
        />

        <SummaryCard
          number={applications
            .filter(
              (app) =>
                app[ApplicationKeys.STATUS_FORMATTED]
                  .toLowerCase()
                  .indexOf("reject") !== -1,
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
                app[ApplicationKeys.STATUS_FORMATTED]
                  .toLowerCase()
                  .indexOf("approve") !== -1,
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
                My Grant Status
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
              <h2 className="text-xl font-semibold">Applications</h2>

              {/* <Link
                to="/applyapplication"
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
              <div className="px-5 py-10 text-center text-muted-foreground">
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
                    const submitted =
                      (app[
                        ApplicationKeys.SUBMISSIONDATE_FORMATTED
                      ] as string) ?? "-";
                    const researchArea =
                      (app[ApplicationKeys.RESEARCHAREA_FORMATTED] as string) ??
                      "-";
                    const grantCycle =
                      (app[ApplicationKeys.GRANTCYCLE_FORMATTED] as string) ??
                      "-";
                    const status =
                      (app[ApplicationKeys.STATUS_FORMATTED] as string) ??
                      "Unknown";
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
            <div className="border border-[#FAE7DD] my-8"></div>
            {/* Summary Section */}
            <SummaryCards />
          </div>
        </section>
      </div>
    </>
  );
}
