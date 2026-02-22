import { Link, useNavigate } from "react-router-dom";
import Reveal from "@/motion/Reveal";
import { useDataverseApi } from "@/hooks/useDataverseApi";
import { ContactKeys, ResearchKeys, TableName } from "@/constants/index";
import { useAuth } from "@/state/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconButton } from "@fluentui/react/lib/Button";

function StatusBadge({ value }: { value?: string | null }) {
  const cls =
    value === "Approved"
      ? "bg-green-100 text-green-800 border-green-200"
      : value === "Rejected"
        ? "bg-red-100 text-red-800 border-red-200"
        : value === "In Review"
          ? "bg-amber-100 text-amber-800 border-amber-200"
          : value === "Submitted"
            ? "bg-blue-100 text-blue-800 border-blue-200"
            : "bg-slate-100 text-slate-800 border-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {value}
    </span>
  );
}

export default function Researches() {
  const { callApi } = useDataverseApi();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [researches, setResearches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = user?.contact?.[ContactKeys.CONTACTID] || "";

  const select = `*,${ResearchKeys.PRINCIPALINVESTIGATOR}`;
  const filter = `${ResearchKeys.PRINCIPALINVESTIGATOR} eq ${currentUserId}`;
  const currentUserApplicationURL = `/_api/${TableName.RESEARCHES}?$select=${select}&$filter=${filter}`;

  const loadResearches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await callApi<{ value: any }>({
        url: currentUserApplicationURL,
        method: "GET",
      });
      const list = res?.value ?? [];
      console.log("Fetched applications:", list);
      setResearches(list);
    } catch (err) {
      console.error("Failed to load applications:", err);
      setError("Unable to load applications. Please try again later.");
      setResearches([]);
    } finally {
      setLoading(false);
    }
  }, [callApi, currentUserApplicationURL]);

  useEffect(() => {
    if (!currentUserId) return;
    loadResearches();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when contact ID is available
  }, [currentUserId]);

  const applicationResearches = useMemo(() => researches || [], [researches]);

  const onView = (item: any) => {
    navigate(
      `/applyresearch?applicationId=${item[ResearchKeys.APPLICATIONREFERENCE]}&researchId=${item[ResearchKeys.RESEARCHID]}&formType=view`,
      {
        state: {
          applicationId: item[ResearchKeys.APPLICATIONREFERENCE],
          researchId: item[ResearchKeys.RESEARCHID],
          formType: "view",
          item: item,
        },
      },
    );
  };

  const onEdit = (item: any) => {
    navigate(
      `/applyresearch?applicationId=${item[ResearchKeys.APPLICATIONREFERENCE]}&researchId=${item[ResearchKeys.RESEARCHID]}&formType=edit`,
      {
        state: {
          applicationId: item[ResearchKeys.APPLICATIONREFERENCE],
          researchId: item[ResearchKeys.RESEARCHID],
          formType: "edit",
          item: item,
        },
      },
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
                My Research Status
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
      <section className="bg-white">
        <div className="container py-16">
          <Reveal className="mt-8">
            <div className="rounded-xl border overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#1D2054]">
                    <tr className="text-left">
                      <th className="px-6 py-3 font-semibold text-white">
                        Research Title
                      </th>
                      <th className="px-6 py-3 font-semibold text-white">
                        Application Reference
                      </th>
                      <th className="px-6 py-3 font-semibold text-white">
                        Research Area
                      </th>
                      <th className="px-6 py-3 font-semibold text-white">
                        Principal Investigator
                      </th>
                      <th className="px-6 py-3 font-semibold text-white">
                        Status
                      </th>
                      <th className="px-6 py-3 font-semibold text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {researches.map((item, idx) => (
                      <tr
                        key={item[ResearchKeys.RESEARCHID]}
                        className={`border-t ${
                          idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                        } hover:shadow-sm transition-shadow`}
                      >
                        <td className="px-6 py-3 font-medium text-[#1e293b]">
                          {item[ResearchKeys.RESEARCHTITLE]}
                        </td>
                        <td className="px-6 py-3 font-medium text-[#1e293b]">
                          {item[ResearchKeys.APPLICATIONREFERENCE_FORMATTED]}
                        </td>
                        <td className="px-6 py-3 font-medium text-[#1e293b]">
                          {item[ResearchKeys.RESEARCHAREA_FORMATTED]}
                        </td>
                        <td className="px-6 py-3 font-medium text-[#1e293b]">
                          {item[ResearchKeys.PRINCIPALINVESTIGATOR_FORMATTED]}
                        </td>
                        <td className="px-6 py-3">
                          {item[ResearchKeys.RESEARCHSTATUS_FORMATTED] &&
                            item[ResearchKeys.RESEARCHSTATUS_FORMATTED] !=
                              null && (
                              <StatusBadge
                                value={
                                  item[ResearchKeys.RESEARCHSTATUS_FORMATTED]
                                }
                              />
                            )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <IconButton
                              onClick={() => onEdit(item)}
                              title="Edit Research"
                              aria-label={`Edit ${item.title}`}
                              iconProps={{ iconName: "Edit" }}
                              styles={{
                                root: { color: "#1D2054" },
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {researches.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-10 text-center text-[#475569]"
                        >
                          No researches yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
