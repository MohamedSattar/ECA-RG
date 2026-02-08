import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, User } from "lucide-react";
import Reveal from "@/motion/Reveal";
import { useDataverseApi } from "@/hooks/useDataverseApi";
import {
  ApplicationFields,
  ApplicationKeys,
  ContactKeys,
  ExpandRelations,
  GrantCycleKeys,
  ResearchAreaKeys,
  TableName,
} from "@/constants/index";
import {
  PrimaryButton,
  DefaultButton,
  TextField,
  ButtonType,
} from "@fluentui/react";
import { useAuth } from "@/state/auth";
import { toast } from "sonner";
import { daysLeft, formatAedMillion } from "@/services/utility";
import { FaChalkboardTeacher, FaPhoneAlt } from "react-icons/fa";
import { BsBriefcaseFill } from "react-icons/bs";
import Spacer from "@/components/spacer";
import { Loader } from "@/components/Loader";

// ============================================================================
// Constants
// ============================================================================

const BLOG_ITEMS = [
  {
    k: "Announcement",
    t: "New Grant Cycle Opening Soon!",
    d: "5 Nov, 2025",
    img: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1400&auto=format&fit=crop",
  },
  {
    k: "Research",
    t: "Sustainable environment research",
    d: "29 Oct, 2025",
    img: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1400&auto=format&fit=crop",
  },
  {
    k: "Research",
    t: "Smart cities innovative plans",
    d: "21 Oct, 2025",
    img: "https://images.unsplash.com/photo-1504384308090-5e1e9021e36e?q=80&w=1400&auto=format&fit=crop",
  },
];

const STEPS = [
  { n: 1, t: "Register an account" },
  { n: 2, t: "Apply for a Grant" },
  { n: 3, t: "Track your Application" },
];

