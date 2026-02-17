import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Reveal from "@/motion/Reveal";
import { useAuth } from "@/state/auth";
import { toast } from "@/ui/use-toast";
import { LookupPicker } from "@/components/LookupPicker";
import { TeamMemberSection } from "@/components/TeamMemberSection";
import { useDataverseApi } from "@/hooks/useDataverseApi";
import { TextField } from "@fluentui/react/lib/TextField";
import {
  DefaultButton,
  IconButton,
  PrimaryButton,
} from "@fluentui/react/lib/Button";
import { Label } from "@fluentui/react/lib/Label";
import { Dropdown, IDropdownOption } from "@fluentui/react/lib/Dropdown";
import { BudgetCategorys } from "@/constants/options";
import { ContactFields, GrantCycleFields } from "@/constants";
import {
  ApplicationKeys,
  ApplicationTeamMemberKeys,
  ContactKeys,
  ExpandRelations,
  GrantCycleKeys,
  ResearchAreaKeys,
  TableName,
  TeamMemberRoles,
} from "@/constants/index";
import { ApplicationTeamMemberFields } from "@/constants/entities";
import { ErrorDialog, SuccessDialog } from "@/components/Dialog";
import { OverlayLoader } from "@/components/Loader";
import { useFlowApi } from "@/hooks/useFlowApi";
import { fileToBase64 } from "@/services/utility";
import { APIURL } from "@/constants/url";
import { ApplicationStatus } from "@/constants/options";
import { BudgetHeaderFields } from "@/constants/budgetHeader";
import {
  BudgetSection,
  BudgetHeader,
  BudgetLineItem,
} from "@/components/BudgetSection";
import { BudgetLineItemFields } from "@/constants/budgetLineItem";
import { Icon } from "@fluentui/react/lib/Icon";
import { HEADING_TEXT } from "@/styles/constants";
import { FileUploadSection } from "@/components/FileUploadSection";
import WorkflowTimeline from "@/components/WorkFlowHistory";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  customRoleName?: string;
  educationLevel?: string;
  action: "new" | "existing" | "remove";
}

interface FormState {
  budgetHeaders: BudgetHeader;
  budgetLineItems: BudgetLineItem[];
  title: string;
  abstract: string;
  submissionDate: string;
  grantCycle: string | null;
  researchArea: string | null;
  mainApplicant: string;
  applicationFiles: { file: File; action: "new" | "existing" | "remove" }[];
  generalFiles: { file: File; action: "new" | "existing" | "remove" }[];
  team: TeamMember[];
  type: "new" | "edit" | "view";
  applicationNumber?: string;
}

interface AddMemberForm {
  name: string;
  role: string;
  customRoleName?: string;
  educationLevel?: string;
}

const INITIAL_FORM_STATE: FormState = {
  title: "",
  abstract: "",
  submissionDate: "",
  grantCycle: null,
  researchArea: null,
  mainApplicant: "",
  applicationFiles: [],
  generalFiles: [],
  team: [],
  budgetHeaders: null,
  budgetLineItems: [],
  type: "new",
};

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getFileKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

// Helper function to process team members
const processTeamMembers = async (
  team: TeamMember[],
  applicationId: string,
  callApi: (options: any) => Promise<any>,
): Promise<void> => {
  // Process additions and updates in parallel
  const upsertPromises = team
    .filter((member) => member.action !== "remove")
    .map(async (member) => {
      const method = member.action === "existing" ? "PATCH" : "POST";
      const url =
        member.action === "existing"
          ? `/_api/${TableName.APPLICATIONTEAMMEMBER}(${member.id})`
          : `/_api/${TableName.APPLICATIONTEAMMEMBER}`;

      const data: Record<string, any> = {
        [ApplicationTeamMemberKeys.PARTICIPATIONNAME]: member.name,
        [ApplicationTeamMemberKeys.ROLE]: Number(member.role),
      };

      if (member.customRoleName) {
        data[ApplicationTeamMemberFields.CUSTOMROLE] = member.customRoleName;
      }
      if (member.educationLevel) {
        data[ApplicationTeamMemberFields.EDUCATIONLEVEL] =
          member.educationLevel;
      }

      if (member.action === "new") {
        data[ApplicationTeamMemberKeys.APPLICATION_ID] =
          `/${TableName.APPLICATIONS}(${applicationId})`;
      }

      return callApi({ url, method, data });
    });

  // Handle removals
  const removePromises = team
    .filter(
      (member) => member.action === "remove" && member.id !== applicationId,
    )
    .map(async (member) =>
      callApi({
        url: `/_api/${TableName.APPLICATIONTEAMMEMBER}(${member.id})`,
        method: "DELETE",
      }),
    );

  await Promise.all([...upsertPromises, ...removePromises]);
};

// Helper function to get application number
const getApplicationNumber = async (
  formType: string,
  applicationId: string,
  stateApplicationNumber: string | undefined,
  callApi: (options: any) => Promise<any>,
): Promise<string> => {
  if (formType === "edit" && stateApplicationNumber) {
    return stateApplicationNumber;
  }

  const res = await callApi({
    url: `/_api/${TableName.APPLICATIONS}?$filter=${ApplicationKeys.APPLICATIONID} eq ${applicationId}&$select=${ApplicationKeys.APPLICATIONNUMBER}`,
    method: "GET",
  });

  return res?.value?.[0]?.[ApplicationKeys.APPLICATIONNUMBER] || "";
};

