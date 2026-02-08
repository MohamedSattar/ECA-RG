// ...existing code...
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Reveal from "@/motion/Reveal";
import { useDataverseApi } from "@/hooks/useDataverseApi";
import { ApplicationKeys, ContactKeys, TableName } from "@/constants/index";
import { useAuth } from "@/state/auth";
import { OverlayLoader } from "@/components/Loader";
import { IconButton } from "@fluentui/react";


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

export default function ApplicationsNew() {
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
      const res = await callApi<{value:any}>({ url: currentUserApplicationURL, method: "GET" });
      const list = res?.value ?? [];
      console.log("Fetched applications:", list);
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

  const onView = (item:any) => {
    const title = (item[ApplicationKeys.APPLICATIONTITLE] as string) ?? "Application";
    navigate("/applyapplication", {
      state: {
        applicationId: item[ApplicationKeys.APPLICATIONID],
        grantCycleId: item[ApplicationKeys.GRANTCYCLE],
        researchAreaId: item[ApplicationKeys.RESEARCHAREA],
        formType:"view",
        item:item
      }
    });
  };

  const onEdit = (item: any) => {
    const title = (item[ApplicationKeys.APPLICATIONTITLE] as string) ?? "Application";
    navigate("/applyapplication", {
      state: {
        applicationId: item[ApplicationKeys.APPLICATIONID],
        grantCycleId: item[ApplicationKeys.GRANTCYCLE],
        researchAreaId: item[ApplicationKeys.RESEARCHAREA],
        formType:"edit",
        item: item,
      }
    });

  };

  return (
    <section className="bg-white">
      <div className="container py-16">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="text-xs tracking-[0.25em] text-[#8c5a3d] uppercase">Dashboard</div>
              <h1 className="mt-1 text-3xl md:text-4xl font-bold tracking-tight text-[#2b201a]">Applications</h1>
              <p className="mt-2 text-muted-foreground">Review and manage your submitted grant applications.</p>
            </div>

            <Link
              to="/applyapplication"
              className="inline-flex shrink-0 items-center rounded-md bg-[#e78f6a] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#de835c]"
            >
              Apply for a Grant
            </Link>
          </div>
        </Reveal>

        <Reveal className="mt-8">
          <div className="rounded-xl border overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f6e4d8]">
                  <tr className="text-left">
                    <th className="px-3 py-3 font-semibold text-[#2b201a]">Application Reference</th>
                    <th className="px-3 py-3 font-semibold text-[#2b201a]">Application Title</th>
                    <th className="px-3 py-3 font-semibold text-[#2b201a]">Submitted date</th>
                    <th className="px-3 py-3 font-semibold text-[#2b201a]">Research Area</th>
                    <th className="px-3 py-3 font-semibold text-[#2b201a]">Grant Cycle</th>
                    <th className="px-3 py-3 font-semibold text-[#2b201a]">Status</th>
                    <th className="px-3 py-3 font-semibold text-[#2b201a]">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <OverlayLoader isVisible={loading} label="Your request is being processed..." />
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-red-600">
                        {error}
                      </td>
                    </tr>
                  ) : applications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                        No applications yet. Click "Apply for a Grant" to start your first application.
                      </td>
                    </tr>
                  ) : (
                    applications.map((app) => {
                      const id = (app[ApplicationKeys.APPLICATIONID] as string) ?? Math.random().toString(36);
                      const title = (app[ApplicationKeys.APPLICATIONTITLE] as string) ?? "Untitled";
                      const submitted = (app[ApplicationKeys.SUBMISSIONDATE_FORMATTED] as string) ?? "-";
                      const researchArea = (app[ApplicationKeys.RESEARCHAREA_FORMATTED] as string) ?? "-";
                      const grantCycle = (app[ApplicationKeys.GRANTCYCLE_FORMATTED] as string) ?? "-";
                      const status = (app[ApplicationKeys.STATUS_FORMATTED] as string) ?? "Unknown";
                      const applicationNumber =(app[ApplicationKeys.APPLICATIONNUMBER] as string) ?? "-";
                      return (
                        <tr key={id} className="border-t hover:bg-slate-50">
                          <td className="px-3 py-3 font-medium text-[#2b201a]">{applicationNumber}</td>
                          <td className="px-3 py-3 font-medium text-[#2b201a]">{title}</td>
                          <td className="px-3 py-3 text-muted-foreground">{submitted}</td>
                          <td className="px-3 py-3 text-muted-foreground">{researchArea}</td>
                          <td className="px-3 py-3 text-muted-foreground">{grantCycle}</td>
                          <td className="px-3 py-3">
                            <StatusBadge value={status} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <IconButton
                                iconProps={{iconName:"View"}}
                                title="View Application"
                                onClick={() => onView(app)}                              
                                aria-label={`View ${title}`}
                              />                                

                              <IconButton
                                iconProps={{iconName:"Edit"}}
                                title="Edit Application"
                                onClick={() => onEdit(app)}                          
                                aria-label={`Edit ${title}`}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
