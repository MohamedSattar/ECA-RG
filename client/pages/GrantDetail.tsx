// ...existing code...
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Reveal from "@/motion/Reveal";
import { useDataverseApi } from "@/hooks/useDataverseApi";
import { normalizeImageUrl } from "@/lib/utils";
import {
  ApplicationKeys,
  ContactKeys,
  TableName,
  ResearchAreaKeys,
  GrantCycleKeys,
} from "@/constants/index";
import { useAuth } from "@/state/auth";
import { OverlayLoader } from "@/components/Loader";
import { Icon, IconButton } from "@fluentui/react";
import WorkflowTimeline from "@/components/WorkFlowHistory";
import { toast } from "sonner";

export default function GrantDetail() {
  const { id } = useParams<{ id: string }>();
  const { callApi } = useDataverseApi();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [grantCycles, setGrantCycles] = useState<any[]>([]);
  const [researchArea, setResearchArea] = useState<any | null>(null);
  const [grantTemplate, setGrantTemplate] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreatingApplication, setIsCreatingApplication] =
    useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: replace with actual current user id from auth context
  const currentUserId = user?.contact?.[ContactKeys.CONTACTID] || "";

  const select = `${ApplicationKeys.APPLICATIONID},${ApplicationKeys.APPLICATIONTITLE},${ApplicationKeys.SUBMISSIONDATE_FORMATTED},
  ${ApplicationKeys.RESEARCHAREA_FORMATTED},${ApplicationKeys.GRANTCYCLE_FORMATTED},${ApplicationKeys.STATUS_FORMATTED}`;
  const filter = `${ApplicationKeys.MAINAPPLICANT} eq ${currentUserId}`;
  const currentUserApplicationURL = `/_api/${TableName.APPLICATIONS}?$select=*&$filter=${filter}`;

  const loadResearchArea = async () => {
    if (!id) {
      setError("No research area ID provided.");
      setLoading(false);
      return;
    }

    try {
      const url = `/_api/${TableName.RESEARCHAREAS}(${id})?$expand=prmtk_GrantCycle`;
      const res = await callApi<any>({ url, method: "GET" });
      console.log("Fetched research area:", res);
      setResearchArea(res);
    } catch (err) {
      console.error("Failed to load research area:", err);
      setError("Unable to load research area details. Please try again later.");
    }
  };

  const loadGrantCycles = async () => {
    if (!id) return;

    try {
      // Fetch all grant cycles and filter by research area
      const url = `/_api/${TableName.GRANTCYCLES}?$select=*&$expand=prmtk_researchareas&$filter=prmtk_researchareas/any(r: r/prmtk_researchareaid eq ${id})`;
      const res = await callApi<{ value: any[] }>({ url, method: "GET" });
      const cycles = res?.value ?? [];
      console.log("Fetched grant cycles for research area:", cycles);
      setGrantCycles(cycles);
    } catch (err) {
      console.error("Failed to load grant cycles:", err);
    }
  };

  const loadGrantTemplate = async () => {
    try {
      const url = `/_api/prmtk_granttemplates`;
      const res = await callApi<{ value: any[] }>({ url, method: "GET" });
      const templates = res?.value ?? [];
      console.log("Fetched grant templates:", templates);
      // Use the first template or filter by grant cycle if needed
      if (templates.length > 0) {
        setGrantTemplate(templates[0]);
      }
    } catch (err) {
      console.error("Failed to load grant template:", err);
    }
  };

  const loadApps = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadResearchArea(),
        loadGrantCycles(),
        loadGrantTemplate(),
      ]);
      const res = await callApi<{ value: any }>({
        url: currentUserApplicationURL,
        method: "GET",
      });
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

  // Function to download template file
  const downloadTemplate = async (fieldName: string, fileName: string) => {
    if (!grantTemplate) {
      toast.error("Grant template not loaded");
      return;
    }

    try {
      const grantTemplateId = grantTemplate.prmtk_granttemplateid;
      const downloadUrl = `/_api/prmtk_granttemplates(${grantTemplateId})/${fieldName}/$value`;
      return window.open(downloadUrl, "_blank");
    } catch (err) {
      console.error("Failed to download template:", err);
      toast.error("Failed to download file. Please try again.");
    }
  };

  const handleApplyForGrant = async () => {
    if (!user?.contact?.[ContactKeys.CONTACTID]) {
      toast.error("Please log in to apply for a grant.");
      return;
    }

    const researchAreaId = id; // from useParams
    const grantCycleId =
      researchArea?.prmtk_GrantCycle?.[GrantCycleKeys.GRANTCYCLEID];

    if (!grantCycleId || !researchAreaId) {
      toast.error("Grant cycle or research area information is missing.");
      return;
    }

    setIsCreatingApplication(true);
    try {
      // Fetch all applications
      const response = await callApi<{ value: any[] }>({
        url: `/_api/${TableName.APPLICATIONS}`,
        method: "GET",
      });

      const allApplications = response?.value || [];

      // Check if an application already exists with same grant cycle, research area, and user
      const existingApplication = allApplications.find(
        (app) =>
          app._prmtk_grantcycle_value === grantCycleId &&
          app._prmtk_researcharea_value === researchAreaId &&
          app._prmtk_mainapplicant_value ===
            user.contact[ContactKeys.CONTACTID],
      );

      if (existingApplication) {
        // Navigate to view/edit the existing application
        toast.success("Redirecting to your application...");
        navigate(
          `/applyapplication?grantCycleId=${grantCycleId}&researchAreaId=${researchAreaId}&formType=view&item=${existingApplication.prmtk_applicationid}`,
        );
      } else {
        // Create a new draft application
        const applicationData = {
          [ApplicationKeys.APPLICATIONTITLE]: "Draft Application",
          [ApplicationKeys.ABSTRACT]: "Draft",
          [ApplicationKeys.SUBMISSIONDATE]: new Date().toISOString(),
          [ApplicationKeys.MAINAPPLICANT_ID]: `/${TableName.CONTACTS}(${user.contact[ContactKeys.CONTACTID]})`,
          [ApplicationKeys.GRANTCYCLE_ID]: `/${TableName.GRANTCYCLES}(${grantCycleId})`,
          [ApplicationKeys.RESEARCHAREA_ID]: `/${TableName.RESEARCHAREAS}(${researchAreaId})`,
          [ApplicationKeys.STATUS]: 1, // Draft status
        };

        const res = await callApi<{
          value: any;
          status?: number;
          headers?: Headers;
        }>({
          url: `/_api/${TableName.APPLICATIONS}`,
          method: "POST",
          data: applicationData,
        });

        if (!res || (res.status && res.status >= 400)) {
          throw new Error("Failed to create application.");
        }

        const applicationId = res?.headers
          ?.get("OData-EntityId")
          ?.match(/\(([^)]+)\)/)?.[1];

        if (!applicationId) {
          throw new Error("Failed to retrieve application ID.");
        }

        toast.success("Application created successfully!");
        navigate(
          `/applyapplication?item=${applicationId}&grantCycleId=${grantCycleId}&researchAreaId=${researchAreaId}&formType=view`,
        );
      }
    } catch (error) {
      console.error("Error handling grant application:", error);
      toast.error(
        "Failed to create or retrieve application. Please try again.",
      );
    } finally {
      setIsCreatingApplication(false);
    }
  };

  const InfoRow = ({ label, value }) => {
    return (
      <div className="flex justify-between text-sm text-[#1D2054]-700">
        <span className="font-medium">{label}</span>
        <span>{value}</span>
      </div>
    );
  };

  const ResourceButton = ({ label, iconName, onClick }) => {
    return (
      <button
        onClick={onClick}
        className="w-full text-white hover:text-black text-left bg-[#66968A] px-4 py-4 rounded-lg mb-2 transition-colors"
      >
        <img
          src={`/images/icon/${iconName}.png`}
          alt={`${label} icon`}
          className="inline-block mr-5"
        />
        {label}
      </button>
    );
  };

  return (
    <>
      {/* Header Banner */}
      <section className="relative overflow-hidden bg-[#1D2054]">
        <Reveal>
          <div className="container py-4 md:py-4 grid gap-10 md:grid-cols-2 items-center">
            <div className="max-w-2xl flex flex-col gap-4">
              <h1 className="text-2xl md:text-6xl font-extrabold leading-tight tracking-tight text-white">
                Grant Details
              </h1>
              <div className="text-2xl text-[#F7D85C]">
                {loading
                  ? "Loading..."
                  : researchArea?.[ResearchAreaKeys.AREANAME] ||
                    "Early Childhood Development & Learning outComes"}
              </div>
              <p className="text-white text-lg">
                {loading
                  ? "Loading..."
                  : researchArea?.prmtk_GrantCycle?.[
                      GrantCycleKeys.CYCLENAME
                    ] || "Research Grant 2024-2025 Cycle"}{" "}
                | Abu Dhabi Early Childhood Authority
              </p>
            </div>

            {/* Hero Collage */}
            <div className="relative flex justify-center md:justify-end">
              <img
                src={
                  researchArea?.[ResearchAreaKeys.THUMBNAIL_URL]
                    ? (() => {
                        const normalizedUrl = normalizeImageUrl(researchArea[ResearchAreaKeys.THUMBNAIL_URL]);
                        // Ensure full=true is appended for better image quality
                        return normalizedUrl && !normalizedUrl.includes('full=true')
                          ? `${normalizedUrl}${normalizedUrl.includes('?') ? '&' : '?'}full=true`
                          : normalizedUrl;
                      })()
                    : "/images/GrantDetail.png"
                }
                alt="Illustration"
                className={"h-auto w-auto m-auto rounded-lg"}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/GrantDetail.png";
                }}
              />
            </div>
          </div>
        </Reveal>
      </section>
      {/* Page Content */}
      <section className="bg-white">
        <div className="container py-8 md:py-8">
          {/* Banner */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 space-y-10">
              <div className="mx-auto flex justify-between items-center bg-light border border-dotted border-green-300 p-4 rounded-lg mb-6">
                <span className="text-green-700 font-medium">
                  ✔ GRANT CURRENTLY OPEN
                </span>
                <span className="text-sm font-medium">
                  Deadline:{" "}
                  {researchArea?.prmtk_GrantCycle?.[
                    GrantCycleKeys.ENDDATE_FORMATTED
                  ] || "March 15, 2025"}
                </span>
                {/* Apply Button */}
              </div>
              {/* Tabs */}
              <div className="flex space-x-6 pb-3 text-sm border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`pb-2 font-semibold transition-colors ${
                    activeTab === "overview"
                      ? "text-orange-500 border-b-2 border-orange-500"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("eligibility")}
                  className={`pb-2 font-semibold transition-colors ${
                    activeTab === "eligibility"
                      ? "text-orange-500 border-b-2 border-orange-500"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Eligibility
                </button>
                <button
                  onClick={() => setActiveTab("application")}
                  className={`pb-2 font-semibold transition-colors ${
                    activeTab === "application"
                      ? "text-orange-500 border-b-2 border-orange-500"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Application Process
                </button>
                <button
                  onClick={() => setActiveTab("faq")}
                  className={`pb-2 font-semibold transition-colors ${
                    activeTab === "faq"
                      ? "text-orange-500 border-b-2 border-orange-500"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  FAQ
                </button>
              </div>

              {/* Tab Content */}
              <div className="mt-6">
                {activeTab === "overview" && (
                  <>
                    {/* Research Grant Overview */}
                    <section>
                      <h2 className="text-2xl font-semibold mb-2 text-[#391400]">
                        Research Grant Overview
                      </h2>
                      {grantTemplate?.prmtk_overview ? (
                        <div
                          className="text-gray-700 leading-7"
                          dangerouslySetInnerHTML={{
                            __html: grantTemplate.prmtk_overview,
                          }}
                        />
                      ) : (
                        <p className="text-gray-700 leading-7">
                          {researchArea?.[ResearchAreaKeys.AREADESCRIPTION] ||
                            `The Abu Dhabi Early Childhood Authority (ECA) invites research proposals focused on advancing
                          knowledge in early childhood development and learning outcomes. This grant supports innovative
                          research that will contribute to evidence-based policy and practice in early childhood education across
                          the Abu Dhabi region.`}
                        </p>
                      )}
                    </section>

                    {/* Research Focus Areas */}
                    <div className="container h-[1px] bg-lightorange mt-8"></div>
                    <section className="mt-8">
                      <h2 className="text-2xl font-semibold mb-4 text-[#391400]">
                        Research Focus Areas
                      </h2>
                      <ul className="text-gray-700 list-disc pl-5 space-y-2">
                        <li>
                          Cognitive and socio-emotional development in children
                          aged 0–8 years
                        </li>
                        <li>
                          Impact of early childhood interventions on learning
                          outcomes
                        </li>
                        <li>
                          Quality indicators in early childhood education
                          settings
                        </li>
                        <li>Family engagement and parental support programs</li>
                        <li>
                          Assessment and measurement tools for early learning
                        </li>
                        <li>
                          Cultural and contextual factors affecting child
                          development
                        </li>
                      </ul>
                    </section>

                    {/* What We're Looking For */}
                    <div className="container h-[1px] bg-lightorange mt-8"></div>
                    <section className="mt-8">
                      <h2 className="text-2xl font-semibold mb-4 text-[#391400]">
                        What We're Looking For
                      </h2>
                      <ul className="text-gray-700 list-disc pl-5 space-y-2">
                        <li>
                          Address critical gaps in early childhood research
                          within the Abu Dhabi context
                        </li>
                        <li>
                          Employ rigorous research methodologies (qualitative,
                          quantitative, or mixed)
                        </li>
                        <li>
                          Demonstrate potential for practical application and
                          policy impact
                        </li>
                        <li>Include clear dissemination plans</li>
                        <li>Show feasibility within timeline and budget</li>
                      </ul>
                    </section>

                    {/* Important Note */}
                    <div className="bg-red-50 border borderLeftthink bg-light p-4 rounded-lg text-sm text-[#391400] mt-8">
                      <strong>Important:</strong> All research must comply with
                      ethical standards and obtain necessary approvals from
                      relevant ethics committees before commencement.
                    </div>
                  </>
                )}

                {activeTab === "eligibility" && (
                  <section>
                    <h2 className="text-2xl font-semibold mb-4 text-[#391400]">
                      Eligibility Criteria
                    </h2>
                    {grantTemplate?.prmtk_eligibility ? (
                      <div
                        className="text-gray-700 leading-7"
                        dangerouslySetInnerHTML={{
                          __html: grantTemplate.prmtk_eligibility,
                        }}
                      />
                    ) : (
                      <p className="text-gray-700 leading-7">
                        Eligibility information will be available soon.
                      </p>
                    )}
                  </section>
                )}

                {activeTab === "application" && (
                  <section>
                    <h2 className="text-2xl font-semibold mb-4 text-[#391400]">
                      Application Process
                    </h2>
                    {grantTemplate?.prmtk_applicationprocess ? (
                      <div
                        className="text-gray-700 leading-7"
                        dangerouslySetInnerHTML={{
                          __html: grantTemplate.prmtk_applicationprocess,
                        }}
                      />
                    ) : (
                      <p className="text-gray-700 leading-7">
                        Application process information will be available soon.
                      </p>
                    )}

                    {grantTemplate?.prmtk_reviewprocess && (
                      <>
                        <div className="container h-[1px] bg-lightorange mt-8"></div>
                        <h3 className="text-xl font-semibold mb-4 text-[#391400] mt-8">
                          Review Process
                        </h3>
                        <div
                          className="text-gray-700 leading-7"
                          dangerouslySetInnerHTML={{
                            __html: grantTemplate.prmtk_reviewprocess,
                          }}
                        />
                      </>
                    )}
                  </section>
                )}

                {activeTab === "faq" && (
                  <section>
                    <h2 className="text-2xl font-semibold mb-4 text-[#391400]">
                      Frequently Asked Questions
                    </h2>
                    {grantTemplate?.prmtk_faq ? (
                      <div
                        className="text-gray-700 leading-7"
                        dangerouslySetInnerHTML={{
                          __html: grantTemplate.prmtk_faq,
                        }}
                      />
                    ) : (
                      <p className="text-gray-700 leading-7">
                        FAQ information will be available soon.
                      </p>
                    )}
                  </section>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-8">
              <button
                onClick={handleApplyForGrant}
                disabled={isCreatingApplication || loading}
                className="w-full bg-orange hover:bg-orange-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingApplication
                  ? "PROCESSING..."
                  : "APPLY FOR THE GRANT"}
              </button>

              {/* Key Information Card */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Key Information</h3>

                <div className="bg-[#92CBE8] p-6 rounded-xl space-y-3">
                  <InfoRow
                    label="Grant Amount:"
                    value={
                      researchArea?.[
                        "prmtk_allocatedbudget@OData.Community.Display.V1.FormattedValue"
                      ] || "AED 50,000 - 200,000"
                    }
                  />
                  <InfoRow
                    label="Duration:"
                    value={
                      researchArea?.prmtk_GrantCycle?.[
                        "prmtk_cycleduration@OData.Community.Display.V1.FormattedValue"
                      ] || "12–24 months"
                    }
                  />
                  <InfoRow
                    label="Application Opens:"
                    value={
                      researchArea?.prmtk_GrantCycle?.[
                        GrantCycleKeys.STARTDATE_FORMATTED
                      ] || "Jan 15, 2025"
                    }
                  />
                  <InfoRow
                    label="Application Deadline:"
                    value={
                      researchArea?.prmtk_GrantCycle?.[
                        GrantCycleKeys.ENDDATE_FORMATTED
                      ] || "Mar 15, 2025"
                    }
                  />
                  {/* <InfoRow
                    label="Decision Date:"
                    value={
                      researchArea?.prmtk_GrantCycle?.[
                        "prmtk_decisiondate@OData.Community.Display.V1.FormattedValue"
                      ] || "May 15, 2025"
                    }
                  />
                  <InfoRow
                    label="Grant Start Date:"
                    value={
                      researchArea?.prmtk_GrantCycle?.[
                        "prmtk_grantstartdate@OData.Community.Display.V1.FormattedValue"
                      ] || "June 1, 2025"
                    }
                  /> */}
                </div>
              </div>

              {/* Resources */}
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Important Resources
                </h3>
                {grantTemplate?.prmtk_applicationguidelines && (
                  <ResourceButton
                    label="Application Guidelines"
                    iconName="Application"
                    onClick={() =>
                      downloadTemplate(
                        "prmtk_applicationguidelines",
                        grantTemplate.prmtk_applicationguidelines_name ||
                          "Application_Guidelines.pdf",
                      )
                    }
                  />
                )}
                {grantTemplate?.prmtk_budgettemplate && (
                  <ResourceButton
                    label="Budget Template"
                    iconName="Budget"
                    onClick={() =>
                      downloadTemplate(
                        "prmtk_budgettemplate",
                        grantTemplate.prmtk_budgettemplate_name ||
                          "Budget_Template.xlsx",
                      )
                    }
                  />
                )}
                {grantTemplate?.prmtk_applicanthandbook && (
                  <ResourceButton
                    label="Application Handbook"
                    iconName="Ethics"
                    onClick={() =>
                      downloadTemplate(
                        "prmtk_applicanthandbook",
                        grantTemplate.prmtk_applicanthandbook_name ||
                          "Application_Handbook.pdf",
                      )
                    }
                  />
                )}
                {grantTemplate?.prmtk_statusreporttemplate && (
                  <ResourceButton
                    label="Reporting Templates"
                    iconName="Report"
                    onClick={() =>
                      downloadTemplate(
                        "prmtk_statusreporttemplate",
                        grantTemplate.prmtk_statusreporttemplate_name ||
                          "Reporting_Template.pdf",
                      )
                    }
                  />
                )}
                {!grantTemplate && (
                  <p className="text-sm text-gray-500">Loading resources...</p>
                )}
              </div>

              {/* Contact Box */}
              <div className="bg-white-100 border-8 border-yellow-300 p-4 rounded-xl">
                <h3 className="font-semibold mb-5">Need Help?</h3>
                <p className="font-medium mb-3">Research Grants Team</p>
                <p className="text-sm mb-1">📧 researchgrants@eca.gov.ae</p>
                <p className="text-sm mb-1">📞 +971 2 XXX XXXX</p>
                <p className="text-sm mb-1">🕒 Sun–Thu: 8:00 AM – 4:00 PM</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {loading && (
        <OverlayLoader isVisible={true} label="Loading grant details..." />
      )}
    </>
  );
}