// Helper function to process file uploads
const processFileUploads = async (
  applicationFiles: { file: File; action: "new" | "existing" | "remove" }[],
  generalFiles: { file: File; action: "new" | "existing" | "remove" }[],
  applicationNumber: string,
  triggerFlow: (url: string, payload: any) => Promise<any>,
  user: any,
): Promise<void> => {
  // Process application files (Main Application)
  const applicationUploadPromises = applicationFiles
    .filter((file) => file.action === "new")
    .map(async (file) => {
      const base64Content = await fileToBase64(file.file);
      const payload: any = {
        FileContent: base64Content,
        FileName: file.file.name,
        Library: "Applications",
        Folder: applicationNumber,
        FileType: "Main Application",
        UserEmail: user?.contact?.[ContactFields.EMAILADDRESS1] || "",
      };

      const response = await triggerFlow(APIURL.FileUploadEndpoint, payload);

      if (response.success) {
        // console.log(`Processed file ${file.file.name} successfully.`);
      } else {
        console.error(
          `Failed to process file ${file.file.name}. Error:`,
          response.error,
        );
      }
    });

  // Process general files (Other)
  const generalUploadPromises = generalFiles
    .filter((file) => file.action === "new")
    .map(async (file) => {
      const base64Content = await fileToBase64(file.file);
      const payload: any = {
        FileContent: base64Content,
        FileName: file.file.name,
        Library: "Applications",
        Folder: applicationNumber,
        ApplicationNumber: applicationNumber,
        FileType: "Other",
        UserEmail: user?.contact?.[ContactFields.EMAILADDRESS1] || "",
      };

      const response = await triggerFlow(APIURL.FileUploadEndpoint, payload);

      if (response.success) {
        // console.log(`Processed file ${file.file.name} successfully.`);
      } else {
        console.error(
          `Failed to process file ${file.file.name}. Error:`,
          response.error,
        );
      }
    });

  await Promise.all([...applicationUploadPromises, ...generalUploadPromises]);
};

// Helper function to process budget data
const processBudgetData = async (
  budgetHeader: BudgetHeader | null,
  budgetLineItems: BudgetLineItem[],
  callApi: (options: any) => Promise<any>,
): Promise<void> => {
  if (!budgetHeader) {
    console.log("No budget header to process");
    return;
  }

  let budgetHeaderId = budgetHeader.id;
  // console.log(budgetLineItems, "budgetLineItems in processBudgetData");
  // console.log(budgetHeaderId, "budgetHeaderId in processBudgetData");
  // Process budget line items in parallel
  const lineItemPromises = budgetLineItems
    .filter((item) => item.action !== "remove")
    .map(async (item) => {
      const method = item.action === "existing" ? "PATCH" : "POST";
      const url =
        item.action === "existing"
          ? `/_api/${TableName.BUDGETLINEITEMS}(${item.id})`
          : `/_api/${TableName.BUDGETLINEITEMS}`;
      // console.log(lineItemPromises, "lineItemPromises");
      const data: Record<string, any> = {
        [BudgetLineItemFields.LINEITEMNAME]: item.prmtk_lineitemname,
        [BudgetLineItemFields.DESCRIPTION]: item.prmtk_description,
        [BudgetLineItemFields.AMOUNT]: item.prmtk_amount,
        [BudgetLineItemFields.CATEGORY]: item.prmtk_category,
      };

      // Only add binding for new items
      if (item.action === "new") {
        // console.log("new item", item);
        data[BudgetLineItemFields.BUDGETHEADER_ID] =
          `/${TableName.BUDGETHEADERS}(${budgetHeaderId})`;
      }
      const response = await callApi({ url, method, data });
      // console.log("response new item", response);
      // If it's a POST request, log or return the created item details
      if (method === "POST") {
        // console.log("Created budget line item:", response);
        return response; // Return the created item details if needed
      }

      return response;
    });

  // Handle removals
  const removeLineItemPromises = budgetLineItems
    .filter((item) => item.action === "remove" && item.id)
    .map(async (item) =>
      callApi({
        url: `/_api/${TableName.BUDGETLINEITEMS}(${item.id})`,
        method: "DELETE",
      }),
    );

  await Promise.all([...lineItemPromises, ...removeLineItemPromises]);
};

interface GeneralInformationSectionProps {
  form: FormState;
  onTitleChange: (value: string) => void;
  onAbstractChange: (value: string) => void;
  onGrantCycleChange: (value: string | null) => void;
  onResearchAreaChange: (value: string | null) => void;
  grantCycleId?: string | null;
  researchAreaId?: string | null;
  userAdxUserId?: string;
}

const GeneralInformationSection: React.FC<GeneralInformationSectionProps> = ({
  form,
  onTitleChange,
  onAbstractChange,
  onGrantCycleChange,
  onResearchAreaChange,
  grantCycleId,
  researchAreaId,
  userAdxUserId,
}) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const formType = searchParams.get("formType") || "new";
  return (
    <Reveal className="mt-8">
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <Label>Grant Cycle</Label>
          <div className="mt-1">
            <LookupPicker
              key={`grant-cycle-${form.grantCycle || "none"}`}
              displayField={GrantCycleKeys.CYCLENAME}
              keyField={GrantCycleKeys.GRANTCYCLEID}
              secondaryField={GrantCycleKeys.CYCLEDESCRIPTION}
              searchField={GrantCycleKeys.CYCLENAME}
              tableName={TableName.GRANTCYCLES}
              maxSelection={1}
              disabled={formType === "view"}
              label="Grant Cycle"
              cascadeField={GrantCycleKeys.GRANTCYCLEID}
              cascadeValue={grantCycleId}
              isDefaultSelected={grantCycleId != null}
              onSelect={(values) => {
                onGrantCycleChange(
                  values && values.length > 0
                    ? values[0][GrantCycleKeys.GRANTCYCLEID]
                    : null,
                );
              }}
            />
          </div>
        </div>
        <div>
          <Label>Research Area</Label>
          <div className="mt-1">
            <LookupPicker
              key={`research-area-${form.researchArea || "none"}`}
              displayField={ResearchAreaKeys.AREANAME}
              keyField={ResearchAreaKeys.RESEARCHAREAID}
              secondaryField={ResearchAreaKeys.AREADESCRIPTION}
              searchField={ResearchAreaKeys.AREANAME}
              tableName={TableName.RESEARCHAREAS}
              maxSelection={1}
              label="Research Area"
              cascadeField={ResearchAreaKeys.RESEARCHAREAID}
              cascadeValue={researchAreaId}
              isDefaultSelected={researchAreaId != null}
              disabled={formType === "view"}
              onSelect={(values) => {
                onResearchAreaChange(
                  values && values.length > 0
                    ? values[0][ResearchAreaKeys.RESEARCHAREAID]
                    : null,
                );
              }}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="title">
            Title <span className="text-red-500">*</span>
          </Label>
          <div className="mt-1">
            <TextField
              id="title"
              value={form.title}
              onChange={(e, newValue) => onTitleChange(newValue || "")}
              placeholder="Enter project title"
              disabled={formType === "view"}
              borderless
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="abstract">Abstract</Label>
          <div className="mt-1">
            <TextField
              id="abstract"
              value={form.abstract}
              onChange={(e, newValue) => onAbstractChange(newValue || "")}
              multiline
              rows={5}
              disabled={formType === "view"}
              placeholder="Provide a concise abstract"
              borderless
            />
          </div>
        </div>
      </div>
    </Reveal>
  );
};