// ============================================================================
// Sub-Components
// ============================================================================

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-primary">
        {value}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Step({ index, title }: { index: number; title: string }) {
  /* Mask */

  return (
    <li className="relative">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-md shadow-[0_6px_0_rgba(0,0,0,0.2)] bg-gradient-to-b from-[#ffd87a] to-[#e78f6a] text-[#2b201a] font-extrabold grid place-items-center text-2xl">
          {index}
        </div>
        <div className="text-lg md:text-xl font-semibold">{title}</div>
      </div>
      <div className="mt-3 h-px w-full bg-white/20" />
    </li>
  );
}

interface GrantCardProps {
  GrantCycleKeyId: string;
  number: number;
  title: string;
  ResearchAreaKeyId: string;
  image: string;
  description: string;
  reverse?: boolean;
  item?: string;
  navigate: (path: string, options?: any) => void;
}

function GrantCard({
  GrantCycleKeyId,
  number,
  title,
  ResearchAreaKeyId,
  image,
  description,
  reverse = false,
  item,
  navigate,
  onApplyClick,
}: GrantCardProps & {
  onApplyClick: (grantCycleId: string, researchAreaId: string) => void;
}) {
  return (
    <article
      className={`grid gap-10 items-center animate-in fade-in-50 slide-in-from-bottom-2 duration-700 ${
        reverse ? "md:grid-cols-[1fr_1.2fr]" : "md:grid-cols-[1.2fr_1fr]"
      }`}
    >
      <div
        className={`relative h-48 sm:h-64   ${
          reverse ? ".col-first" : "col-last"
        }`}
      >
        <img
          src={`/images/icon/Mask.png`}
          alt={`${title} visual`}
          className="absolute top-3 right-10 w-32 h-32 z-10"
        />
        <img
          src={`/images/icon/Vector.png`}
          alt={`${title} visual`}
          className="absolute top-3 left-10 w-32 h-60 z-10"
        />
        <img
          src={`/images/icon/Oval.png`}
          alt={`${title} visual`}
          className="absolute bottom-[-4rem] right-12 w-32 h-40 z-0"
        />
        <img
          src={`/${image}&full=true`}
          alt={`${title} visual`}
          className="absolute inset-0 w-80 rounded-2xl m-auto z-20"
        />
      </div>
      <div className="space-y-4">
        <div className="text-lg tracking-[0.25em] text-[#EF6D58] uppercase">
          Grant No.{number}
        </div>
        <h3 className="text-5xl md:text-2xl font-extrabold tracking-tight text-[#1D2054]">
          {title}
        </h3>
        <div className="text-sm text-muted-foreground">{description}</div>
        <div className="grid gap-10">
          <div className="pt-3 flex flex-col sm:flex-row gap-3">
            <PrimaryButton
              className="bg-[#E26E50]"
              onClick={() => onApplyClick(GrantCycleKeyId, ResearchAreaKeyId)}
              text="APPLY FOR A GRANT"
            />
            <DefaultButton
              onClick={() => navigate(`/grantdetail/${ResearchAreaKeyId}`)}
              text="See more info >"
              className="text-[#1D2054]"
              styles={{
                root: {
                  border: " none",
                  backgroundColor: "transparent",
                  color: "#1D2054",
                },
                rootHovered: {
                  backgroundColor: "transparent",
                  color: "#1D2054",
                },
              }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

interface FaqItemProps {
  question: string;
  answers: string[];
  isOpen?: boolean;
}

function FaqItem({ question, answers, isOpen = false }: FaqItemProps) {
  return (
    <details
      className="group border-t first:border-t-0 border-color-orange animate-in fade-in-50 duration-700"
      open={isOpen}
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-4 p-3">
          <h3 className="font-semibold text-brown text-base">{question}</h3>
          <span className="shrink-0 grid h-6 w-6 place-items-center rounded-full bg-orange text-white">
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          </span>
        </div>
      </summary>
      <div className="px-3 py-3 text-sm text-muted-foreground space-y-2 text-light-brown">
        {answers.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </details>
  );
}

interface BlogCardProps {
  category: string;
  title: string;
  date: string;
  image: string;
}

function BlogCard({ category, title, date, image }: BlogCardProps) {
  return (
    <article className="rounded-xl border bg-white transition-transform duration-300 hover:-translate-y-1 animate-in fade-in-50 slide-in-from-bottom-2">
      <img
        src={image}
        alt={title}
        className="aspect-[16/10] w-full object-cover"
      />
      <div className="p-5">
        <div className="text-xl font-medium text-brown">{category}</div>
        <h3 className="mt-1 text-2xl font-semibold text-brown">{title}</h3>
        <div className="mt-2 text-xs text-light-brown">{date}</div>
      </div>
    </article>
  );
}

const SupportSection = () => {
  return (
    <div className="container py-8 md:py-10">
      {/* Header */}
      <div>
        <span className="tracking-[0.25em] text-xs text-[#92CBE8] uppercase">
          SUPPORT
        </span>
        <h2 className="my-4 text-2xl md:text-3xl text-white font-bold">
          How ECA <br /> Can Help
        </h2>
      </div>
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 mt-10">
        {/* Templates */}
        <div className="border border-[#92CBE8] p-8">
          <div className="h-16 w-16 rounded-full bg-[#F2784B] flex items-center justify-center mb-6">
            <FaChalkboardTeacher size={30} color="#fff" />
          </div>
          <h3 className="text-xl font-semibold mb-3 text-white">TEMPLATES</h3>
          <p className="text-[#D4DAEA] text-sm mb-4">
            Get Application forms and budget templates to support your app
          </p>
          <a href="#" className="text-[#FF623D] font-semibold hover:underline">
            Discover More
          </a>
        </div>

        {/* Guidelines */}
        <div className="border border-[#92CBE8] p-8">
          <div className="h-16 w-16 rounded-full bg-[#91CFF4] flex items-center justify-center mb-6">
            <BsBriefcaseFill size={28} color="#fff" />
          </div>
          <h3 className="text-xl font-semibold mb-3 text-white">GUIDELINES</h3>
          <p className="text-[#D4DAEA] text-sm mb-4">
            View Detailed application requirements and guidelines
          </p>
          <a href="#" className="text-[#FF623D] font-semibold hover:underline">
            Learn More
          </a>
        </div>

        {/* Contact Us */}
        <div className="border border-[#92CBE8] p-8">
          <div className="h-16 w-16 rounded-full bg-[#6AA685] flex items-center justify-center mb-6">
            <FaPhoneAlt size={26} color="#fff" />
          </div>
          <h3 className="text-xl font-semibold mb-3 text-white">CONTACT US</h3>
          <p className="text-[#D4DAEA] text-sm mb-4">
            Ask for Help from our experts research Grant team
          </p>
          <a href="#" className="text-[#FF623D] font-semibold hover:underline">
            Contact us
          </a>
        </div>
      </div>
    </div>
  );
};
const ThreeSteps = () => {
  return (
    <div className="container py-8 md:py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* LEFT SIDE */}
        <div>
          <h4 className="tracking-[0.25em] text-xs text-[#92CBE8] uppercase">
            THREE STEPS
          </h4>

          <h2 className="my-4 text-2xl md:text-3xl text-white font-bold">
            To Start Apply
          </h2>

          <p className="text-[#D4DAEA] text-sm leading-relaxed mb-6">
            Register your information, get verified, check active grants,
            <br />
            prepare the proposal and apply.
          </p>

          <a href="#" className="text-[#9AB0D6] text-sm hover:underline">
            Read More
          </a>
        </div>

        {/* RIGHT SIDE – STEPS */}
        <div className="flex flex-col gap-10">
          {/* Step 1 */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src="/images/Mask.png"
                alt="Mask"
                className="h-auto w-auto max-w-none"
              />
              <p className="text-[#F6D021] text-[75px] absolute left-[-20px] top-[-55px] w-[30px]">
                1
              </p>
            </div>
            <p className="text-lg font-semibold">Register an account</p>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src="/images/Mask.png"
                alt="Mask"
                className="h-auto w-auto max-w-none"
              />
              <p className="text-[#F6D021] text-[75px] absolute left-[-20px] top-[-55px] w-[30px]">
                2
              </p>
            </div>
            <p className="text-lg font-semibold">Apply for a Grant</p>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src="/images/Mask.png"
                alt="Mask"
                className="h-auto w-auto max-w-none"
              />
              <p className="text-[#F6D021] text-[75px] absolute left-[-20px] top-[-55px] w-[30px]">
                3
              </p>
            </div>
            <p className="text-lg font-semibold">Track your Application</p>
          </div>
        </div>
      </div>
    </div>
  );
};
// ============================================================================
// Main Page Component
// ============================================================================

export default function Index() {
  const { callApi } = useDataverseApi();
  const [grant, setGrant] = useState<any | null>(null);
  const [applications, setApplications] = useState<any[] | null>(null);
  const [grantTemplate, setGrantTemplate] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, login, logout, isAuthed, isLoading: isAuthLoading } = useAuth();
  const [isCreatingApplication, setIsCreatingApplication] = useState(false);
  // Helper: Format date to YYYY-MM-DD
  const getTodayDateString = (date?: Date): string => {
    const now = date || new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper: Calculate days until end date
  const daysUntil = (endDate: string | Date): number => {
    const today = new Date();
    const end = new Date(endDate);
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffMs = end.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  // Load grant template with FAQ
  const loadGrantTemplate = async () => {
    try {
      const url = `/_api/prmtk_granttemplates`;
      const res = await callApi<{ value: any[] }>({
        url,
        method: "GET",
        skipAuth: true, // Public API - no authentication needed
      });
      const templates = res?.value ?? [];
      if (templates.length > 0) {
        setGrantTemplate(templates[0]);
      }
    } catch (err) {
      console.error("Failed to load grant template:", err);
      // Gracefully continue - FAQ is optional
    }
  };

  // Load active grant cycle
  const loadGrants = async () => {
    try {
      setLoading(true);
      const select = `*,${GrantCycleKeys.ISPUBLISHED},${GrantCycleKeys.STATUS},${GrantCycleKeys.STARTDATE},${GrantCycleKeys.ENDDATE}`;
      const filter = `${GrantCycleKeys.ISPUBLISHED} eq true and ${GrantCycleKeys.STATUS} eq 2 and ${GrantCycleKeys.STARTDATE} lt '${getTodayDateString()}' and ${GrantCycleKeys.ENDDATE} gt '${getTodayDateString()}'`;
      const orderby = `${GrantCycleKeys.STARTDATE} asc`;
      const expand = `${ExpandRelations.RESEARCH_AREAS},${ExpandRelations.APPLICATIONS}`;
      const url = `/_api/${TableName.GRANTCYCLES}?$select=${select}&$expand=${expand}&$filter=${filter}&$orderby=${orderby}&$top=1`;

      const data = await callApi<{ value: any[] }>({ url });
      setGrant(data?.value?.[0] ?? null);

      const applicationUrl = `/_api/${TableName.APPLICATIONS}?$select=*&$filter=${ApplicationFields.GRANTCYCLE} eq '${data?.value?.[0]?.[GrantCycleKeys.GRANTCYCLEID]}'`;

      const dataApp = await callApi<{ value: any[] }>({ url: applicationUrl });
      setApplications(dataApp?.value ?? null);
      console.log("Loaded applications for grant cycle:", dataApp?.value);

      // Load grant template for FAQ
      await loadGrantTemplate();
    } catch (err) {
      console.error("Failed to load grants:", err);
      setError("Unable to load grant information. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Load grants on mount
  useEffect(() => {
    loadGrants();
  }, []);

  // Memoize research areas for performance
  const researchAreas = useMemo(
    () => grant?.[ExpandRelations.RESEARCH_AREAS] || [],
    [grant],
  );
  const navigate = useNavigate();

  // Function to check for existing application or create a draft
  const handleApplyForGrant = async (
    grantCycleId: string,
    researchAreaId: string,
  ) => {
    if (!user?.contact?.[ContactKeys.CONTACTID]) {
      toast.error("Please log in to apply for a grant.");
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
          `/applyapplication?item=${applicationId}&grantCycleId=${grantCycleId}&researchAreaId=${researchAreaId}&formType=edit`,
        );
      }
    } catch (error) {
      console.error("Error handling grant application:", error);
      toast.error("Failed to process application. Please try again.");
    } finally {
      setIsCreatingApplication(false);
    }
  };
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#1D2054]">
        <div className="absolute inset-0 -z-10">
          <div>
            <img
              style={{
                position: "absolute",
                right: "0px",
                top: "30px",
                zIndex: 1,
                width: "175px",
              }}
              src="/images/girl.png"
              alt="Background pattern"
            />
          </div>
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F70b9b0a609c24ee0bbf265ba4136c987%2F70f208287cbb42e085316b29c857b9b9?format=webp&width=1200"
            alt="decorative lines"
            className="absolute left-0 bottom-0 w-[70%] opacity-30"
          />
        </div>
        <Reveal>
          <div className="container py-8 md:py-10 grid gap-10 md:grid-cols-2 items-center">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-white">
                Welcome to
                <br />
                ECA Research Grants Portal
              </h1>
              <p className="mt-4 text-base md:text-lg text-white/80 max-w-xl">
                Empowering university faculty to drive innovation in early
                childhood development through research excellence
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                {/*<PrimaryButton
                  onClick={() => {
                    console.log("Navigating to apply for research area:", grant?.[GrantCycleKeys.GRANTCYCLEID]);

                    navigate("/applyapplication", {
                      state: {
                        grantCycleId: grant?.[GrantCycleKeys.GRANTCYCLEID],
                        researchAreaId: null
                      }
                    })
                  }}
                  text="APPLY FOR A GRANT"
                />*/}
                {!isAuthed && (
                  <DefaultButton
                    disabled={isAuthLoading}
                    onClick={async () => {
                      try {
                        await login();
                      } catch (error: any) {
                        // Error is already handled and logged in auth.tsx
                        // Only log here if it's an unexpected error
                        if (error?.errorCode !== "user_cancelled") {
                          console.error("Sign up failed:", error);
                        }
                      }
                    }}
                    text={isAuthLoading ? "Authenticating..." : "Sign up now"}
                    styles={{
                      root: {
                        border: "1px solid rgba(255,255,255,0.4)",
                        backgroundColor: "transparent",
                        color: "rgba(255,255,255,0.9)",
                        opacity: isAuthLoading ? 0.6 : 1,
                      },
                      rootHovered: isAuthLoading
                        ? {}
                        : {
                            backgroundColor: "rgba(255,255,255,0.1)",
                            color: "rgba(255,255,255,0.9)",
                          },
                    }}
                  />
                )}
              </div>
            </div>

            {/* Hero Collage */}
            <div className="relative h-[380px] md:h-[440px]">
              <img
                style={{
                  position: "absolute",
                  right: "0px",
                  top: "30px",
                  zIndex: 1,
                  width: "175px",
                }}
                src="/images/girl.png"
                alt="Background pattern"
              />

              <img
                src="https://cdn.builder.io/api/v1/image/assets%2F70b9b0a609c24ee0bbf265ba4136c987%2F7179a3b6394e482e95d26e73368edd6b?format=webp&width=700"
                alt="Hero collage"
                className="absolute right-0 top-0 h-full w-auto max-w-none"
              />
            </div>
          </div>
        </Reveal>
      </section>

      {/* Active Grants Section */}
      {grant && !loading && (
        <div>
          <section className="bg-white">
            <div className="container py-14 md:py-16">
              <div className="mt-10 grid gap-2">
                <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-blue">
                  {grant[GrantCycleKeys.CYCLENAME]}
                </h3>
                <div className="text-sm text-muted-foreground text-blue">
                  {grant[GrantCycleKeys.CYCLEDESCRIPTION]}
                </div>

                {/* Grant Details Grid */}
                <div className="mt-4 grid gap-2 max-w-md">
                  <div className="grid grid-cols-[1fr_auto] items-center text-sm">
                    <div className="text-muted-foreground text-light-brown">
                      Start Date
                    </div>
                    <div className="font-medium text-right text-light-brown">
                      {grant[GrantCycleKeys.STARTDATE_FORMATTED]}
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center text-sm">
                    <div className="text-muted-foreground text-light-brown">
                      End Date
                    </div>
                    <div className="font-medium text-right text-light-brown">
                      {grant[GrantCycleKeys.ENDDATE_FORMATTED]}
                    </div>
                  </div>
                </div>
              </div>

              {/* Research Areas Section */}
              <h2 className="mt-8 text-[#391400] text-center tracking-[0.25em] text-4xl font-semibold">
                ACTIVE GRANTS
              </h2>
              <div className="mt-6 h-px bg-slate-200" />
              <div className="mt-10 grid gap-20">
                {researchAreas &&
                  researchAreas.map((area, idx) => (
                    <GrantCard
                      key={area[ResearchAreaKeys.RESEARCHAREAID]}
                      GrantCycleKeyId={grant[GrantCycleKeys.GRANTCYCLEID]}
                      number={idx + 1}
                      ResearchAreaKeyId={area[ResearchAreaKeys.RESEARCHAREAID]}
                      title={area[ResearchAreaKeys.AREANAME]}
                      image={area[ResearchAreaKeys.THUMBNAIL_URL]}
                      description={area[ResearchAreaKeys.AREADESCRIPTION]}
                      reverse={idx % 2 === 0}
                      navigate={navigate}
                      onApplyClick={handleApplyForGrant}
                    />
                  ))}
              </div>
            </div>
          </section>
          <section className="bg-white">
            <div className="container pb-12">
              <Reveal>
                <div className="rounded-xl border overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
                    <div className="p-6 animate-in fade-in-50 duration-700">
                      <div className="text-2xl md:text-3xl font-extrabold tracking-tight">
                        {formatAedMillion(grant[GrantCycleKeys.CYCLEBUDGET])}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Total Funding Available
                      </div>
                    </div>
                    <div className="p-6 bg-[#f6e4d8] animate-in fade-in-50 duration-700">
                      <div className="text-2xl md:text-3xl font-extrabold tracking-tight">
                        {daysLeft(grant[GrantCycleKeys.ENDDATE])}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Days Until Deadline
                      </div>
                    </div>
                    <div className="p-6 animate-in fade-in-50 duration-700">
                      <div className="text-2xl md:text-3xl font-extrabold tracking-tight">
                        {applications ? applications.length : "-"}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Active Grant Cycles Applications
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <section className="bg-white">
          <div className="container py-20 text-center">
            <div className="text-lg font-medium text-muted-foreground">
              Loading grant information...
            </div>
          </div>
        </section>
      )}

      {/* Error State */}
      {error && (
        <section className="bg-white">
          <div className="container py-20 text-center">
            <div className="text-lg font-medium text-red-600">{error}</div>
          </div>
        </section>
      )}
      <Spacer color="#F3D1BF" />
      {/* FAQ Section */}
      <section id="faq" className="bg-white">
        <div className="container py-8 md:py-10 grid md:grid-cols-2 gap-12 items-start">
          <div>
            <div className="text-xl tracking-[0.25em] font-bold text-orange uppercase">
              FAQ
            </div>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight text-brown">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl text-light-brown">
              Empowering university faculty to drive innovation in early
              childhood development through research excellence
            </p>
            <Link
              to="/applyapplication"
              className="mt-6 inline-flex items-center text-brown font-semibold hover:underline"
            >
              Contact Us
            </Link>
          </div>
          <div className="rounded-xl border border-color-orange overflow-hidden">
            {grantTemplate?.prmtk_faq ? (
              <details
                className="group border-t first:border-t-0 border-color-orange animate-in fade-in-50 duration-700"
                open={true}
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between gap-4 p-3">
                    <h3 className="font-semibold text-brown text-base">
                      View FAQ Details
                    </h3>
                    <span className="shrink-0 grid h-6 w-6 place-items-center rounded-full bg-orange text-white">
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                    </span>
                  </div>
                </summary>
                <div className="px-6 py-4">
                  <div
                    className="text-gray-700 leading-7 prose prose-headings:text-brown prose-headings:font-semibold prose-p:text-light-brown prose-ul:text-light-brown prose-ol:text-light-brown prose-strong:text-brown max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: grantTemplate.prmtk_faq,
                    }}
                  />
                </div>
              </details>
            ) : (
              <div className="p-6">
                <p className="text-gray-700 leading-7 text-light-brown">
                  FAQ information will be available soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      {/* <section className="bg-[#1D2054] text-white">
        <ThreeSteps />

        <Spacer color="#92CBE8" />

        <SupportSection />
      </section> */}

      {/* Blog Section */}
      {/* <section className="bg-white">
        <div className="container py-16">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xl tracking-[0.25em] font-bold text-orange uppercase">
                Our Blog
              </div>
              <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-brown leading-tight">
                Latest Blog
                <br />
                Articles
              </h2>
            </div>
            <PrimaryButton href="/#" text="DISCOVER ALL" />
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {BLOG_ITEMS.map((blog) => (
              <BlogCard
                key={blog.t}
                category={blog.k}
                title={blog.t}
                date={blog.d}
                image={blog.img}
              />
            ))}
          </div>
        </div>
      </section> */}

      {/* <Spacer color="#F3D1BF" /> */}

      {/* Newsletter Section */}
      {/* <section className="bg-white">
        <div className="container py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <h3 className="text-xl md:text-2xl font-bold text-brown">
              Newsletter
            </h3>
            <form
              className="flex items-center gap-5"
              onSubmit={(e) => e.preventDefault()}
            >
              <TextField
                className="border-color-orange"
                id="newsletter"
                type="email"
                required
                placeholder="Your email"
                styles={{ root: { width: 256 } }}
                ariaLabel="Newsletter email"
              />
              <PrimaryButton type="submit" text="SUBSCRIBE" />
            </form>
          </div>
        </div>
      </section> */}

      {isCreatingApplication && (
        <Loader isVisible={true} label="Creating your application..." />
      )}
    </>
  );
}
