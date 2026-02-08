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
import { DatePicker } from "@fluentui/react/lib/DatePicker";
import { IconButton } from "@fluentui/react/lib/Button";
import { Label } from "@fluentui/react/lib/Label";
import { IDropdownOption } from "@fluentui/react/lib/Dropdown";
import { DefaultButton, PrimaryButton } from "@fluentui/react/lib/Button";
import {
  TableName,
  ResearchAreaKeys,
  ContactKeys,
  ResearchKeys,
  ResearchTeamMemberKeys,
  TeamMemberRoles,
  ExpandRelations,
  ApplicationTeamMemberKeys,
  ApplicationKeys,
  ApplicationTeamMemberFields,
  StatusReportFields,
  DisseminationRequestFields,
  DeliverableFields,
  ContactFields,
} from "@/constants";
import { getDeliverableTypeText } from "@/constants/deliverables";
import { ConfirmDialog, ErrorDialog, SuccessDialog } from "@/components/Dialog";
import { OverlayLoader } from "@/components/Loader";
import { FlowEmailPayload, useFlowApi } from "@/hooks/useFlowApi";
import { fileToBase64, getFileKey } from "@/services/utility";
import { APIURL } from "@/constants/url";
import {
  processReportFileUploads,
  processDisseminationFileUploads,
  processDeliverableFileUploads,
  loadReportFiles,
  loadDisseminationFiles,
  loadDeliverableFiles,
} from "@/services/reportFileUpload";
import { BudgetHeaderFields } from "@/constants/budgetHeader";
import {
  BudgetSection,
  BudgetHeader,
  BudgetLineItem,
} from "@/components/BudgetSection";
import { BudgetLineItemFields } from "@/constants/budgetLineItem";
import { BudgetCategorys } from "@/constants/options";
import { FileUploadSection } from "@/components/FileUploadSection";
import { HEADING_TEXT } from "@/styles/constants";
import { ReportingSection, ReportItem } from "@/components/ReportingSection";
import {
  DisseminationRequestSection,
  DisseminationRequest,
} from "@/components/DisseminationRequestSection";
import {
  DeliverablesSection,
  Deliverable,
} from "@/components/DeliverablesSection";
import { FileUploadSectionResearch } from "@/components/FileUploadSectionResearch";
import { Dropdown } from "@fluentui/react/lib/Dropdown";
import { Badge } from "@/ui/badge";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  action: "new" | "existing" | "remove";
}

interface BudgetVersion {
  id: string;
  version: number;
  status: number;
  name: string;
  isActive: boolean;
}

interface FormState {
  budgetHeaders: BudgetHeader;
  budgetLineItems: BudgetLineItem[];
  budgetVersions: BudgetVersion[];
  selectedBudgetVersion: string | null;
  reportItems: ReportItem[];
  disseminationRequests: DisseminationRequest[];
  deliverables: Deliverable[];
  title: string;
  submissionDate: string;
  startDate?: Date;
  endDate?: Date;
  researchArea: string | null;
  application: string | null;
  principalInvestigator: string;
  files: { file: File; action: "new" | "existing" | "remove" }[];
  team: TeamMember[];
  type: "new" | "edit" | "view";
  researchNumber?: string;
}

interface AddMemberForm {
  name: string;
  role: string;
  customRoleName?: string;
  educationLevel?: string;
}

interface TeamMemberOption {
  key: string;
  text: string;
}

const INITIAL_FORM_STATE: FormState = {
  title: "",
  submissionDate: "",
  startDate: undefined,
  endDate: undefined,
  researchArea: null,
  application: null,
  principalInvestigator: "",
  files: [],
  team: [],
  budgetHeaders: null,
  budgetLineItems: [],
  budgetVersions: [],
  selectedBudgetVersion: null,
  reportItems: [],
  disseminationRequests: [],
  deliverables: [],
  type: "new",
};

const INITIAL_MEMBER_FORM: AddMemberForm = {
  name: "",
  role: "",
};

// Tailwind class constants

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Helper function to process team members
const processTeamMembers = async (
  team: TeamMember[],
  researchId: string,
  callApi: (options: any) => Promise<any>,
): Promise<void> => {
  const upsertPromises = team
    .filter((member) => member.action !== "remove")
    .map(async (member) => {
      const method = member.action === "existing" ? "PATCH" : "POST";
      const url =
        member.action === "existing"
          ? `/_api/${TableName.RESEARCHTEAMMEMBER}(${member.id})`
          : `/_api/${TableName.RESEARCHTEAMMEMBER}`;

      const data: Record<string, any> = {
        [ResearchTeamMemberKeys.TEAMMEMBERNAME]: member.name,
        [ResearchTeamMemberKeys.ROLE]: member.role,
      };

      if (member.action === "new") {
        data[ResearchTeamMemberKeys.RESEARCH_ID] =
          `/${TableName.RESEARCHES}(${researchId})`;
      }

      return callApi({ url, method, data });
    });

  const removePromises = team
    .filter((member) => member.action === "remove" && member.id !== researchId)
    .map(async (member) =>
      callApi({
        url: `/_api/${TableName.RESEARCHTEAMMEMBER}(${member.id})`,
        method: "DELETE",
      }),
    );

  await Promise.all([...upsertPromises, ...removePromises]);
};

// Helper function to get research number
const getResearchNumber = async (
  formType: string,
  researchId: string,
  stateResearchNumber: string | undefined,
  callApi: (options: any) => Promise<any>,
): Promise<string> => {
  if (formType === "edit" && stateResearchNumber) {
    return stateResearchNumber;
  }

  const res = await callApi({
    url: `/_api/${TableName.RESEARCHES}?$filter=${ResearchKeys.RESEARCHID} eq ${researchId}&$select=${ResearchKeys.RESEARCHNUMBER}`,
    method: "GET",
  });

  return res?.value?.[0]?.[ResearchKeys.RESEARCHNUMBER] || "";
};