const getFile = (sfile: any): any => {
  const fileName = sfile.fileName;
  const contentType = sfile.contentType;
  const base64 = sfile.base64;

  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);

  const file = new File([byteArray], fileName, { type: contentType });

  return file;
};

export default function FormApplication() {
  const { user } = useAuth();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const applicationId = searchParams.get("item");
  const grantCycleId = searchParams.get("grantCycleId");
  const researchAreaId = searchParams.get("researchAreaId");
  const formType = searchParams.get("formType") || "new";
  const applicationNumber = searchParams.get("applicationNumber");
  const status = searchParams.get("status");

  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL_FORM_STATE,
    submissionDate: formatDate(new Date()),
  }));
  // console.log(form);

  const [showGeneral, setShowGeneral] = useState(true);
  const [showTeam, setShowTeam] = useState(true);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [teamMemberRoles, setTeamMemberRoles] = useState<IDropdownOption[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSubmitStatus, setPendingSubmitStatus] = useState<string | null>(
    null,
  );
  const [workflowHistory, setWorkflowHistory] = useState<any[]>([]);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const { callApi } = useDataverseApi();
  const { triggerFlow } = useFlowApi();

  const mapApplicationToForm = (
    app: any,
    files: any[],
  ): Partial<FormState> => ({
    title: app[ApplicationKeys.APPLICATIONTITLE] || "",
    abstract: app[ApplicationKeys.ABSTRACT] || "",
    grantCycle: app[ApplicationKeys.GRANTCYCLE] || null,
    researchArea: app[ApplicationKeys.RESEARCHAREA] || null,
    mainApplicant: app[ApplicationKeys.MAINAPPLICANT] || "",
    submissionDate:
      app[ApplicationKeys.SUBMISSIONDATE_FORMATTED] || formatDate(new Date()),
    team: (app[ExpandRelations.APPLICATION_TEAM_MEMBER] || []).map(
      (tm: any) => ({
        id: tm[ApplicationTeamMemberKeys.APPLICATIONTEAMMEMBERID],
        name: tm[ApplicationTeamMemberKeys.PARTICIPATIONNAME],
        role: tm[ApplicationTeamMemberKeys.ROLE],
        customRoleName: tm[ApplicationTeamMemberKeys.CUSTOMROLE] || undefined,
        educationLevel:
          tm[ApplicationTeamMemberKeys.EDUCATIONLEVEL] || undefined,
        action: "existing" as const,
      }),
    ),
    type: formType === "view" ? "view" : "edit",
    applicationFiles: (() => {
      // Find the first PDF for Main Proposal
      const firstPdf = files.find(
        (f) =>
          f.file.type === "application/pdf" ||
          f.file.name.toLowerCase().endsWith(".pdf"),
      );
      return firstPdf ? [firstPdf] : [];
    })(),
    generalFiles: (() => {
      // All files except the first PDF go to general files
      const pdfs = files.filter(
        (f) =>
          f.file.type === "application/pdf" ||
          f.file.name.toLowerCase().endsWith(".pdf"),
      );
      const nonPdfs = files.filter(
        (f) =>
          !(
            f.file.type === "application/pdf" ||
            f.file.name.toLowerCase().endsWith(".pdf")
          ),
      );
      // Skip the first PDF and include the rest with non-PDFs
      return [...pdfs.slice(1), ...nonPdfs];
    })(),
    applicationNumber: app[ApplicationKeys.APPLICATIONNUMBER] || null,
  });

  // Load application files from flow
  const loadApplicationFiles = async (
    applicationNumber: string,
  ): Promise<any[]> => {
    if (!applicationNumber) return [];

    try {
      const applicationFiles = await triggerFlow<any, any[]>(
        APIURL.FileGetEndpoint,
        { Library: "Applications", Folder: applicationNumber },
      );

      // console.log("Fetched application files:", applicationFiles);
      return (
        applicationFiles?.data?.map((f: any) => ({
          file: getFile(f),
          action: "existing" as const,
        })) || []
      );
    } catch (error) {
      console.error("Failed to load application files:", error);
      return [];
    }
  };

  const loadApplicationDetails = useCallback(
    async (applicationId: string) => {
      setShowLoader(true);

      try {
        const currentUserContactId = user?.contact?.[ContactFields.CONTACTID];

        if (!currentUserContactId) {
          console.error("No contact ID found for current user");
          toast({
            title: "Error",
            description: "User authentication required.",
            variant: "destructive",
          });
          return;
        }

        // Fetch application data with user filter
        const res = await callApi<{ value: any[] }>({
          url: `/_api/${TableName.APPLICATIONS}?$filter=${ApplicationKeys.APPLICATIONID} eq ${applicationId} and ${ApplicationKeys.MAINAPPLICANT} eq ${currentUserContactId}&$select=*&$expand=${ExpandRelations.APPLICATION_TEAM_MEMBER}`,
          method: "GET",
        });

        const app = res?.value?.[0];
        if (!app) {
          throw new Error("No application found with the provided ID.");
          return;
        }
        if (
          app?.prmtk_status != 1 &&
          app?.prmtk_status != 3 &&
          formType !== "view"
        ) {
          toast({
            title: "Info",
            description: "This application cannot be viewed.",
          });
          navigate(`/applications`);
          return;
        }

        // Load files in parallel with budget details
        setForm((prev) => ({
          ...prev,
          grantCycle: app[ApplicationKeys.GRANTCYCLE] || "",
          researchArea: app[ApplicationKeys.RESEARCHAREA] || "",
          budgetHeaders: app[ApplicationKeys.BUDGETHEADERS] || null,
        }));
        const applicationNumber = app[ApplicationKeys.APPLICATIONNUMBER] || "";
        const [files] = await Promise.all([
          loadApplicationFiles(applicationNumber),
        ]);
        // console.log(files);
        // console.log(budget);

        // Update form state with mapped data
        setForm((prev) => ({
          ...prev,
          ...mapApplicationToForm(app, files),
        }));
      } catch (error) {
        console.error("Failed to load application details:", error);
        // setDialogMessage(
        //   error instanceof Error
        //     ? error.message
        //     : "Unable to load application details. Please try again.",
        // );
        toast({
          title: "Error",
          description: "Unable to load application details. Please try again.",
        });
        // setShowErrorDialog(true);
      } finally {
        setShowLoader(false);
      }
    },
    [callApi, triggerFlow, formType, user],
  );
  const loadWorkFlowHistory = useCallback(
    async (applicationId: string) => {
      setShowLoader(true);

      try {
        // Fetch application data
        const res = await callApi<{ value: any[] }>({
          url: `/_api/${TableName.CASESHISTORY}`,
          method: "GET",
        });
        const workflow = res.value.filter(
          (item) => item._prmtk_applicationid_value === applicationId,
        );
        console.log(workflow);

        // Sort by creation date (newest first)
        const sortedWorkflow = workflow.sort((a, b) => {
          return (
            new Date(b.createdon).getTime() - new Date(a.createdon).getTime()
          );
        });

        setWorkflowHistory(sortedWorkflow);
        setShowWorkflowDialog(true);
      } catch (error) {
        console.error("Failed to load history:", error);
        toast({
          title: "Error",
          description: "Unable to load history. Please try again.",
        });
      } finally {
        setShowLoader(false);
      }
    },
    [callApi],
  );

  // Load team member roles
  const loadTeamMemberRoles = useCallback(async () => {
    try {
      setTeamMemberRoles(TeamMemberRoles.APPLICATION as any);
    } catch (error) {
      console.error("Failed to load team member roles:", error);
    }
  }, []);

  // Helper to map budget line items
  const mapBudgetLineItems = (items: any[]): BudgetLineItem[] => {
    if (!items || !Array.isArray(items)) return [];

    return items.map((item: any) => ({
      id: item[BudgetLineItemFields.BUDGETLINEITEMID] || crypto.randomUUID(),
      prmtk_lineitemname: item[BudgetLineItemFields.LINEITEMNAME] || "",
      prmtk_description: item[BudgetLineItemFields.DESCRIPTION] || "",
      prmtk_amount: parseFloat(item[BudgetLineItemFields.AMOUNT] || "0"),
      prmtk_category: item[BudgetLineItemFields.CATEGORY] || "",
      action: "existing" as const,
    }));
  };

  // Helper to map budget header
  const mapBudgetHeader = (data: any): BudgetHeader | null => {
    if (!data) return null;

    return {
      id: data[BudgetHeaderFields.BUDGETHEADERID] || "",
      name: data[BudgetHeaderFields.BUDGETNAME] || "",
      totalBudget: parseFloat(data[BudgetHeaderFields.TOTALBUDGET] || "0"),
      action: "existing" as const,
    };
  };

  const loadBudgetDetails = async (applicationId: string): Promise<void> => {
    if (formType === "new") {
      return;
    }
    try {
      const res = await callApi<{ value: any[] }>({
        url: `/_api/${TableName.BUDGETHEADERS}?$filter=${BudgetHeaderFields.APPLICATION} eq ${applicationId}`,
        method: "GET",
      });
      const budgetData = res.value?.[0];

      if (!budgetData) {
        return;
      }

      const res2 = await callApi<{ value: any[] }>({
        url: `/_api/${TableName.BUDGETLINEITEMS}?$filter=${BudgetLineItemFields.BUDGETHEADER} eq ${budgetData[BudgetHeaderFields.BUDGETHEADERID]}`,
        method: "GET",
      });
      const filteredArray = res2.value || [];

      const lineItems = budgetData[ExpandRelations.BUDGET_LINE_ITEMS] || [];
      const budgetHeader = mapBudgetHeader(budgetData);
      const budgetLineItems = mapBudgetLineItems(filteredArray);
      // console.log(budgetHeader);
      // console.log(budgetLineItems);
      // console.log(lineItems);

      setForm((prev) => ({
        ...prev,
        budgetHeaders: budgetHeader,
        budgetLineItems: budgetLineItems,
      }));
    } catch (error) {
      console.error("Failed to load budget details:", error);
      // Don't throw error - budget is optional
    }
  };

  // Check for existing application on mount (for new forms)
  useEffect(() => {
    const checkForExistingApplication = async () => {
      // If no grantCycleId or researchAreaId, redirect to home
      if (!grantCycleId || !researchAreaId) {
        navigate("/");
        return;
      }

      // Only check for existing application if formType is "new"
      if (formType === "new" && user?.contact?.[ContactKeys.CONTACTID]) {
        setShowLoader(true);
        try {
          const currentUserId = user.contact[ContactKeys.CONTACTID];
          const filter = `${ApplicationKeys.MAINAPPLICANT} eq ${currentUserId} and ${ApplicationKeys.GRANTCYCLE} eq ${grantCycleId} and ${ApplicationKeys.RESEARCHAREA} eq ${researchAreaId}`;

          const res = await callApi<{ value: any[] }>({
            url: `/_api/${TableName.APPLICATIONS}?$select=*&$filter=${filter}`,
            method: "GET",
          });

          const existingApp = res?.value?.[0];

          if (existingApp) {
            // Redirect to existing application edit page
            const statusFormatted =
              existingApp[ApplicationKeys.STATUS_FORMATTED] ||
              existingApp[ApplicationKeys.STATUS] ||
              "";
            navigate(
              `/applyapplication?item=${existingApp[ApplicationKeys.APPLICATIONID]}&grantCycleId=${existingApp[ApplicationKeys.GRANTCYCLE]}&researchAreaId=${existingApp[ApplicationKeys.RESEARCHAREA]}&status=${statusFormatted}&applicationNumber=${existingApp[ApplicationKeys.APPLICATIONNUMBER]}&formType=edit`,
              { replace: true },
            );
          }
        } catch (error) {
          console.error("Failed to check for existing application:", error);
        } finally {
          setShowLoader(false);
        }
      }
    };

    checkForExistingApplication();
  }, [grantCycleId, researchAreaId, formType, user, navigate, callApi]);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      await loadTeamMemberRoles();
      // Load application if editing or viewing
      if (applicationId) {
        await loadApplicationDetails(applicationId);
      }
    };
    initialize();
    loadBudgetDetails(applicationId);
  }, [applicationId]);

  useEffect(() => {
    if (user?.contact?.[ContactKeys.FULLNAME]) {
      setForm((prev) => ({
        ...prev,
        mainApplicant: user.contact[ContactKeys.FULLNAME],
      }));
      // console.log(form.mainApplicant);
    }
  }, [user]);

  const canSubmit = useMemo(
    () =>
      (form.title ?? "").trim().length > 0 &&
      (form.abstract ?? "").trim().length > 0 &&
      (form.mainApplicant ?? "").trim().length > 0 &&
      (form.grantCycle ?? "").trim().length > 0 &&
      (form.researchArea ?? "").trim().length > 0 &&
      form.budgetLineItems.length > 0 &&
      form.generalFiles &&
      form.mainApplicant &&
      form.team.length > 0,
    [
      form.title,
      form.abstract,
      form.mainApplicant,
      form.generalFiles,
      form.grantCycle,
      form.researchArea,
      form.budgetLineItems.length,
      form.team.length,
    ],
  );

  //const grantCycleId = useMemo(() => state?.grantCycleId, [state?.grantCycleId]);
  //const researchAreaId = useMemo(() => state?.researchAreaId, [state?.researchAreaId]);

  const handleAddMember = useCallback((member: AddMemberForm) => {
    const newMember: TeamMember = {
      id: crypto.randomUUID(),
      name: member.name,
      role: member.role,
      customRoleName: member.customRoleName,
      educationLevel: member.educationLevel,
      action: "new",
    } as any;
    if (formType !== "new") {
      setShowLoader(true);
      const memberData: Record<string, any> = {
        [ApplicationTeamMemberKeys.PARTICIPATIONNAME]: newMember.name,
        [ApplicationTeamMemberKeys.ROLE]: newMember.role,
        [ApplicationTeamMemberKeys.APPLICATION_ID]: `/${TableName.APPLICATIONS}(${applicationId})`,
      };
      if (member.customRoleName) {
        memberData[ApplicationTeamMemberFields.CUSTOMROLE] =
          member.customRoleName;
      }
      if (member.educationLevel) {
        memberData[ApplicationTeamMemberFields.EDUCATIONLEVEL] =
          member.educationLevel;
      }
      const addMember = callApi({
        url: `/_api/${TableName.APPLICATIONTEAMMEMBER}`,
        method: "POST",
        data: memberData,
      });
      setShowLoader(false);
    }
    setForm((prev) => ({ ...prev, team: [...prev.team, newMember] }));
  }, []);

  const handleRemoveMember = useCallback(async (id: string) => {
    if (formType !== "new") {
      const itemToRemove = form.budgetLineItems.find((li) => li.id === id);
      setShowLoader(true);
      const api = await callApi({
        url: `/_api/${TableName.APPLICATIONTEAMMEMBER}(${id})`,
        method: "DELETE",
      });
      setShowLoader(false);
    }
    setForm((prev) => ({
      ...prev,
      team: prev.team.filter((m) => m.id !== id),
    }));
  }, []);

  const handleEditMember = useCallback(
    async (id: string, member: AddMemberForm) => {
      if (formType !== "new") {
        setShowLoader(true);
        const memberData: Record<string, any> = {
          [ApplicationTeamMemberKeys.PARTICIPATIONNAME]: member.name,
          [ApplicationTeamMemberKeys.ROLE]: member.role,
        };
        if (member.customRoleName) {
          memberData[ApplicationTeamMemberFields.CUSTOMROLE] =
            member.customRoleName;
        }
        if (member.educationLevel) {
          memberData[ApplicationTeamMemberFields.EDUCATIONLEVEL] =
            member.educationLevel;
        }
        try {
          await callApi({
            url: `/_api/${TableName.APPLICATIONTEAMMEMBER}(${id})`,
            method: "PATCH",
            data: memberData,
          });
          toast({
            title: "Success",
            description: "Team member updated successfully.",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to update team member.",
          });
        }
        setShowLoader(false);
      }
      setForm((prev) => ({
        ...prev,
        team: prev.team.map((m) =>
          m.id === id
            ? {
                ...m,
                name: member.name,
                role: member.role,
                customRoleName: member.customRoleName,
                educationLevel: member.educationLevel,
              }
            : m,
        ),
      }));
    },
    [formType],
  );

  // const handleFilesAdd = useCallback(
  //   (newFiles: { file: File; action: "new" | "existing" | "remove" }[]) => {
  //     let temp = [...newFiles];
  //     temp.map((f) => {
  //       f.action = "new";
  //     });
  //     setForm((prev) => ({ ...prev, files: [...prev.files, ...temp] }));
  //   },
  //   [],
  // );

  const handleApplicationFilesAdd = useCallback(
    (newFiles: { file: File; action: "new" | "existing" | "remove" }[]) => {
      setForm((prev) => ({ ...prev, applicationFiles: newFiles }));
    },
    [],
  );

  const handleGeneralFilesAdd = useCallback(
    (newFiles: { file: File; action: "new" | "existing" | "remove" }[]) => {
      setForm((prev) => ({
        ...prev,
        generalFiles: [...prev.generalFiles, ...newFiles],
      }));
    },
    [],
  );

  const handleApplicationFileRemove = useCallback((fileKey: string) => {
    setForm((prev) => ({
      ...prev,
      applicationFiles: prev.applicationFiles.map((f) => {
        const key = getFileKey(f.file);
        if (key === fileKey) {
          return { ...f, action: "remove" as const };
        }
        return f;
      }),
    }));
  }, []);

  const handleGeneralFileRemove = useCallback((fileKey: string) => {
    setForm((prev) => ({
      ...prev,
      generalFiles: prev.generalFiles.map((f) => {
        const key = getFileKey(f.file);
        if (key === fileKey) {
          return { ...f, action: "remove" as const };
        }
        return f;
      }),
    }));
  }, []);

  const currentUserId = user?.contact?.[ContactKeys.CONTACTID] || "";
  const filter = `${ApplicationKeys.MAINAPPLICANT} eq ${currentUserId}`;
  const currentUserApplicationURL = `/_api/${TableName.APPLICATIONS}?$select=*&$filter=${filter}`;

  const loadApps = async () => {
    setShowLoader(true);
    if (formType === "edit") {
      setShowLoader(false);
      return false;
    }
    try {
      const res = await callApi<{ value: any }>({
        url: currentUserApplicationURL,
        method: "GET",
      });
      const list = res?.value ?? [];

      // Check for duplicate applications
      const duplicate = list.find((app) => {
        return (
          app[ApplicationKeys.GRANTCYCLE] === form.grantCycle &&
          app[ApplicationKeys.RESEARCHAREA] === form.researchArea
        );
      });

      if (duplicate) {
        toast({
          title: "Duplicate Application",
          description:
            "You cannot submit the same application twice for the same Grant Cycle, Research Area.",
          variant: "destructive",
        });
        return true;
      }
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setShowLoader(false);
    }
  };

  const handleSubmitClick = async (status: string) => {
    if (!canSubmit) {
      toast({
        title: "Missing information",
        description: "Please fill in Title and Abstract before submitting.",
      });
      return;
    }

    // Check for duplicates before showing confirmation dialog
    const isDuplicate = await loadApps();
    if (isDuplicate) {
      return;
    }

    // Show confirmation dialog only for final submission, not for drafts
    if (status === "Submitted") {
      setPendingSubmitStatus(status);
      setShowConfirmDialog(true);
    } else {
      await submit(status);
    }
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);
    if (pendingSubmitStatus) {
      await submit(pendingSubmitStatus);
      setPendingSubmitStatus(null);
    }
  };

  const handleCancelSubmit = () => {
    setShowConfirmDialog(false);
    setPendingSubmitStatus(null);
  };
  const submit = async (status: string) => {
    setShowLoader(true);
    try {
      // console.log("Submitting application:", form, "state:", state);

      // Create or update application
      const applicationData = {
        [ApplicationKeys.APPLICATIONTITLE]: form.title,
        [ApplicationKeys.ABSTRACT]: form.abstract,
        [ApplicationKeys.SUBMISSIONDATE]: new Date().toISOString(),
        [ApplicationKeys.MAINAPPLICANT_ID]: form.mainApplicant
          ? `/${TableName.CONTACTS}(${user?.contact?.[ContactKeys.CONTACTID]})`
          : null,
        [ApplicationKeys.GRANTCYCLE_ID]: form.grantCycle
          ? `/${TableName.GRANTCYCLES}(${form.grantCycle})`
          : null,
        [ApplicationKeys.RESEARCHAREA_ID]: form.researchArea
          ? `/${TableName.RESEARCHAREAS}(${form.researchArea})`
          : null,
        [ApplicationKeys.STATUS]: ApplicationStatus.find(
          (s) => s.text === status,
        )?.key,
      };

      const res = await callApi<{
        value: any;
        status?: number;
        headers?: Headers;
      }>({
        url: `/_api/${TableName.APPLICATIONS}${formType === "edit" ? `(${applicationId})` : ""}`,
        method: formType === "edit" ? "PATCH" : "POST",
        data: applicationData,
      });

      if (!res || (res.status && res.status >= 400)) {
        throw new Error("Failed to submit application.");
      }

      const applicationIdForm =
        formType === "edit"
          ? applicationId
          : res?.headers?.get("OData-EntityId")?.match(/\(([^)]+)\)/)?.[1];
      if (!applicationIdForm) {
        throw new Error("Failed to retrieve application ID.");
      }

      // Fetch all applications for the current user
      const resApps = await callApi<{ value: any }>({
        url: currentUserApplicationURL,
        method: "GET",
      });

      // Filter to find the matching application
      const matchingApp = resApps?.value?.find(
        (app: any) => app.prmtk_applicationid === applicationIdForm,
      );
      // console.log(matchingApp, "matchingApp");
      // console.log(applicationIdForm, "applicationIdForm");
      // console.log(resApps, "resApps");

      if (matchingApp) {
        // Load and set budget data for the matching application
        const budgetHeaderId = matchingApp._prmtk_budgetheader_value;
        // console.log(budgetHeaderId, "budgetHeaderId");
        if (budgetHeaderId) {
          // Fetch budget header
          const budgetHeaderRes = await callApi<{ value: any[] }>({
            url: `/_api/${TableName.BUDGETHEADERS}(${budgetHeaderId})`,
            method: "GET",
          });

          // Fetch budget line items
          const budgetLineItemsRes = await callApi<{ value: any[] }>({
            url: `/_api/${TableName.BUDGETLINEITEMS}?$filter=_prmtk_budgetheader_value eq ${budgetHeaderId}`,
            method: "GET",
          });

          const budgetData = budgetHeaderRes;
          const filteredArray = budgetLineItemsRes?.value || [];

          const budgetHeader = mapBudgetHeader(budgetData);
          const budgetLineItems = mapBudgetLineItems(filteredArray);
          // console.log(budgetHeader, "budgetHeader ");
          // console.log(budgetLineItems, "budgetLineItems");
          if (formType !== "new") {
            setForm((prev) => ({
              ...prev,
              budgetHeaders: budgetHeader,
              budgetLineItems: budgetLineItems,
            }));
          }

          // Get application number for file uploads
          const applicationNumbers = await getApplicationNumber(
            formType,
            applicationIdForm,
            applicationNumber,
            callApi,
          );
          if (formType === "new") {
            await processTeamMembers(form.team, applicationIdForm, callApi);
          }
          const budgetHeaders = mapBudgetHeader(budgetData);
          // Process all related data in parallel
          await Promise.all([
            processBudgetData(budgetHeaders, form.budgetLineItems, callApi),
            processFileUploads(
              form.applicationFiles,
              form.generalFiles,
              applicationNumbers,
              triggerFlow,
              user,
            ),
          ]);
        }
      }

      // if (form.budgetLineItems.length > 0) {
      //   await handleBudgetUpdate(applicationId);
      // }
      // Call handleBudgetUpdate after processing other data
      toast({
        title: "Success",
        description:
          formType === "edit"
            ? "Application updated successfully."
            : "Application submitted successfully.",
      });
      if (status === "Submitted") {
        navigate(`/applications`, { replace: true });
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Error",
        description: "Submission failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowLoader(false);
    }
  };

  // const handleBudgetUpdate = async (id) => {
  //   try {
  //     // Fetch the existing budget header
  //     const budgetHeaderResponse = await callApi({
  //       url: `/_api/${TableName.BUDGETHEADERS}?$filter=${BudgetHeaderFields.APPLICATION} eq ${id}`,
  //       method: "GET",
  //     });
  //     console.log(budgetHeaderResponse);
  //     const existingBudgetHeader = budgetHeaderResponse?.value?.[0];

  //     if (!existingBudgetHeader) {
  //       throw new Error(
  //         "No existing budget header found for this application.",
  //       );
  //     }

  //     // Prepare the updated budget data
  //     const updatedBudgetData = {
  //       ...existingBudgetHeader,
  //       [BudgetHeaderFields.TOTALBUDGET]: form.budgetLineItems,
  //     };

  //     // Patch the budget header with the updated data
  //     await callApi({
  //       url: `/_api/${TableName.BUDGETHEADERS}(${existingBudgetHeader[BudgetHeaderFields.BUDGETHEADERID]})`,
  //       method: "PATCH",
  //       data: updatedBudgetData,
  //     });

  //     toast({
  //       title: "Success",
  //       description: "Budget updated successfully.",
  //     });
  //   } catch (error) {
  //     console.error("Failed to update budget:", error);
  //     toast({
  //       title: "Error",
  //       description: "Failed to update budget. Please try again.",
  //       variant: "destructive",
  //     });
  //   }
  // };

  return (
    <>
      <section className="relative overflow-hidden bg-[#1D2054]">
        <Reveal>
          <div className="container py-4 md:py-4 grid gap-10 md:grid-cols-2 items-center">
            <div className="max-w-2xl flex flex-col gap-4">
              <h1 className="text-2xl md:text-6xl font-extrabold leading-tight tracking-tight text-white">
                My Grant Status
                <span className=" font-normal ml-2 text-[#F7D85C]">
                  ({status ? status : "New"})
                </span>
              </h1>
              {applicationNumber && (
                <div className="text-2xl text-[#F7D85C]">
                  Grant : {applicationNumber}
                </div>
              )}
              {formType !== "new" && (
                <div className="text-sm text-white">
                  <span className="opacity-80">Submission Date:</span>
                  <span className="ml-2 font-semibold text-[#F7D85C]">
                    {form.submissionDate}
                  </span>
                </div>
              )}
            </div>

            {/* Hero Collage */}
            <div className="relative flex justify-center md:justify-end">
              <img
                src="/images/applyGrant.png"
                alt="Illustration"
                className="h-auto w-auto max-w-none"
              />
            </div>
          </div>
        </Reveal>
      </section>
      <section className="bg-white">
        <div className="container py-4">
          {formType !== "view" && (
            <div className="flex justify-end gap-4">
              <button
                onClick={() => handleSubmitClick(status)}
                className="flex items-center gap-2 px-4 py-1 border border-[#7BAAA3] text-[#7BAAA3] rounded text-sm hover:bg-[#7BAAA3]/10 transition"
              >
                <Icon iconName="SingleBookmark" />
                SAVE DRAFT
              </button>

              {status !== "Draft" && (
                <button
                  onClick={() => loadWorkFlowHistory(applicationId as string)}
                  className="flex items-center gap-2 px-4 py-1 border border-[#7BAAA3] text-[#7BAAA3] rounded text-sm hover:bg-[#7BAAA3]/10 transition"
                >
                  <Icon iconName="MailReminder" />
                  History
                </button>
              )}
            </div>
          )}

          {formType === "view" && status !== "Draft" && (
            <div className="flex justify-end gap-4">
              <button
                onClick={() => loadWorkFlowHistory(applicationId as string)}
                className="flex items-center gap-2 px-4 py-1 border border-[#7BAAA3] text-[#7BAAA3] rounded text-sm hover:bg-[#7BAAA3]/10 transition"
              >
                <Icon iconName="MailReminder" />
                History
              </button>
            </div>
          )}

          {/* General Information Section */}
          <div className="mt-8 rounded-xl border bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className={HEADING_TEXT}>General information</h2>
              <IconButton
                iconProps={{
                  iconName: showGeneral ? "ChevronUp" : "ChevronDown",
                }}
                onClick={() => setShowGeneral((prev) => !prev)}
                ariaLabel="Toggle general information"
              />
            </div>
            {showGeneral && (
              <GeneralInformationSection
                key={`${user?.adxUserId}`}
                form={form}
                onTitleChange={(value) =>
                  setForm((prev) => ({ ...prev, title: value }))
                }
                onAbstractChange={(value) =>
                  setForm((prev) => ({ ...prev, abstract: value }))
                }
                onGrantCycleChange={(value) =>
                  setForm((prev) => ({ ...prev, grantCycle: value }))
                }
                onResearchAreaChange={(value) =>
                  setForm((prev) => ({ ...prev, researchArea: value }))
                }
                grantCycleId={grantCycleId}
                researchAreaId={researchAreaId}
                userAdxUserId={user && user.contact?.[ContactKeys.CONTACTID]}
              />
            )}
          </div>
          {/* Budget Details Section */}
          {/* {form.budgetHeaders && form.budgetHeaders != null && showBudget && (
            <BudgetSection
              key={`${form.budgetLineItems}`}
              budgetHeader={form.budgetHeaders}
              budgetLineItem={form.budgetLineItems}
              budgetCategories={BudgetCategorys}
              onAddBudgetLineItem={(item) => {
                const newLineItem: BudgetLineItem = {
                  id: crypto.randomUUID(),
                  name: item.name,
                  category: item.category,
                  description: item.description,
                  amount: parseFloat(item.amount),
                  action: "new",
                };
                setForm((prev) => ({
                  ...prev,
                  budgetLineItems: [...prev.budgetLineItems, newLineItem],
                }));
              }}
              onEditBudgetLineItem={(id, item) => {
                setForm((prev) => ({
                  ...prev,
                  budgetLineItems: prev.budgetLineItems.map((li) =>
                    li.id === id
                      ? {
                          ...li,
                          name: item.name,
                          category: item.category,
                          description: item.description,
                          amount: parseFloat(item.amount),
                          action: "existing" as const,
                        }
                      : li,
                  ),
                }));
              }}
              onRemoveBudgetLineItem={(id) => {
                setForm((prev) => ({
                  ...prev,
                  budgetLineItems: prev.budgetLineItems.map((li) =>
                    li.id === id ? { ...li, action: "remove" as const } : li,
                  ),
                }));
              }}
              form={form}
            />
          )} */}
          <BudgetSection
            key={`${form.budgetLineItems}`}
            budgetHeader={form.budgetHeaders}
            budgetLineItem={form.budgetLineItems}
            budgetCategories={BudgetCategorys}
            onAddBudgetLineItem={(item) => {
              const newLineItem: BudgetLineItem = {
                id: crypto.randomUUID(), // Ensure a unique ID is generated
                prmtk_lineitemname: item.name,
                prmtk_category: item.category,
                prmtk_description: item.description,
                prmtk_amount: parseFloat(item.amount),
                action: "new",
              };
              setForm((prev) => ({
                ...prev,
                budgetLineItems: [...prev.budgetLineItems, newLineItem],
              }));
            }}
            onEditBudgetLineItem={(id, item) => {
              setForm((prev) => ({
                ...prev,
                budgetLineItems: prev.budgetLineItems.map((li) =>
                  li.id === id
                    ? {
                        ...li,
                        prmtk_lineitemname: item.name,
                        prmtk_category: item.category,
                        prmtk_description: item.description,
                        prmtk_amount: parseFloat(item.amount),
                        action: "existing" as const,
                      }
                    : li,
                ),
              }));
            }}
            onRemoveBudgetLineItem={async (id) => {
              if (formType !== "new") {
                const itemToRemove = form.budgetLineItems.find(
                  (li) => li.id === id,
                );
                setShowLoader(true);
                const api = await callApi({
                  url: `/_api/${TableName.BUDGETLINEITEMS}(${itemToRemove?.id})`,
                  method: "DELETE",
                });
                setShowLoader(false);
              }
              setForm((prev) => ({
                ...prev,
                budgetLineItems: prev.budgetLineItems.filter(
                  (li) => li.id !== id,
                ),
              }));
            }}
            form={form}
          />

          {/* Team Members Section */}
          <div className="mt-6 rounded-xl border bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className={HEADING_TEXT}>Team members</h2>
              <IconButton
                iconProps={{
                  iconName: showTeam ? "ChevronUp" : "ChevronDown",
                }}
                onClick={() => setShowTeam((prev) => !prev)}
                ariaLabel="Toggle team members"
              />
            </div>
            <TeamMemberSection
              team={form.team}
              teamMemberRoles={teamMemberRoles}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              onEditMember={handleEditMember}
              form={form}
            />
          </div>

          {/* {formType !== "new" && ( */}
          <FileUploadSection
            applicationFiles={form.applicationFiles}
            generalFiles={form.generalFiles}
            onApplicationFilesAdd={handleApplicationFilesAdd}
            onGeneralFilesAdd={handleGeneralFilesAdd}
            onApplicationFileRemove={handleApplicationFileRemove}
            onGeneralFileRemove={handleGeneralFileRemove}
            form={form}
          />
          {/* )} */}

          <Reveal className="mt-8 flex justify-center ">
            <div className="flex items-center gap-5">
              {form.type !== "view" && (
                <PrimaryButton
                  styles={{ root: { width: "100%" } }}
                  onClick={() => handleSubmitClick("Submitted")}
                  disabled={!canSubmit || formType === "view" || showLoader}
                >
                  {showLoader ? "Submitting..." : "Submit Application"}
                </PrimaryButton>
              )}

              <div className="flex justify-end gap-4">
                {form.type !== "view" && (
                  <button
                    onClick={() => handleSubmitClick(status)}
                    disabled={formType === "view"}
                    className="flex items-center gap-2 px-4 py-1 border border-[#7BAAA3] text-[#7BAAA3] rounded text-sm hover:bg-[#7BAAA3]/10 transition w-[9rem]"
                  >
                    <Icon iconName="SingleBookmark" />
                    SAVE DRAFT
                  </button>
                )}
              </div>
            </div>
          </Reveal>
        </div>
        <SuccessDialog
          hidden={!showSuccessDialog}
          message={dialogMessage}
          onDismiss={() => {
            navigate("/applications", { state: {} });
          }}
        />
        <ErrorDialog
          hidden={!showErrorDialog}
          message={dialogMessage}
          onDismiss={() => {
            setShowErrorDialog(false);
            //Navigate({to: "/applications", replace: true,state:{}});
          }}
        />
        {/* Confirmation Dialog */}
        <div hidden={!showConfirmDialog}>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={handleCancelSubmit}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Confirm Submission
              </h2>
            </div>
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to submit this application?
              </p>
              <p className="mt-2 text-sm text-red-600 font-semibold">
                ⚠️ Once submitted, you will not be able to edit the information.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelSubmit}
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="px-4 py-2 rounded bg-[#E46D5A] text-white hover:bg-[#d35a47] transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
        <OverlayLoader
          isVisible={showLoader}
          label="Your request is being processed..."
        />

        {/* Workflow History Dialog */}
        <Dialog open={showWorkflowDialog} onOpenChange={setShowWorkflowDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>History</DialogTitle>
            </DialogHeader>
            <WorkflowTimeline
              workflowData={workflowHistory}
              applicationNumber={applicationNumber || ""}
              currentStatus={status || ""}
              username={user?.contact?.[ContactFields.FULLNAME] || ""}
            />
          </DialogContent>
        </Dialog>
      </section>
    </>
  );
}