// Helper function to process file uploads
const processFileUploads = async (
  files: { file: File; action: "new" | "existing" | "remove" }[],
  researchNumber: string,
  triggerFlow: (url: string, payload: any) => Promise<any>,
  user: any,
): Promise<void> => {
  const uploadPromises = files
    .filter((file) => file.action === "new")
    .map(async (file) => {
      const base64Content = await fileToBase64(file.file);
      const payload: any = {
        FileContent: base64Content,
        FileName: file.file.name,
        Library: "Researches",
        Folder: researchNumber,
        FileType: "other",
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

  await Promise.all(uploadPromises);
};

// Helper function to process budget data
const processBudgetData = async (
  budgetHeader: BudgetHeader | null,
  budgetLineItems: BudgetLineItem[],
  applicationId: string,
  callApi: (options: any) => Promise<any>,
): Promise<void> => {
  if (!budgetHeader) {
    // console.log("No budget header to process");
    return;
  }

  let budgetHeaderId = budgetHeader.id;

  // Process budget line items in parallel
  const lineItemPromises = budgetLineItems
    .filter((item) => item.action !== "remove")
    .map(async (item) => {
      const method = item.action === "existing" ? "PATCH" : "POST";
      const url =
        item.action === "existing"
          ? `/_api/${TableName.BUDGETLINEITEMS}(${item.id})`
          : `/_api/${TableName.BUDGETLINEITEMS}`;

      const data: Record<string, any> = {
        [BudgetLineItemFields.LINEITEMNAME]: item.prmtk_lineitemname,
        [BudgetLineItemFields.DESCRIPTION]: item.prmtk_description,
        [BudgetLineItemFields.AMOUNT]: item.prmtk_amount,
        [BudgetLineItemFields.CATEGORY]: item.prmtk_category,
      };

      // Only add binding for new items
      if (item.action === "new") {
        data[BudgetLineItemFields.BUDGETHEADER_ID] =
          `/${TableName.BUDGETHEADERS}(${budgetHeaderId})`;
      }

      return callApi({ url, method, data });
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

// Helper function to clone budget header and line items
const cloneBudgetWithVersion = async (
  sourceBudgetHeader: BudgetHeader,
  sourceBudgetLineItems: BudgetLineItem[],
  researchId: string,
  callApi: (options: any) => Promise<any>,
): Promise<{ newBudgetHeaderId: string; newVersion: number }> => {
  // Get all budget versions for this research
  const budgetHeadersRes = await callApi({
    url: `/_api/${TableName.BUDGETHEADERS}?$filter=${BudgetHeaderFields.RESEARCH} eq ${researchId}&$select=${BudgetHeaderFields.BUDGETHEADERID},${BudgetHeaderFields.VERSIONNUMBER_BUDGET}`,
    method: "GET",
  });

  const existingVersions = budgetHeadersRes?.value || [];
  const maxVersion = Math.max(
    0,
    ...existingVersions.map(
      (b: any) => b[BudgetHeaderFields.VERSIONNUMBER_BUDGET] || 0,
    ),
  );
  const newVersion = maxVersion + 1;

  // Create new budget header with status "Draft" (assuming 101 is draft)
  const newBudgetHeaderData: Record<string, any> = {
    [BudgetHeaderFields.BUDGETNAME]: `${sourceBudgetHeader.name} - Version ${newVersion}`,
    [BudgetHeaderFields.TOTALBUDGET]: sourceBudgetHeader.totalBudget,
    [BudgetHeaderFields.VERSIONNUMBER_BUDGET]: newVersion,
    [BudgetHeaderFields.STATUS]: 101, // Draft status
    [BudgetHeaderFields.RESEARCH_ID]: `/${TableName.RESEARCHES}(${researchId})`,
  };

  const newHeaderResponse = await callApi({
    url: `/_api/${TableName.BUDGETHEADERS}`,
    method: "POST",
    data: newBudgetHeaderData,
  });

  const newBudgetHeaderId = newHeaderResponse?.headers
    ?.get("OData-EntityId")
    ?.match(/\(([^)]+)\)/)?.[1];

  if (!newBudgetHeaderId) {
    throw new Error("Failed to create new budget header");
  }

  // Clone all budget line items
  const cloneLineItemPromises = sourceBudgetLineItems.map(async (item) => {
    const lineItemData: Record<string, any> = {
      [BudgetLineItemFields.LINEITEMNAME]: item.prmtk_lineitemname,
      [BudgetLineItemFields.DESCRIPTION]: item.prmtk_description,
      [BudgetLineItemFields.AMOUNT]: item.prmtk_amount,
      [BudgetLineItemFields.CATEGORY]: item.prmtk_category,
      [BudgetLineItemFields.BUDGETHEADER_ID]: `/${TableName.BUDGETHEADERS}(${newBudgetHeaderId})`,
    };

    return callApi({
      url: `/_api/${TableName.BUDGETLINEITEMS}`,
      method: "POST",
      data: lineItemData,
    });
  });

  await Promise.all(cloneLineItemPromises);

  return { newBudgetHeaderId, newVersion };
};

// Helper function to update budget header status
const updateBudgetHeaderStatus = async (
  budgetHeaderId: string,
  status: number,
  callApi: (options: any) => Promise<any>,
): Promise<void> => {
  await callApi({
    url: `/_api/${TableName.BUDGETHEADERS}(${budgetHeaderId})`,
    method: "PATCH",
    data: {
      [BudgetHeaderFields.STATUS]: status,
    },
  });
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

// Helper function to view/download files
const viewFile = (fileData: {
  fileName: string;
  contentType: string;
  base64: string;
}) => {
  const { fileName, contentType, base64 } = fileData;

  // Convert base64 to blob
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: contentType });

  // Create object URL
  const url = URL.createObjectURL(blob);

  // For PDFs and images, open in new tab, otherwise download
  if (contentType === "application/pdf" || contentType.startsWith("image/")) {
    window.open(url, "_blank");
  } else {
    // Download the file
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Clean up the URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * Usage example:
 *
 * // When you receive API response with files array:
 * const handleViewFiles = (filesData: Array<{fileName: string, contentType: string, base64: string}>) => {
 *   filesData.forEach(file => viewFile(file));
 * };
 *
 * // Or to view a single file from the array:
 * <button onClick={() => viewFile(data[0])}>View File</button>
 */

interface GeneralInformationSectionProps {
  form: FormState;
  onTitleChange: (value: string) => void;
  onApplicationChange: (applicationId: string | null) => void;
  onResearchAreaChange: (areaId: string | null) => void;
  onPrincipalInvestigatorChange: (contactId: string) => void;
  onStartDateChange: (date?: Date) => void;
  onEndDateChange: (date?: Date) => void;
  applicationIdFromState: string | undefined;
  researchAreaIdFromState: string | undefined;
  userAdxUserId?: string;
}

const GeneralInformationSection: React.FC<GeneralInformationSectionProps> = ({
  form,
  onTitleChange,
  onApplicationChange,
  onResearchAreaChange,
  onPrincipalInvestigatorChange,
  onStartDateChange,
  onEndDateChange,
  applicationIdFromState,
  researchAreaIdFromState,
  userAdxUserId,
}) => (
  <Reveal className="mt-8">
    <div className="mt-4 grid gap-6 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label htmlFor="title">Research Title</Label>
        <div className="mt-1">
          <TextField
            id="title"
            value={form.title}
            onChange={(e, newValue) => onTitleChange(newValue || "")}
            placeholder="Enter project title"
            disabled={form.type === "view"}
            borderless
          />
        </div>
      </div>
      <div>
        <Label>Application Reference</Label>
        <div className="mt-1">
          <LookupPicker
            key={`application-${applicationIdFromState || "none"}`}
            displayField={ApplicationKeys.APPLICATIONTITLE}
            keyField={ApplicationKeys.APPLICATIONID}
            secondaryField={ApplicationKeys.ABSTRACT}
            searchField={ApplicationKeys.APPLICATIONTITLE}
            tableName={TableName.APPLICATIONS}
            maxSelection={1}
            label="Application"
            cascadeField={ApplicationKeys.APPLICATIONID}
            cascadeValue={applicationIdFromState}
            isDefaultSelected={applicationIdFromState != null}
            disabled={form.type === "view"}
            onSelect={(values) => {
              onApplicationChange(
                values && values.length > 0
                  ? values[0][ApplicationKeys.APPLICATIONID]
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
            key={`research-area-${researchAreaIdFromState || "none"}`}
            displayField={ResearchAreaKeys.AREANAME}
            keyField={ResearchAreaKeys.RESEARCHAREAID}
            secondaryField={ResearchAreaKeys.AREADESCRIPTION}
            searchField={ResearchAreaKeys.AREANAME}
            tableName={TableName.RESEARCHAREAS}
            maxSelection={1}
            label="Research Area"
            cascadeField={ResearchAreaKeys.RESEARCHAREAID}
            cascadeValue={researchAreaIdFromState}
            isDefaultSelected={researchAreaIdFromState != null}
            disabled={form.type === "view"}
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
      <div>
        <Label>Principal Investigator</Label>
        <div className="mt-1">
          <LookupPicker
            key={`principal-investigator-${userAdxUserId || "none"}`}
            displayField={ContactKeys.FULLNAME}
            keyField={ContactKeys.CONTACTID}
            secondaryField={ContactKeys.EMAILADDRESS1}
            searchField={ContactKeys.FULLNAME}
            tableName={TableName.CONTACTS}
            maxSelection={1}
            label="Contact"
            cascadeField={ContactKeys.ADX_USERID}
            cascadeValue={userAdxUserId}
            isDefaultSelected={true}
            disabled={form.type === "view"}
            onSelect={(value) => {
              if (value && value.length > 0) {
                onPrincipalInvestigatorChange(value[0][ContactKeys.CONTACTID]);
              }
            }}
          />
        </div>
      </div>
      <div>
        <Label>Start Date</Label>
        <div className="mt-1">
          <DatePicker
            value={form.startDate}
            onSelectDate={onStartDateChange}
            disabled={form.type === "view"}
          />
        </div>
      </div>
      <div>
        <Label>End Date</Label>
        <div className="mt-1">
          <DatePicker
            value={form.endDate}
            onSelectDate={onEndDateChange}
            disabled={form.type === "view"}
          />
        </div>
      </div>
    </div>
  </Reveal>
);

export default function FormResearch() {
  const { user } = useAuth();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL_FORM_STATE,
    submissionDate: formatDate(new Date()),
  }));
  const [showGeneral, setShowGeneral] = useState(true);
  const [showTeam, setShowTeam] = useState(true);
  const [showBudget, setShowBudget] = useState(true);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [teamMemberRoles, setTeamMemberRoles] = useState<IDropdownOption[]>([]);

  // Lazy loading states for optional sections
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [disseminationLoaded, setDisseminationLoaded] = useState(false);
  const [deliverablesLoaded, setDeliverablesLoaded] = useState(false);
  const { callApi } = useDataverseApi();
  const { triggerFlow } = useFlowApi();
  const [searchParams] = useSearchParams();
  const formType = searchParams.get("formType") || "new";
  const researchAreaId = searchParams.get("researchId") || "";
  const applicationId = searchParams.get("applicationId") || "";
  // console.log("FormResearch state:", form);
  // console.log("Current state:", state);

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
      // Fetch budget header with expanded line items in a single call
      // Only select necessary fields to reduce payload size
      const budgetHeaderSelect = `${BudgetHeaderFields.BUDGETHEADERID},${BudgetHeaderFields.BUDGETNAME},${BudgetHeaderFields.RESEARCH},${BudgetHeaderFields.TOTALBUDGET},${BudgetHeaderFields.VERSIONNUMBER_BUDGET},${BudgetHeaderFields.STATUS}`;
      const budgetLineItemSelect = `${BudgetLineItemFields.BUDGETLINEITEMID},${BudgetLineItemFields.LINEITEMNAME},${BudgetLineItemFields.CATEGORY},${BudgetLineItemFields.DESCRIPTION},${BudgetLineItemFields.AMOUNT},${BudgetLineItemFields.BUDGETHEADER}`;

      const res = await callApi<{ value: any[] }>({
        url: `/_api/${TableName.BUDGETHEADERS}?$filter=${BudgetHeaderFields.RESEARCH} eq ${applicationId}&$select=${budgetHeaderSelect}&$expand=${ExpandRelations.BUDGET_LINE_ITEMS}($select=${budgetLineItemSelect})`,
        method: "GET",
      });
      const budgetData = res.value?.[0];

      if (!budgetData) {
        return;
      }

      // Use expanded line items from the header response instead of making a separate call
      const lineItems = budgetData[ExpandRelations.BUDGET_LINE_ITEMS] || [];
      const budgetHeader = mapBudgetHeader(budgetData);
      const budgetLineItems = mapBudgetLineItems(lineItems);

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

  const loadReportStatus = async (researchId: string): Promise<void> => {
    if (formType === "new") {
      return;
    }
    try {
      // Select only necessary fields to reduce payload
      const reportSelect = `${StatusReportFields.STATUSREPORTID},${StatusReportFields.REPORTTITLE},${StatusReportFields.REPORTINGYEAR},${StatusReportFields.REPORTINGMONTH},${StatusReportFields.REPORTINGDATE},${StatusReportFields.BUDGETSPENT_BASE},${StatusReportFields.RESEARCHHEALTHINDICATOR},${StatusReportFields.ACHIEVEMENTS},${StatusReportFields.CHALLENGES},${StatusReportFields.KEYACTIVITIES},${StatusReportFields.UPCOMINGACTIVITIES},${StatusReportFields.JOURNALPUBLICATIONS},${StatusReportFields.WORKFORCEDEVELOPMENT}`;

      const res2 = await callApi<{ value: any[] }>({
        url: `/_api/${TableName.STATUSREPORT}?$filter=${StatusReportFields.RESEARCH} eq ${researchId}&$select=${reportSelect}`,
        method: "GET",
      });

      const filteredReports = res2.value || [];

      // Get research number for file loading
      const researchNumber =
        form.researchNumber || state?.item?.[ResearchKeys.RESEARCHNUMBER];

      // Load files for each report in parallel
      const reportsWithFiles = await Promise.all(
        filteredReports.map(async (item: any) => {
          let files: { file: File; action: "existing" }[] = [];

          if (
            researchNumber &&
            item[StatusReportFields.REPORTINGYEAR] &&
            item[StatusReportFields.REPORTINGMONTH]
          ) {
            files = await loadReportFiles(
              researchNumber,
              item[StatusReportFields.REPORTINGYEAR].toString(),
              item[StatusReportFields.REPORTINGMONTH].toString(),
              triggerFlow,
            );
          }

          return {
            id: item[StatusReportFields.STATUSREPORTID],
            prmtk_reporttitle: item[StatusReportFields.REPORTTITLE] || "",
            prmtk_reportingyear: item[StatusReportFields.REPORTINGYEAR] || "",
            prmtk_reportingmonth: item[StatusReportFields.REPORTINGMONTH] || "",
            reportingDate: item[StatusReportFields.REPORTINGDATE] || "",
            prmtk_budgetspent: parseFloat(
              item[StatusReportFields.BUDGETSPENT_BASE] || "0",
            ),
            prmtk_researchhealthindicator:
              item[StatusReportFields.RESEARCHHEALTHINDICATOR],
            prmtk_achievements: item[StatusReportFields.ACHIEVEMENTS] || "",
            prmtk_challenges: item[StatusReportFields.CHALLENGES] || "",
            prmtk_keyactivities: item[StatusReportFields.KEYACTIVITIES] || "",
            prmtk_upcomingactivities:
              item[StatusReportFields.UPCOMINGACTIVITIES] || "",
            prmtk_journalpublications:
              item[StatusReportFields.JOURNALPUBLICATIONS] || "",
            prmtk_workforcedevelopment:
              item[StatusReportFields.WORKFORCEDEVELOPMENT] || "",
            files: files,
            action: "existing" as const,
          };
        }),
      );

      setForm((prev) => ({
        ...prev,
        reportItems: reportsWithFiles,
      }));
    } catch (error) {
      console.error("Failed to load budget details:", error);
      // Don't throw error - budget is optional
    }
  };

  const loadDisseminationRequests = async (
    researchId: string,
  ): Promise<void> => {
    if (formType === "new") {
      return;
    }
    try {
      // Select only necessary fields to reduce payload
      const disseminationSelect = `${DisseminationRequestFields.DISSEMINATIONAPPLICANTID},${DisseminationRequestFields.TITLE},${DisseminationRequestFields.JOURNALNAME},${DisseminationRequestFields.ABSTRACT},${DisseminationRequestFields.BUDGETNEEDED_BASE},${DisseminationRequestFields.SUBMISSIONDATE},${DisseminationRequestFields.REQUESTSTATUS}`;

      const res = await callApi<{ value: any[] }>({
        url: `/_api/${TableName.DISSEMINATIONAPPLICANTS}?$filter=${DisseminationRequestFields.RESEARCH} eq ${researchId}&$select=${disseminationSelect}`,
        method: "GET",
      });

      const filteredRequests = res.value || [];

      // Get research number for file loading
      const researchNumber =
        form.researchNumber || state?.item?.[ResearchKeys.RESEARCHNUMBER];

      // Load files for each dissemination request in parallel
      const requestsWithFiles = await Promise.all(
        filteredRequests.map(async (item: any) => {
          let files: { file: File; action: "existing" }[] = [];

          if (
            researchNumber &&
            item[DisseminationRequestFields.SUBMISSIONDATE] &&
            item[DisseminationRequestFields.BUDGETNEEDED_BASE]
          ) {
            files = await loadDisseminationFiles(
              researchNumber,
              item[DisseminationRequestFields.SUBMISSIONDATE],
              item[DisseminationRequestFields.BUDGETNEEDED_BASE],
              triggerFlow,
            );
          }

          return {
            id: item[DisseminationRequestFields.DISSEMINATIONAPPLICANTID],
            title: item[DisseminationRequestFields.TITLE] || "",
            journalName: item[DisseminationRequestFields.JOURNALNAME] || "",
            abstract: item[DisseminationRequestFields.ABSTRACT] || "",
            budgetNeeded: parseFloat(
              item[DisseminationRequestFields.BUDGETNEEDED_BASE] || "0",
            ),
            submissionDate:
              item[DisseminationRequestFields.SUBMISSIONDATE] || "",
            requestStatus: item[DisseminationRequestFields.REQUESTSTATUS] || 1,
            files: files,
            action: "existing" as const,
          };
        }),
      );

      setForm((prev) => ({
        ...prev,
        disseminationRequests: requestsWithFiles,
      }));
    } catch (error) {
      console.error("Failed to load dissemination requests:", error);
      // Don't throw error - dissemination requests are optional
    }
  };

  const loadDeliverables = async (researchId: string): Promise<void> => {
    if (formType === "new") {
      return;
    }
    try {
      // Select only necessary fields to reduce payload
      const deliverableSelect = `${DeliverableFields.DELIVERABLEID},${DeliverableFields.DELIVERABLENAME},${DeliverableFields.DESCRIPTION},${DeliverableFields.DELIVERABLETYPE},${DeliverableFields.SUBMISSIONDATE},${DeliverableFields.FILEURL}`;

      const res = await callApi<{ value: any[] }>({
        url: `/_api/${TableName.DELIVERABLES}?$filter=${DeliverableFields.RESEARCH} eq ${researchId}&$select=${deliverableSelect}`,
        method: "GET",
      });

      const filteredDeliverables = res.value || [];

      // Get research number for file loading
      const researchNumber =
        form.researchNumber || state?.item?.[ResearchKeys.RESEARCHNUMBER];

      // Load files for each deliverable in parallel
      const deliverablesWithFiles = await Promise.all(
        filteredDeliverables.map(async (item: any) => {
          let files: { file: File; action: "existing" }[] = [];

          if (
            researchNumber &&
            item[DeliverableFields.DELIVERABLENAME] &&
            item[DeliverableFields.DELIVERABLETYPE] !== undefined
          ) {
            const deliverableTypeText = getDeliverableTypeText(
              item[DeliverableFields.DELIVERABLETYPE],
            );
            files = await loadDeliverableFiles(
              researchNumber,
              item[DeliverableFields.DELIVERABLENAME],
              deliverableTypeText,
              triggerFlow,
            );
          }

          return {
            id: item[DeliverableFields.DELIVERABLEID],
            deliverableName: item[DeliverableFields.DELIVERABLENAME] || "",
            description: item[DeliverableFields.DESCRIPTION] || "",
            deliverableType: item[DeliverableFields.DELIVERABLETYPE] || 0,
            submissionDate: item[DeliverableFields.SUBMISSIONDATE] || "",
            fileUrl: item[DeliverableFields.FILEURL] || "",
            fileName: item[DeliverableFields.DELIVERABLENAME] || "",
            files: files,
            action: "existing" as const,
          };
        }),
      );

      setForm((prev) => ({
        ...prev,
        deliverables: deliverablesWithFiles,
      }));
    } catch (error) {
      console.error("Failed to load deliverables:", error);
      // Don't throw error - deliverables are optional
    }
  };

  const loadTeamMembers = async (researchId: string): Promise<void> => {
    if (formType === "new") {
      return;
    }
    try {
      // Select only necessary fields to reduce payload
      const teamMemberSelect = `${ResearchTeamMemberKeys.RESEARCHTEAMMEMBERID},${ResearchTeamMemberKeys.TEAMMEMBERNAME},${ResearchTeamMemberKeys.ROLE},${ResearchTeamMemberKeys.CUSTOMROLE},${ResearchTeamMemberKeys.EDUCATIONLEVEL}`;

      const res = await callApi<{ value: any[] }>({
        url: `/_api/${TableName.RESEARCHTEAMMEMBER}?$filter=_prmtk_research_value eq ${researchId}&$select=${teamMemberSelect}`,
        method: "GET",
      });

      const filteredMembers = res.value || [];
      // console.log(filteredMembers, "filteredMembers");

      const teamMembers: TeamMember[] = filteredMembers.map((tm: any) => ({
        id: tm[ResearchTeamMemberKeys.RESEARCHTEAMMEMBERID],
        name: tm[ResearchTeamMemberKeys.TEAMMEMBERNAME],
        role: tm[ResearchTeamMemberKeys.ROLE],
        customRoleName: tm[ResearchTeamMemberKeys.CUSTOMROLE] || "",
        educationLevel: tm[ResearchTeamMemberKeys.EDUCATIONLEVEL],
        action: "existing" as const,
      }));

      setForm((prev) => ({
        ...prev,
        team: teamMembers,
      }));
    } catch (error) {
      console.error("Failed to load team members:", error);
      // Don't throw error - team members are optional
    }
  };

  // Load research details if editing
  const loadResearchDetails = useCallback(
    async (researchId: string) => {
      setShowLoader(true);
      try {
        // Select only necessary fields to reduce payload
        const select = `${ResearchKeys.RESEARCHID},${ResearchKeys.RESEARCHTITLE},${ResearchKeys.STARTDATE},${ResearchKeys.ENDDATE},${ResearchKeys.RESEARCHAREA},${ResearchKeys.APPLICATIONREFERENCE},${ResearchKeys.PRINCIPALINVESTIGATOR},${ResearchKeys.RESEARCHNUMBER}`;
        const expand = ExpandRelations.RESEARCH_TEAM_MEMBER;
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

        const filter = `${ResearchKeys.RESEARCHID} eq ${researchId} and ${ResearchKeys.PRINCIPALINVESTIGATOR} eq ${currentUserContactId}`;

        const res = await callApi<{ value: any[] }>({
          url: `/_api/${TableName.RESEARCHES}?$filter=${filter}&$select=${select}&$expand=${expand}`,
          method: "GET",
        });

        const research = res?.value?.[0];
        if (!research) {
          console.warn("No research found with ID:", researchId);
          return;
        }

        // Load research number and files
        const researchNumber = await getResearchNumber(
          form.type,
          researchId,
          state?.item?.[ResearchKeys.RESEARCHNUMBER],
          callApi,
        );

        // Load files from SharePoint
        const files = await loadApplicationFiles(researchNumber);

        // Load only critical data (budget and team members) in parallel
        // Optional data (reports, dissemination, deliverables) will be loaded lazily
        await Promise.all([
          loadBudgetDetails(researchAreaId),
          loadTeamMembers(researchId),
        ]);
        // Update form state
        setForm((prev) => ({
          ...prev,
          title: research[ResearchKeys.RESEARCHTITLE] || "",
          startDate: research[ResearchKeys.STARTDATE]
            ? new Date(research[ResearchKeys.STARTDATE])
            : undefined,
          endDate: research[ResearchKeys.ENDDATE]
            ? new Date(research[ResearchKeys.ENDDATE])
            : undefined,
          researchArea: research[ResearchKeys.RESEARCHAREA] || null,
          application: research[ResearchKeys.APPLICATIONREFERENCE] || null,
          principalInvestigator:
            research[ResearchKeys.PRINCIPALINVESTIGATOR] || "",
          submissionDate: prev.submissionDate, // Keep original submission date
          type: state?.formType === "view" ? "view" : "edit",
          files: files || [],
          researchNumber: research[ResearchKeys.RESEARCHNUMBER] || null,
        }));
      } catch (error) {
        console.error("Failed to load research details:", error);
        toast({
          title: "Error",
          description: "Unable to load research details. Please try again.",
        });
      } finally {
        setShowLoader(false);
      }
    },
    [callApi, triggerFlow, state?.type, user],
  );

  const loadApplicationFiles = async (
    researchNumber: string,
  ): Promise<any[]> => {
    // console.log("ReasearchNumber", researchNumber);
    if (!researchNumber) return [];

    try {
      const applicationFiles = await triggerFlow<any, any[]>(
        APIURL.FileGetEndpoint,
        {
          Library: "Researches",
          Folder: researchNumber,
        },
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

  // Load team member roles
  const loadTeamMemberRoles = useCallback(async () => {
    try {
      setTeamMemberRoles(TeamMemberRoles.APPLICATION as any);
    } catch (error) {
      console.error("Failed to load team member roles:", error);
    }
  }, []);

  // Lazy load optional sections
  const loadOptionalReportData = useCallback(
    async (researchId: string) => {
      if (reportsLoaded || formType === "new") return;
      await loadReportStatus(researchId);
      setReportsLoaded(true);
    },
    [formType, reportsLoaded]
  );

  const loadOptionalDisseminationData = useCallback(
    async (researchId: string) => {
      if (disseminationLoaded || formType === "new") return;
      await loadDisseminationRequests(researchId);
      setDisseminationLoaded(true);
    },
    [formType, disseminationLoaded]
  );

  const loadOptionalDeliverableData = useCallback(
    async (researchId: string) => {
      if (deliverablesLoaded || formType === "new") return;
      await loadDeliverables(researchId);
      setDeliverablesLoaded(true);
    },
    [formType, deliverablesLoaded]
  );

  // Load all budget versions for research
  const loadBudgetVersions = useCallback(
    async (researchId: string) => {
      try {
        // Select only necessary fields to reduce payload and use top 20 for performance
        const budgetVersionSelect = `${BudgetHeaderFields.BUDGETHEADERID},${BudgetHeaderFields.BUDGETNAME},${BudgetHeaderFields.VERSIONNUMBER_BUDGET},${BudgetHeaderFields.STATUS}`;
        const res = await callApi<{ value: any[] }>({
          url: `/_api/${TableName.BUDGETHEADERS}?$filter=${BudgetHeaderFields.RESEARCH} eq ${researchId}&$select=${budgetVersionSelect}&$orderby=${BudgetHeaderFields.VERSIONNUMBER_BUDGET} desc&$top=20`,
          method: "GET",
        });

        const versions: BudgetVersion[] = (res?.value || []).map((v: any) => ({
          id: v[BudgetHeaderFields.BUDGETHEADERID],
          version: v[BudgetHeaderFields.VERSIONNUMBER_BUDGET] || 1,
          status: v[BudgetHeaderFields.STATUS] || 101,
          name: v[BudgetHeaderFields.BUDGETNAME] || "",
          isActive: v[BudgetHeaderFields.STATUS] === 103, // 103 = Approved
        }));

        setForm((prev) => ({
          ...prev,
          budgetVersions: versions,
          selectedBudgetVersion: versions.length > 0 ? versions[0].id : null,
        }));

        // Load the first version by default
        if (versions.length > 0) {
          await loadBudgetByVersion(versions[0].id);
        }
      } catch (error) {
        console.error("Failed to load budget versions:", error);
      }
    },
    [callApi],
  );

  // Load budget by specific version
  const loadBudgetByVersion = useCallback(
    async (budgetHeaderId: string) => {
      try {
        // Select only necessary fields and fetch header with expanded line items
        const budgetHeaderSelect = `${BudgetHeaderFields.BUDGETHEADERID},${BudgetHeaderFields.BUDGETNAME},${BudgetHeaderFields.RESEARCH},${BudgetHeaderFields.TOTALBUDGET},${BudgetHeaderFields.VERSIONNUMBER_BUDGET},${BudgetHeaderFields.STATUS}`;
        const budgetLineItemSelect = `${BudgetLineItemFields.BUDGETLINEITEMID},${BudgetLineItemFields.LINEITEMNAME},${BudgetLineItemFields.CATEGORY},${BudgetLineItemFields.DESCRIPTION},${BudgetLineItemFields.AMOUNT},${BudgetLineItemFields.BUDGETHEADER}`;

        // Fetch budget header with expanded line items
        const headerRes = await callApi<{ value: any[] }>({
          url: `/_api/${TableName.BUDGETHEADERS}?$filter=${BudgetHeaderFields.BUDGETHEADERID} eq ${budgetHeaderId}&$select=${budgetHeaderSelect}&$expand=${ExpandRelations.BUDGET_LINE_ITEMS}($select=${budgetLineItemSelect})`,
          method: "GET",
        });

        const budgetData = headerRes?.value?.[0];
        if (!budgetData) return;

        // Use expanded line items instead of separate call
        const lineItems = budgetData[ExpandRelations.BUDGET_LINE_ITEMS] || [];

        const budgetHeader = mapBudgetHeader(budgetData);
        const budgetLineItems = mapBudgetLineItems(lineItems);

        setForm((prev) => ({
          ...prev,
          budgetHeaders: budgetHeader,
          budgetLineItems: budgetLineItems,
          selectedBudgetVersion: budgetHeaderId,
        }));
      } catch (error) {
        console.error("Failed to load budget by version:", error);
      }
    },
    [callApi],
  );

  // Handle Update Budget (clone current budget)
  const [showCloneBudgetConfirm, setShowCloneBudgetConfirm] = useState(false);
  const handleUpdateBudgetClick = () => {
    setShowCloneBudgetConfirm(true);
  };

  const handleUpdateBudgetConfirm = async () => {
    setShowCloneBudgetConfirm(false);
    if (!form.budgetHeaders || !researchAreaId) {
      toast({
        title: "Error",
        description: "No budget to clone or research ID missing.",
        variant: "destructive",
      });
      return;
    }

    setShowLoader(true);
    try {
      const { newBudgetHeaderId, newVersion } = await cloneBudgetWithVersion(
        form.budgetHeaders,
        form.budgetLineItems,
        researchAreaId,
        callApi,
      );

      toast({
        title: "Success",
        description: `Budget Version ${newVersion} created successfully with Draft status.`,
      });

      // Reload budget versions and select the new one
      await loadBudgetVersions(researchAreaId);
      await loadBudgetByVersion(newBudgetHeaderId);
    } catch (error) {
      console.error("Failed to clone budget:", error);
      toast({
        title: "Error",
        description: "Failed to create new budget version.",
        variant: "destructive",
      });
    } finally {
      setShowLoader(false);
    }
  };

  // Handle Edit Budget Status (submit draft)
  const [showSubmitBudgetConfirm, setShowSubmitBudgetConfirm] = useState(false);
  const handleEditBudgetClick = () => {
    if (!form.budgetHeaders) return;

    // Check if current budget is in draft status (101)
    const currentVersion = form.budgetVersions.find(
      (v) => v.id === form.selectedBudgetVersion,
    );
    if (currentVersion?.status !== 101) {
      toast({
        title: "Info",
        description: "Only draft budgets can be submitted.",
      });
      return;
    }

    setShowSubmitBudgetConfirm(true);
  };

  const handleEditBudgetConfirm = async () => {
    setShowSubmitBudgetConfirm(false);
    if (!form.selectedBudgetVersion) return;

    setShowLoader(true);
    try {
      // Update status to submitted (102)
      await updateBudgetHeaderStatus(
        form.selectedBudgetVersion,
        102, // Submitted status
        callApi,
      );

      toast({
        title: "Success",
        description: "Budget version submitted successfully.",
      });

      // Reload budget versions
      if (researchAreaId) {
        await loadBudgetVersions(researchAreaId);
      }
    } catch (error) {
      console.error("Failed to submit budget:", error);
      toast({
        title: "Error",
        description: "Failed to submit budget version.",
        variant: "destructive",
      });
    } finally {
      setShowLoader(false);
    }
  };

  // Handle budget version selection change
  const handleBudgetVersionChange = async (
    _: React.FormEvent<HTMLDivElement>,
    option?: IDropdownOption,
  ) => {
    if (option && option.key) {
      setShowLoader(true);
      try {
        await loadBudgetByVersion(option.key as string);
      } finally {
        setShowLoader(false);
      }
    }
  };

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      await loadTeamMemberRoles();

      // Load research if editing
      if (researchAreaId) {
        await loadResearchDetails(researchAreaId);
        await loadBudgetVersions(researchAreaId);
      }
    };
    initialize();
  }, [researchAreaId]);

  // Lazy load optional sections after main data loads (with a slight delay to prioritize main content)
  useEffect(() => {
    if (formType !== "new" && researchAreaId && form.title) {
      // Delay lazy loading to prioritize initial render
      const timer = setTimeout(async () => {
        await Promise.all([
          loadOptionalReportData(researchAreaId),
          loadOptionalDisseminationData(researchAreaId),
          loadOptionalDeliverableData(researchAreaId),
        ]);
      }, 500); // Load optional sections 500ms after main content

      return () => clearTimeout(timer);
    }
  }, [researchAreaId, form.title, formType, loadOptionalReportData, loadOptionalDisseminationData, loadOptionalDeliverableData]);

  const canSubmit = useMemo(() => form.title.trim().length > 0, [form.title]);

  const handleAddMember = useCallback(
    async (member: AddMemberForm) => {
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
        try {
          const memberData: Record<string, any> = {
            [ResearchTeamMemberKeys.TEAMMEMBERNAME]: newMember.name,
            [ResearchTeamMemberKeys.ROLE]: newMember.role,
            [ResearchTeamMemberKeys.RESEARCH_ID]: `/${TableName.RESEARCHES}(${researchAreaId})`,
          };
          if (member.customRoleName) {
            memberData[ApplicationTeamMemberFields.CUSTOMROLE] =
              member.customRoleName;
          }
          if (member.educationLevel) {
            memberData[ResearchTeamMemberKeys.EDUCATIONLEVEL] =
              member.educationLevel;
          }
          await callApi({
            url: `/_api/${TableName.RESEARCHTEAMMEMBER}`,
            method: "POST",
            data: memberData,
          });

          // Refetch team members to get the correct IDs from the database
          await loadTeamMembers(researchAreaId);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to add team member.",
          });
        } finally {
          setShowLoader(false);
        }
      } else {
        // For new forms, add to state immediately
        setForm((prev) => ({ ...prev, team: [...prev.team, newMember] }));
      }
    },
    [formType, researchAreaId, callApi, loadTeamMembers],
  );

  const handleRemoveMember = useCallback(async (id: string) => {
    if (formType !== "new") {
      const itemToRemove = form.budgetLineItems.find((li) => li.id === id);
      setShowLoader(true);
      const api = await callApi({
        url: `/_api/${TableName.RESEARCHTEAMMEMBER}(${id})`,
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
          [ResearchTeamMemberKeys.TEAMMEMBERNAME]: member.name,
          [ResearchTeamMemberKeys.ROLE]: member.role,
          [ResearchTeamMemberKeys.RESEARCH_ID]: `/${TableName.RESEARCHES}(${researchAreaId})`,
        };
        if (member.customRoleName) {
          memberData[ApplicationTeamMemberFields.CUSTOMROLE] =
            member.customRoleName;
        }
        if (member.educationLevel) {
          memberData[ResearchTeamMemberKeys.EDUCATIONLEVEL] =
            member.educationLevel;
        }
        try {
          await callApi({
            url: `/_api/${TableName.RESEARCHTEAMMEMBER}(${id})`,
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

  const handleFilesAdd = useCallback(
    (newFiles: { file: File; action: "new" | "existing" | "remove" }[]) => {
      const existing = new Map(form.files.map((f) => [getFileKey(f.file), f]));
      newFiles.forEach((f) =>
        existing.set(getFileKey(f.file), {
          file: f.file,
          action: "new" as const,
        }),
      );
      setForm((prev) => ({ ...prev, files: Array.from(existing.values()) }));
    },
    [form.files],
  );

  const handleFileRemove = useCallback((fileKey: string) => {
    setForm((prev) => ({
      ...prev,
      files: prev.files.map((f) => {
        const key = getFileKey(f.file);
        if (key === fileKey) {
          return { ...f, action: "remove" as const };
        }
        return f;
      }),
    }));
  }, []);

  // Helper function to get today's date in ISO format
  const getTodayDate = (): string => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  };

  // Report handlers
  const handleAddReport = useCallback(
    async (item: {
      prmtk_reporttitle: string;
      prmtk_reportingyear: string;
      prmtk_reportingmonth: string;
      prmtk_budgetspent: string;
      prmtk_researchhealthindicator: string;
      prmtk_achievements: string;
      prmtk_challenges: string;
      prmtk_keyactivities: string;
      prmtk_upcomingactivities: string;
      prmtk_journalpublications: string;
      prmtk_workforcedevelopment: string;
      files?: { file: File; action: "new" | "existing" | "remove" }[];
    }) => {
      const newReport: ReportItem = {
        id: crypto.randomUUID(),
        prmtk_reporttitle: item.prmtk_reporttitle,
        prmtk_reportingyear: item.prmtk_reportingyear,
        prmtk_reportingmonth: item.prmtk_reportingmonth,
        reportingDate: getTodayDate(),
        prmtk_budgetspent: parseFloat(item.prmtk_budgetspent),
        prmtk_researchhealthindicator: item.prmtk_researchhealthindicator
          ? parseInt(item.prmtk_researchhealthindicator)
          : undefined,
        prmtk_achievements: item.prmtk_achievements,
        prmtk_challenges: item.prmtk_challenges,
        prmtk_keyactivities: item.prmtk_keyactivities,
        prmtk_upcomingactivities: item.prmtk_upcomingactivities,
        prmtk_journalpublications: item.prmtk_journalpublications,
        prmtk_workforcedevelopment: item.prmtk_workforcedevelopment,
        files: item.files || [],
        action: "new",
      };

      if (formType !== "new") {
        setShowLoader(true);
        try {
          const reportData: Record<string, any> = {
            [StatusReportFields.REPORTTITLE]: item.prmtk_reporttitle,
            [StatusReportFields.REPORTINGYEAR]: item.prmtk_reportingyear,
            [StatusReportFields.REPORTINGMONTH]: item.prmtk_reportingmonth,
            [StatusReportFields.REPORTINGDATE]: getTodayDate(),
            [StatusReportFields.BUDGETSPENT]: parseFloat(
              item.prmtk_budgetspent,
            ),
            [StatusReportFields.RESEARCH_ID]: `/${TableName.RESEARCHES}(${researchAreaId})`,
          };

          // Add optional fields if they have values
          if (item.prmtk_researchhealthindicator) {
            reportData[StatusReportFields.RESEARCHHEALTHINDICATOR] = parseInt(
              item.prmtk_researchhealthindicator,
            );
          }
          if (item.prmtk_achievements) {
            reportData[StatusReportFields.ACHIEVEMENTS] =
              item.prmtk_achievements;
          }
          if (item.prmtk_challenges) {
            reportData[StatusReportFields.CHALLENGES] = item.prmtk_challenges;
          }
          if (item.prmtk_keyactivities) {
            reportData[StatusReportFields.KEYACTIVITIES] =
              item.prmtk_keyactivities;
          }
          if (item.prmtk_upcomingactivities) {
            reportData[StatusReportFields.UPCOMINGACTIVITIES] =
              item.prmtk_upcomingactivities;
          }
          if (item.prmtk_journalpublications) {
            reportData[StatusReportFields.JOURNALPUBLICATIONS] =
              item.prmtk_journalpublications;
          }
          if (item.prmtk_workforcedevelopment) {
            reportData[StatusReportFields.WORKFORCEDEVELOPMENT] =
              item.prmtk_workforcedevelopment;
          }

          await callApi({
            url: `/_api/${TableName.STATUSREPORT}`,
            method: "POST",
            data: reportData,
          });

          // Upload files if any
          if (item.files && item.files.length > 0 && form.researchNumber) {
            try {
              await processReportFileUploads(
                item.files,
                form.researchNumber,
                item.prmtk_reportingyear,
                item.prmtk_reportingmonth,
                triggerFlow,
                user,
              );
            } catch (fileError) {
              console.error("File upload error:", fileError);
              toast({
                title: "Warning",
                description: "Report added but some files failed to upload.",
                variant: "destructive",
              });
            }
          }

          toast({
            title: "Success",
            description: "Report added successfully.",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to add report.",
          });
        } finally {
          setShowLoader(false);
        }
      }

      setForm((prev) => ({
        ...prev,
        reportItems: [...prev.reportItems, newReport],
      }));
    },
    [formType, researchAreaId, callApi],
  );

  const handleRemoveReport = useCallback(
    async (id: string) => {
      if (formType !== "new") {
        const itemToRemove = form.reportItems.find((ri) => ri.id === id);
        if (itemToRemove && itemToRemove.action === "existing") {
          setShowLoader(true);
          try {
            await callApi({
              url: `/_api/${TableName.STATUSREPORT}(${id})`,
              method: "DELETE",
            });
            toast({
              title: "Success",
              description: "Report removed successfully.",
            });
          } catch (error) {
            toast({
              title: "Error",
              description: "Failed to remove report.",
            });
          } finally {
            setShowLoader(false);
          }
        }
      }

      setForm((prev) => ({
        ...prev,
        reportItems: prev.reportItems.filter((ri) => ri.id !== id),
      }));
    },
    [formType, form.reportItems, callApi],
  );

  const handleEditReport = useCallback(
    async (
      id: string,
      item: {
        prmtk_reporttitle: string;
        prmtk_reportingyear: string;
        prmtk_reportingmonth: string;
        prmtk_budgetspent: string;
        prmtk_researchhealthindicator: string;
        prmtk_achievements: string;
        prmtk_challenges: string;
        prmtk_keyactivities: string;
        prmtk_upcomingactivities: string;
        prmtk_journalpublications: string;
        prmtk_workforcedevelopment: string;
        files?: { file: File; action: "new" | "existing" | "remove" }[];
      },
    ) => {
      if (formType !== "new") {
        setShowLoader(true);
        try {
          // Handle file deletions first
          if (
            item.files &&
            form.researchNumber &&
            item.prmtk_reportingyear &&
            item.prmtk_reportingmonth
          ) {
            const filesToDelete = item.files.filter(
              (f) => f.action === "remove",
            );
            for (const fileToDelete of filesToDelete) {
              try {
                const paddedMonth = item.prmtk_reportingmonth
                  .toString()
                  .padStart(2, "0");
                await triggerFlow(APIURL.FileDeleteEndpoint, {
                  FileName: fileToDelete.file.name,
                  Library: "Researches",
                  Folder: `${form.researchNumber}/Status Reports/${item.prmtk_reportingyear}-${paddedMonth}`,
                });
              } catch (error) {
                console.error(
                  `Failed to delete file ${fileToDelete.file.name}:`,
                  error,
                );
              }
            }
          }

          const reportData: Record<string, any> = {
            [StatusReportFields.REPORTTITLE]: item.prmtk_reporttitle,
            [StatusReportFields.REPORTINGYEAR]: item.prmtk_reportingyear,
            [StatusReportFields.REPORTINGMONTH]: item.prmtk_reportingmonth,
            [StatusReportFields.BUDGETSPENT]: parseFloat(
              item.prmtk_budgetspent,
            ),
          };

          // Add optional fields if they have values
          if (item.prmtk_researchhealthindicator) {
            reportData[StatusReportFields.RESEARCHHEALTHINDICATOR] = parseInt(
              item.prmtk_researchhealthindicator,
            );
          }
          if (item.prmtk_achievements) {
            reportData[StatusReportFields.ACHIEVEMENTS] =
              item.prmtk_achievements;
          }
          if (item.prmtk_challenges) {
            reportData[StatusReportFields.CHALLENGES] = item.prmtk_challenges;
          }
          if (item.prmtk_keyactivities) {
            reportData[StatusReportFields.KEYACTIVITIES] =
              item.prmtk_keyactivities;
          }
          if (item.prmtk_upcomingactivities) {
            reportData[StatusReportFields.UPCOMINGACTIVITIES] =
              item.prmtk_upcomingactivities;
          }
          if (item.prmtk_journalpublications) {
            reportData[StatusReportFields.JOURNALPUBLICATIONS] =
              item.prmtk_journalpublications;
          }
          if (item.prmtk_workforcedevelopment) {
            reportData[StatusReportFields.WORKFORCEDEVELOPMENT] =
              item.prmtk_workforcedevelopment;
          }

          await callApi({
            url: `/_api/${TableName.STATUSREPORT}(${id})`,
            method: "PATCH",
            data: reportData,
          });

          // Upload files if any
          if (item.files && item.files.length > 0 && form.researchNumber) {
            try {
              await processReportFileUploads(
                item.files,
                form.researchNumber,
                item.prmtk_reportingyear,
                item.prmtk_reportingmonth,
                triggerFlow,
                user,
              );
            } catch (fileError) {
              console.error("File upload error:", fileError);
              toast({
                title: "Warning",
                description: "Report updated but some files failed to upload.",
                variant: "destructive",
              });
            }
          }

          toast({
            title: "Success",
            description: "Report updated successfully.",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to update report.",
          });
        } finally {
          setShowLoader(false);
        }
      }

      setForm((prev) => ({
        ...prev,
        reportItems: prev.reportItems.map((ri) =>
          ri.id === id
            ? {
                ...ri,
                prmtk_reporttitle: item.prmtk_reporttitle,
                prmtk_reportingyear: item.prmtk_reportingyear,
                prmtk_reportingmonth: item.prmtk_reportingmonth,
                prmtk_budgetspent: parseFloat(item.prmtk_budgetspent),
                prmtk_researchhealthindicator:
                  item.prmtk_researchhealthindicator
                    ? parseInt(item.prmtk_researchhealthindicator)
                    : undefined,
                prmtk_achievements: item.prmtk_achievements,
                prmtk_challenges: item.prmtk_challenges,
                prmtk_keyactivities: item.prmtk_keyactivities,
                prmtk_upcomingactivities: item.prmtk_upcomingactivities,
                prmtk_journalpublications: item.prmtk_journalpublications,
                prmtk_workforcedevelopment: item.prmtk_workforcedevelopment,
                files: item.files || [],
                action: "existing" as const,
              }
            : ri,
        ),
      }));
    },
    [formType, callApi],
  );

  // Dissemination Request handlers
  const handleAddDisseminationRequest = useCallback(
    async (item: {
      title: string;
      journalName: string;
      abstract: string;
      budgetNeeded: string;
      files?: { file: File; action: "new" | "existing" | "remove" }[];
    }) => {
      const newRequest: DisseminationRequest = {
        id: crypto.randomUUID(),
        title: item.title,
        journalName: item.journalName,
        abstract: item.abstract,
        budgetNeeded: parseFloat(item.budgetNeeded),
        submissionDate: getTodayDate(),
        requestStatus: 1, // Pending
        files: item.files || [],
        action: "new",
      };

      if (formType !== "new") {
        setShowLoader(true);
        try {
          const requestData: Record<string, any> = {
            [DisseminationRequestFields.TITLE]: item.title,
            [DisseminationRequestFields.JOURNALNAME]: item.journalName,
            [DisseminationRequestFields.ABSTRACT]: item.abstract,
            [DisseminationRequestFields.BUDGETNEEDED]: parseFloat(
              parseFloat(item.budgetNeeded).toFixed(2),
            ),
            [DisseminationRequestFields.SUBMISSIONDATE]: getTodayDate(),
            // [DisseminationRequestFields.RESEARCH]: researchAreaId, // Pending
            // [DisseminationRequestFields.APPLICATIONID]: `/${TableName.APPLICATIONS}(${applicationId})`,

            [DisseminationRequestFields.RESEARCH_ID]: `/${TableName.RESEARCHES}(${researchAreaId})`,
          };

          await callApi({
            url: `/_api/${TableName.DISSEMINATIONAPPLICANTS}`,
            method: "POST",
            data: requestData,
          });

          // Upload files if any
          if (item.files && item.files.length > 0 && form.researchNumber) {
            try {
              await processDisseminationFileUploads(
                item.files,
                form.researchNumber,
                getTodayDate(),
                item.budgetNeeded,
                triggerFlow,
                user,
              );
            } catch (fileError) {
              console.error("File upload error:", fileError);
              toast({
                title: "Warning",
                description: "Request added but some files failed to upload.",
                variant: "destructive",
              });
            }
          }

          // Refetch dissemination requests to get the correct IDs from the database
          await loadDisseminationRequests(researchAreaId);

          toast({
            title: "Success",
            description: "Dissemination request added successfully.",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to add dissemination request.",
          });
        } finally {
          setShowLoader(false);
        }
      } else {
        // For new forms, add to state immediately
        setForm((prev) => ({
          ...prev,
          disseminationRequests: [...prev.disseminationRequests, newRequest],
        }));
      }
    },
    [formType, researchAreaId, callApi, loadDisseminationRequests],
  );

  const handleRemoveDisseminationRequest = useCallback(
    async (id: string) => {
      if (formType !== "new") {
        const itemToRemove = form.disseminationRequests.find(
          (dr) => dr.id === id,
        );
        if (itemToRemove && itemToRemove.action === "existing") {
          setShowLoader(true);
          try {
            await callApi({
              url: `/_api/${TableName.DISSEMINATIONAPPLICANTS}(${id})`,
              method: "DELETE",
            });
            toast({
              title: "Success",
              description: "Dissemination request removed successfully.",
            });
          } catch (error) {
            toast({
              title: "Error",
              description: "Failed to remove dissemination request.",
            });
          } finally {
            setShowLoader(false);
          }
        }
      }

      setForm((prev) => ({
        ...prev,
        disseminationRequests: prev.disseminationRequests.filter(
          (dr) => dr.id !== id,
        ),
      }));
    },
    [formType, form.disseminationRequests, callApi],
  );

  const handleEditDisseminationRequest = useCallback(
    async (
      id: string,
      item: {
        title: string;
        journalName: string;
        abstract: string;
        budgetNeeded: string;
        files?: { file: File; action: "new" | "existing" | "remove" }[];
      },
      research?: string,
    ) => {
      if (formType !== "new") {
        setShowLoader(true);
        try {
          // Handle file deletions first
          if (item.files && form.researchNumber) {
            const filesToDelete = item.files.filter(
              (f) => f.action === "remove",
            );
            // Find the existing dissemination request to get its submission date
            const existingRequest = form.disseminationRequests.find(
              (dr) => dr.id === id,
            );
            if (existingRequest && filesToDelete.length > 0) {
              for (const fileToDelete of filesToDelete) {
                try {
                  const sanitizedDate = existingRequest.submissionDate.replace(
                    /[<>:"/\\|?*]/g,
                    "-",
                  );
                  const sanitizedBudget = existingRequest.budgetNeeded
                    .toString()
                    .replace(/[<>:"/\\|?*]/g, "-");
                  await triggerFlow(APIURL.FileDeleteEndpoint, {
                    FileName: fileToDelete.file.name,
                    Library: "Researches",
                    Folder: `${form.researchNumber}/Dissemination Requests/${sanitizedDate}-${sanitizedBudget}`,
                  });
                } catch (error) {
                  console.error(
                    `Failed to delete file ${fileToDelete.file.name}:`,
                    error,
                  );
                }
              }
            }
          }
          const requestData: Record<string, any> = {
            [DisseminationRequestFields.TITLE]: item.title,
            [DisseminationRequestFields.JOURNALNAME]: item.journalName,
            [DisseminationRequestFields.ABSTRACT]: item.abstract,
            [DisseminationRequestFields.BUDGETNEEDED]: parseFloat(
              item.budgetNeeded,
            ),
          };

          if (research) {
            requestData[DisseminationRequestFields.RESEARCH_ID] =
              `/${TableName.RESEARCHES}(${research})`;
          }

          await callApi({
            url: `/_api/${TableName.DISSEMINATIONAPPLICANTS}(${id})`,
            method: "PATCH",
            data: requestData,
          });

          // Upload new files if any
          if (item.files && item.files.length > 0 && form.researchNumber) {
            const existingRequest = form.disseminationRequests.find(
              (dr) => dr.id === id,
            );
            if (existingRequest) {
              try {
                await processDisseminationFileUploads(
                  item.files,
                  form.researchNumber,
                  existingRequest.submissionDate,
                  item.budgetNeeded,
                  triggerFlow,
                  user,
                );
              } catch (fileError) {
                console.error("File upload error:", fileError);
                toast({
                  title: "Warning",
                  description:
                    "Request updated but some files failed to upload.",
                  variant: "destructive",
                });
              }
            }
          }

          toast({
            title: "Success",
            description: "Dissemination request updated successfully.",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to update dissemination request.",
          });
        } finally {
          setShowLoader(false);
        }
      }

      setForm((prev) => ({
        ...prev,
        disseminationRequests: prev.disseminationRequests.map((dr) =>
          dr.id === id
            ? {
                ...dr,
                title: item.title,
                journalName: item.journalName,
                abstract: item.abstract,
                budgetNeeded: parseFloat(item.budgetNeeded),
                files: item.files || [],
                action: "existing" as const,
              }
            : dr,
        ),
      }));
    },
    [formType, callApi],
  );

  // Deliverables handlers
  const handleAddDeliverable = useCallback(
    async (item: {
      deliverableName: string;
      description: string;
      deliverableType: string;
      files?: { file: File; action: "new" | "existing" | "remove" }[];
    }) => {
      // if (!item.file) {
      //   toast({
      //     title: "Error",
      //     description: "Please select a file to upload.",
      //   });
      //   return;
      // }

      setShowLoader(true);
      try {
        // Upload file first
        // const base64Content = await fileToBase64(item.file);
        // const researchNumber =
        //   form.researchNumber ||
        //   state?.item?.[ResearchKeys.RESEARCHNUMBER] ||
        //   "";

        // const filePayload: any = {
        //   FileContent: base64Content,
        //   FileName: item.file.name,
        //   ApplicaionNumber: researchNumber,
        //   FileType: "Deliverable",
        // };

        // const fileResponse = await triggerFlow(
        //   APIURL.FileUploadEndpoint,
        //   filePayload,
        // );

        // if (!fileResponse.success) {
        //   throw new Error("Failed to upload file");
        // }

        // const fileUrl =
        //   (fileResponse.data as any)?.fileUrl ||
        //   (fileResponse.data as any)?.url ||
        //   "";

        const newDeliverable: Deliverable = {
          id: crypto.randomUUID(),
          deliverableName: item.deliverableName,
          description: item.description,
          deliverableType: parseInt(item.deliverableType),
          submissionDate: getTodayDate(),
          files: item.files || [],
          action: "new",
        };

        if (formType !== "new") {
          const deliverableData: Record<string, any> = {
            [DeliverableFields.DELIVERABLENAME]: item.deliverableName,
            [DeliverableFields.DESCRIPTION]: item.description,
            [DeliverableFields.DELIVERABLETYPE]: parseInt(item.deliverableType),
            [DeliverableFields.SUBMISSIONDATE]: getTodayDate(),
            // [DeliverableFields.FILEURL]: fileUrl,
            [DeliverableFields.RESEARCH_ID]: `/${TableName.RESEARCHES}(${researchAreaId})`,
          };

          await callApi({
            url: `/_api/${TableName.DELIVERABLES}`,
            method: "POST",
            data: deliverableData,
          });

          // Upload files if any
          if (item.files && item.files.length > 0 && form.researchNumber) {
            try {
              const deliverableTypeName = getDeliverableTypeText(
                parseInt(item.deliverableType),
              );
              await processDeliverableFileUploads(
                item.files,
                form.researchNumber,
                item.deliverableName,
                deliverableTypeName,
                triggerFlow,
                user,
              );
            } catch (fileError) {
              console.error("File upload error:", fileError);
              toast({
                title: "Warning",
                description:
                  "Deliverable added but some files failed to upload.",
                variant: "destructive",
              });
            }
          }

          // Refetch deliverables to get the correct IDs from the database
          await loadDeliverables(researchAreaId);

          toast({
            title: "Success",
            description: "Deliverable added successfully.",
          });
        } else {
          // For new forms, add to state immediately
          setForm((prev) => ({
            ...prev,
            deliverables: [...prev.deliverables, newDeliverable],
          }));
        }
      } catch (error) {
        console.error("Error adding deliverable:", error);
        toast({
          title: "Error",
          description: "Failed to add deliverable.",
        });
        throw error;
      } finally {
        setShowLoader(false);
      }
    },
    [
      formType,
      researchAreaId,
      callApi,
      loadDeliverables,
      triggerFlow,
      form.researchNumber,
      state?.item,
    ],
  );

  const handleRemoveDeliverable = useCallback(
    async (id: string) => {
      if (formType !== "new") {
        const itemToRemove = form.deliverables.find((d) => d.id === id);
        if (itemToRemove && itemToRemove.action === "existing") {
          setShowLoader(true);
          try {
            await callApi({
              url: `/_api/${TableName.DELIVERABLES}(${id})`,
              method: "DELETE",
            });
            toast({
              title: "Success",
              description: "Deliverable removed successfully.",
            });
          } catch (error) {
            toast({
              title: "Error",
              description: "Failed to remove deliverable.",
            });
          } finally {
            setShowLoader(false);
          }
        }
      }

      setForm((prev) => ({
        ...prev,
        deliverables: prev.deliverables.filter((d) => d.id !== id),
      }));
    },
    [formType, form.deliverables, callApi],
  );

  // Handler for immediate file deletion
  const handleDeleteFile = useCallback(
    async (fileName: string, folder: string): Promise<void> => {
      try {
        await triggerFlow(APIURL.FileDeleteEndpoint, {
          FileName: fileName,
          Library: "Researches",
          Folder: folder,
        });
      } catch (error) {
        console.error(`Failed to delete file ${fileName}:`, error);
        throw error;
      }
    },
    [triggerFlow],
  );

  // Handler for immediate file upload
  const handleUploadFile = useCallback(
    async (files: File[], folder: string): Promise<void> => {
      try {
        const uploadPromises = files.map(async (file) => {
          const base64Content = await fileToBase64(file);
          const payload: any = {
            FileContent: base64Content,
            FileName: file.name,
            Library: "Researches",
            Folder: folder,
            FileType: "other",
            UserEmail: user?.contact?.[ContactFields.EMAILADDRESS1] || "",
          };

          const response = await triggerFlow(
            APIURL.FileUploadEndpoint,
            payload,
          );

          if (!response.success) {
            throw new Error(`Failed to upload ${file.name}`);
          }
        });

        await Promise.all(uploadPromises);
      } catch (error) {
        console.error(`Failed to upload files:`, error);
        throw error;
      }
    },
    [triggerFlow, user],
  );

  // Handler to update files in form state after immediate operations
  const handleUpdateReportFiles = useCallback(
    (
      itemId: string,
      files: { file: File; action: "new" | "existing" | "remove" }[],
    ) => {
      setForm((prev) => ({
        ...prev,
        reportItems: prev.reportItems.map((item) =>
          item.id === itemId ? { ...item, files } : item,
        ),
      }));
    },
    [],
  );

  const handleUpdateDisseminationFiles = useCallback(
    (
      itemId: string,
      files: { file: File; action: "new" | "existing" | "remove" }[],
    ) => {
      setForm((prev) => ({
        ...prev,
        disseminationRequests: prev.disseminationRequests.map((item) =>
          item.id === itemId ? { ...item, files } : item,
        ),
      }));
    },
    [],
  );

  const handleUpdateDeliverableFiles = useCallback(
    (
      itemId: string,
      files: { file: File; action: "new" | "existing" | "remove" }[],
    ) => {
      setForm((prev) => ({
        ...prev,
        deliverables: prev.deliverables.map((item) =>
          item.id === itemId ? { ...item, files } : item,
        ),
      }));
    },
    [],
  );

  const handleEditDeliverable = useCallback(
    async (
      id: string,
      item: {
        deliverableName: string;
        description: string;
        deliverableType: string;
        files?: { file: File; action: "new" | "existing" | "remove" }[];
      },
    ) => {
      setShowLoader(true);
      try {
        // Handle file deletions first
        if (
          item.files &&
          form.researchNumber &&
          item.deliverableName &&
          item.deliverableType !== undefined
        ) {
          const filesToDelete = item.files.filter((f) => f.action === "remove");
          for (const fileToDelete of filesToDelete) {
            try {
              const sanitizedDeliverableName = item.deliverableName.replace(
                /[<>:"/\\|?*]/g,
                "-",
              );
              const deliverableTypeName = getDeliverableTypeText(
                parseInt(item.deliverableType),
              );
              const sanitizedDeliverableType = deliverableTypeName.replace(
                /[<>:"/\\|?*]/g,
                "-",
              );
              await triggerFlow(APIURL.FileDeleteEndpoint, {
                FileName: fileToDelete.file.name,
                Library: "Researches",
                Folder: `${form.researchNumber}/Deliverables/${sanitizedDeliverableName}-${sanitizedDeliverableType}`,
              });
            } catch (error) {
              console.error(
                `Failed to delete file ${fileToDelete.file.name}:`,
                error,
              );
            }
          }
        }

        if (formType !== "new") {
          const deliverableData: Record<string, any> = {
            [DeliverableFields.DELIVERABLENAME]: item.deliverableName,
            [DeliverableFields.DESCRIPTION]: item.description,
            [DeliverableFields.DELIVERABLETYPE]: parseInt(item.deliverableType),
          };

          await callApi({
            url: `/_api/${TableName.DELIVERABLES}(${id})`,
            method: "PATCH",
            data: deliverableData,
          });

          toast({
            title: "Success",
            description: "Deliverable updated successfully.",
          });
        }

        setForm((prev) => ({
          ...prev,
          deliverables: prev.deliverables.map((d) =>
            d.id === id
              ? {
                  ...d,
                  deliverableName: item.deliverableName,
                  description: item.description,
                  deliverableType: parseInt(item.deliverableType),
                  files: item.files || [],
                  action: "existing" as const,
                }
              : d,
          ),
        }));
      } catch (error) {
        console.error("Error editing deliverable:", error);
        toast({
          title: "Error",
          description: "Failed to update deliverable.",
        });
        throw error;
      } finally {
        setShowLoader(false);
      }
    },
    [
      formType,
      callApi,
      triggerFlow,
      form.deliverables,
      form.researchNumber,
      state?.item,
    ],
  );

  const submit = async () => {
    if (!canSubmit) {
      toast({
        title: "Missing information",
        description: "Please fill in the Research Title before submitting.",
      });
      return;
    }

    setShowLoader(true);
    try {
      // console.log("Submitting research:", form, "state:", state);

      // Create or update research
      const researchData = {
        [ResearchKeys.RESEARCHTITLE]: form.title,
        [ResearchKeys.STARTDATE]: form.startDate?.toISOString() ?? null,
        [ResearchKeys.ENDDATE]: form.endDate?.toISOString() ?? null,
        [ResearchKeys.PRINCIPALINVESTIGATOR_ID]: form.principalInvestigator
          ? `/${TableName.CONTACTS}(${form.principalInvestigator})`
          : null,

        [ResearchKeys.RESEARCHAREA_ID]: form.researchArea
          ? `/${TableName.RESEARCHAREAS}(${form.researchArea})`
          : null,
      };
      if (form.application) {
        researchData[ResearchKeys.APPLICATIONREFERENCE_ID] =
          `/${TableName.APPLICATIONS}(${form.application})`;
      }

      const res = await callApi<{
        value: any;
        status?: number;
        headers?: Headers;
      }>({
        url: `/_api/${TableName.RESEARCHES}${form.type === "edit" ? `(${state?.researchId})` : ""}`,
        method: form.type === "edit" ? "PATCH" : "POST",
        data: researchData,
      });

      if (!res || (res.status && res.status >= 400)) {
        throw new Error(
          res?.value?.error?.message || "Failed to save research",
        );
      }

      const researchId =
        form.type === "edit"
          ? state?.researchId
          : res?.headers?.get("OData-EntityId")?.match(/\(([^)]+)\)/)?.[1];

      if (!researchId) {
        throw new Error("Unable to retrieve research ID.");
      }

      // console.log("Research saved with ID:", researchId);

      // Get research number for file uploads
      const researchNumber = await getResearchNumber(
        form.type,
        researchId,
        state?.item?.[ResearchKeys.RESEARCHNUMBER],
        callApi,
      );

      // Process all related data in parallel
      await Promise.all([
        processTeamMembers(form.team, researchId, callApi),
        processBudgetData(
          form.budgetHeaders,
          form.budgetLineItems,
          researchAreaId,
          callApi,
        ),
        processFileUploads(form.files, researchNumber, triggerFlow, user),
      ]);
      toast({
        title: "Success",
        description:
          form.type === "edit"
            ? "Research updated successfully."
            : "Research submitted successfully.",
      });
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during submission. Please try again.",
      });
    } finally {
      setShowLoader(false);
    }
  };
  return (
    <section className="bg-white">
      <div className="container py-16">
        <Reveal>
          <div>
            <div className="text-xs tracking-[0.25em] text-[#8c5a3d] uppercase">
              Research
            </div>
            <h1 className="mt-1 text-3xl md:text-4xl font-bold tracking-tight text-[#2b201a]">
              {form.type === "new"
                ? "New Application"
                : `Research : ${state?.item?.[ResearchKeys.RESEARCHNUMBER] || ""}`}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Complete the sections below and submit your proposal.
            </p>
          </div>
        </Reveal>

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
              key={`${applicationId}-${researchAreaId}-${user?.adxUserId}`}
              form={form}
              onTitleChange={(value) =>
                setForm((prev) => ({ ...prev, title: value }))
              }
              onApplicationChange={(applicationId) =>
                setForm((prev) => ({ ...prev, application: applicationId }))
              }
              onResearchAreaChange={(areaId) =>
                setForm((prev) => ({ ...prev, researchArea: areaId }))
              }
              onPrincipalInvestigatorChange={(contactId) =>
                setForm((prev) => ({
                  ...prev,
                  principalInvestigator: contactId,
                }))
              }
              onStartDateChange={(date) =>
                setForm((prev) => ({ ...prev, startDate: date }))
              }
              onEndDateChange={(date) =>
                setForm((prev) => ({ ...prev, endDate: date }))
              }
              applicationIdFromState={applicationId}
              researchAreaIdFromState={researchAreaId}
              userAdxUserId={user?.adxUserId}
            />
          )}
        </div>

        {/* Budget Details Section */}
        <div className="mt-8 rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className={HEADING_TEXT}>Budget Management</h2>
              {form.budgetHeaders && form.budgetVersions.length > 0 && (
                <Badge
                  variant={
                    form.budgetVersions.find(
                      (v) => v.id === form.selectedBudgetVersion,
                    )?.status === 101
                      ? "secondary"
                      : form.budgetVersions.find(
                            (v) => v.id === form.selectedBudgetVersion,
                          )?.status === 102
                        ? "outline"
                        : form.budgetVersions.find(
                              (v) => v.id === form.selectedBudgetVersion,
                            )?.status === 103
                          ? "default"
                          : "destructive"
                  }
                  className={
                    form.budgetVersions.find(
                      (v) => v.id === form.selectedBudgetVersion,
                    )?.status === 101
                      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                      : form.budgetVersions.find(
                            (v) => v.id === form.selectedBudgetVersion,
                          )?.status === 102
                        ? "bg-blue-100 text-blue-800 border-blue-300"
                        : form.budgetVersions.find(
                              (v) => v.id === form.selectedBudgetVersion,
                            )?.status === 103
                          ? "bg-green-100 text-green-800 border-green-300"
                          : "bg-gray-100 text-gray-800 border-gray-300"
                  }
                >
                  {form.budgetVersions.find(
                    (v) => v.id === form.selectedBudgetVersion,
                  )?.status === 101
                    ? "Draft"
                    : form.budgetVersions.find(
                          (v) => v.id === form.selectedBudgetVersion,
                        )?.status === 102
                      ? "Submitted"
                      : form.budgetVersions.find(
                            (v) => v.id === form.selectedBudgetVersion,
                          )?.status === 103
                        ? "Approved"
                        : "Unknown"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              {form.budgetVersions.length > 0 && (
                <Dropdown
                  label=""
                  options={form.budgetVersions.map((v) => ({
                    key: v.id,
                    text: `Version ${v.version} - ${
                      v.status === 101
                        ? "Draft"
                        : v.status === 102
                          ? "Submitted"
                          : v.status === 103
                            ? "Approved"
                            : "Unknown"
                    }${v.isActive ? " (Active)" : ""}`,
                  }))}
                  selectedKey={form.selectedBudgetVersion}
                  onChange={handleBudgetVersionChange}
                  styles={{ root: { minWidth: 250 } }}
                />
              )}
              <PrimaryButton
                text="Update Budget"
                onClick={handleUpdateBudgetClick}
                iconProps={{ iconName: "Copy" }}
                disabled={
                  !form.budgetHeaders ||
                  !form.budgetVersions.find(
                    (v) => v.id === form.selectedBudgetVersion,
                  )?.isActive ||
                  form.budgetVersions.some(
                    (v) =>
                      v.version >
                      (form.budgetVersions.find(
                        (ver) => ver.id === form.selectedBudgetVersion,
                      )?.version || 0),
                  )
                }
              />
              <DefaultButton
                text="Submit Budget"
                onClick={handleEditBudgetClick}
                iconProps={{ iconName: "Send" }}
                disabled={
                  !form.budgetHeaders ||
                  form.budgetVersions.find(
                    (v) => v.id === form.selectedBudgetVersion,
                  )?.status !== 101
                }
              />
            </div>
          </div>
          <BudgetSection
            key={`${form.budgetLineItems}`}
            budgetHeader={form.budgetHeaders}
            budgetLineItem={form.budgetLineItems}
            budgetCategories={BudgetCategorys}
            edit={
              form.budgetVersions.find(
                (v) => v.id === form.selectedBudgetVersion,
              )?.status === 101
            }
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
            onEditBudgetLineItem={async (id, item) => {
              if (formType !== "new") {
                setShowLoader(true);
                try {
                  const lineItemData: Record<string, any> = {
                    [BudgetLineItemFields.LINEITEMNAME]: item.name,
                    [BudgetLineItemFields.CATEGORY]: item.category,
                    [BudgetLineItemFields.DESCRIPTION]: item.description,
                    [BudgetLineItemFields.AMOUNT]: parseFloat(item.amount),
                  };

                  await callApi({
                    url: `/_api/${TableName.BUDGETLINEITEMS}(${id})`,
                    method: "PATCH",
                    data: lineItemData,
                  });

                  toast({
                    title: "Success",
                    description: "Budget line item updated successfully.",
                  });
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to update budget line item.",
                  });
                } finally {
                  setShowLoader(false);
                }
              }

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
                await callApi({
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
        </div>

        {/* Report Section */}
        <ReportingSection
          reportItems={form.reportItems}
          edit={true}
          onAddReportItem={handleAddReport}
          onEditReportItem={handleEditReport}
          onRemoveReportItem={handleRemoveReport}
          onDeleteFile={handleDeleteFile}
          onUploadFile={handleUploadFile}
          onUpdateItemFiles={handleUpdateReportFiles}
          form={form}
        />

        {/* Dissemination Request Section */}
        <DisseminationRequestSection
          disseminationRequests={form.disseminationRequests}
          edit={true}
          onAddRequest={handleAddDisseminationRequest}
          onEditRequest={handleEditDisseminationRequest}
          onRemoveRequest={handleRemoveDisseminationRequest}
          onDeleteFile={handleDeleteFile}
          onUploadFile={handleUploadFile}
          onUpdateItemFiles={handleUpdateDisseminationFiles}
          form={form}
        />

        {/* Deliverables Section */}
        <DeliverablesSection
          deliverables={form.deliverables}
          edit={true}
          onAddDeliverable={handleAddDeliverable}
          onEditDeliverable={handleEditDeliverable}
          onRemoveDeliverable={handleRemoveDeliverable}
          onDeleteFile={handleDeleteFile}
          onUploadFile={handleUploadFile}
          onUpdateItemFiles={handleUpdateDeliverableFiles}
          form={form}
        />

        {/* Team Members Section */}
        <div className="mt-6 rounded-sm border bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className={HEADING_TEXT}>Team members</h2>
            <IconButton
              iconProps={{
                iconName: showTeam ? "ChevronUp" : "ChevronDown",
              }}
              onClick={() => setShowTeam((prev) => !prev)}
              ariaLabel="Toggle team members"
              disabled={form.type === "view"}
            />
          </div>
          {showTeam && (
            <TeamMemberSection
              team={form.team}
              teamMemberRoles={teamMemberRoles}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              onEditMember={handleEditMember}
              form={form}
            />
          )}
        </div>

        {/* File Upload Section */}

        <FileUploadSectionResearch
          onFilesAdd={handleFilesAdd}
          onFileRemove={handleFileRemove}
          form={form}
          files={form.files}
        />

        <Reveal className="mt-8">
          <div className="flex items-center justify-end gap-3">
            <PrimaryButton onClick={submit} disabled={!canSubmit}>
              {form.type === "edit" ? "Update Research" : "Submit Research"}
            </PrimaryButton>
          </div>
        </Reveal>
      </div>
      <SuccessDialog
        hidden={!showSuccessDialog}
        message={dialogMessage}
        onDismiss={() => {
          navigate("/researches", { state: {} });
        }}
      />
      <ErrorDialog
        hidden={!showErrorDialog}
        message={dialogMessage}
        onDismiss={() => {
          setShowErrorDialog(false);
        }}
      />
      <ConfirmDialog
        hidden={!showCloneBudgetConfirm}
        title="Clone Budget"
        message="Are you sure you want to create a new budget version? This will clone the current budget header and all line items with Draft status."
        onConfirm={handleUpdateBudgetConfirm}
        onCancel={() => setShowCloneBudgetConfirm(false)}
      />
      <ConfirmDialog
        hidden={!showSubmitBudgetConfirm}
        title="Submit Budget"
        message="Are you sure you want to submit this budget version? Once submitted, it cannot be edited until reviewed."
        onConfirm={handleEditBudgetConfirm}
        onCancel={() => setShowSubmitBudgetConfirm(false)}
      />
      <OverlayLoader
        isVisible={showLoader}
        label="Your request is being processed..."
      />
    </section>
  );
}
