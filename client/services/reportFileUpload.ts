import { fileToBase64 } from "./utility";
import { APIURL } from "@/constants/url";
import { ContactFields } from "@/constants/entities";

/**
 * Process file uploads for status reports
 * Uploads files to SharePoint under Researches/{researchNumber}/Status Reports/{year-month}
 */
export const processReportFileUploads = async (
  reportFiles: { file: File; action: "new" | "existing" | "remove" }[],
  researchNumber: string,
  reportYear: string,
  reportMonth: string,
  triggerFlow: (url: string, payload: any) => Promise<any>,
  user: any,
): Promise<void> => {
  // Pad month with leading zero if needed (e.g., 1 -> 01)
  const paddedMonth = reportMonth.padStart(2, '0');
  
  // Create folder path: researchNumber/Status Reports/Year-Month
  const folderPath = `${researchNumber}/Status Reports/${reportYear}-${paddedMonth}`;

  // Process report files
  const uploadPromises = reportFiles
    .filter((file) => file.action === "new")
    .map(async (file) => {
      const base64Content = await fileToBase64(file.file);
      const payload: any = {
        FileContent: base64Content,
        FileName: file.file.name,
        Library: "Researches",
        Folder: folderPath,
        FileType: "Status Report",
        UserEmail: user?.contact?.[ContactFields.EMAILADDRESS1] || "",
      };

      const response = await triggerFlow(APIURL.FileUploadEndpoint, payload);

      if (response.success) {
        // 
      } else {
        
        throw new Error(`Failed to upload ${file.file.name}`);
      }
    });

  await Promise.all(uploadPromises);
};

/**
 * Process file uploads for dissemination requests
 * Uploads files to SharePoint under Researches/{researchNumber}/Dissemination Requests/{submissionDate}-{budgetNeeded}
 */
export const processDisseminationFileUploads = async (
  files: { file: File; action: "new" | "existing" | "remove" }[],
  researchNumber: string,
  submissionDate: string,
  budgetNeeded: string,
  triggerFlow: (url: string, payload: any) => Promise<any>,
  user: any,
): Promise<void> => {
  // Sanitize values for folder path (remove invalid characters)
  const sanitizedDate = submissionDate.replace(/[<>:"/\\|?*]/g, '-');
  const sanitizedBudget = budgetNeeded.replace(/[<>:"/\\|?*]/g, '-');
  
  // Create folder path: researchNumber/Dissemination Requests/Date-Budget
  const folderPath = `${researchNumber}/Dissemination Requests/${sanitizedDate}-${sanitizedBudget}`;

  // Process files
  const uploadPromises = files
    .filter((file) => file.action === "new")
    .map(async (file) => {
      const base64Content = await fileToBase64(file.file);
      const payload: any = {
        FileContent: base64Content,
        FileName: file.file.name,
        Library: "Researches",
        Folder: folderPath,
        FileType: "Dissemination Request",
        UserEmail: user?.contact?.[ContactFields.EMAILADDRESS1] || "",
      };

      const response = await triggerFlow(APIURL.FileUploadEndpoint, payload);

      if (response.success) {
        // 
      } else {
        
        throw new Error(`Failed to upload ${file.file.name}`);
      }
    });

  await Promise.all(uploadPromises);
};

/**
 * Process file uploads for deliverables
 * Uploads files to SharePoint under Researches/{researchNumber}/Deliverables/{deliverableName-deliverableType}
 */
export const processDeliverableFileUploads = async (
  files: { file: File; action: "new" | "existing" | "remove" }[],
  researchNumber: string,
  deliverableName: string,
  deliverableType: string,
  triggerFlow: (url: string, payload: any) => Promise<any>,
  user: any,
): Promise<void> => {
  // Sanitize names for folder path (remove invalid characters)
  const sanitizedDeliverableName = deliverableName.replace(/[<>:"/\\|?*]/g, '-');
  const sanitizedDeliverableType = deliverableType.replace(/[<>:"/\\|?*]/g, '-');
  
  // Create folder path: researchNumber/Deliverables/DeliverableName-DeliverableType
  const folderPath = `${researchNumber}/Deliverables/${sanitizedDeliverableName}-${sanitizedDeliverableType}`;

  // Process files
  const uploadPromises = files
    .filter((file) => file.action === "new")
    .map(async (file) => {
      const base64Content = await fileToBase64(file.file);
      const payload: any = {
        FileContent: base64Content,
        FileName: file.file.name,
        Library: "Researches",
        Folder: folderPath,
        FileType: "Deliverable",
        UserEmail: user?.contact?.[ContactFields.EMAILADDRESS1] || "",
      };

      const response = await triggerFlow(APIURL.FileUploadEndpoint, payload);

      if (response.success) {
        // 
      } else {
        
        throw new Error(`Failed to upload ${file.file.name}`);
      }
    });

  await Promise.all(uploadPromises);
};

/**
 * Process multiple report file uploads
 * Can be used when submitting multiple reports at once
 */
export const processMultipleReportFileUploads = async (
  reports: Array<{
    files: { file: File; action: "new" | "existing" | "remove" }[];
    year: string;
    month: string;
  }>,
  researchNumber: string,
  triggerFlow: (url: string, payload: any) => Promise<any>,
  user: any,
): Promise<void> => {
  const uploadPromises = reports.map((report) =>
    processReportFileUploads(
      report.files,
      researchNumber,
      report.year,
      report.month,
      triggerFlow,
      user,
    ),
  );

  await Promise.all(uploadPromises);
};

/**
 * Normalized file item shape expected by getFile
 */
interface NormalizedFileItem {
  fileName: string;
  contentType: string;
  base64: string;
}

/**
 * Extract file array from Power Automate GetFiles response and normalize each item.
 * Handles response shapes: { data: [...] }, { outputs: { body: [...] } }, or raw array.
 * Maps common property names: Name/FileName, ContentType/contentType, Base64/contentBytes/base64.
 */
export function normalizeGetFilesResponse(body: unknown): NormalizedFileItem[] {
  if (body == null) return [];
  let arr: unknown[] = [];
  if (Array.isArray(body)) {
    arr = body;
  } else if (typeof body === "object" && "data" in body && Array.isArray((body as { data: unknown[] }).data)) {
    arr = (body as { data: unknown[] }).data;
  } else if (
    typeof body === "object" &&
    "outputs" in body &&
    typeof (body as { outputs?: { body?: unknown } }).outputs === "object" &&
    Array.isArray((body as { outputs: { body?: unknown } }).outputs?.body)
  ) {
    arr = (body as { outputs: { body: unknown[] } }).outputs.body;
  } else {
    return [];
  }
  return arr.map((item: any) => {
    const fileName =
      item?.fileName ?? item?.FileName ?? item?.Name ?? item?.name ?? "";
    const contentType =
      item?.contentType ?? item?.ContentType ?? item?.type ?? "application/octet-stream";
    const base64 =
      item?.base64 ?? item?.Base64 ?? item?.contentBytes ?? item?.Content ?? "";
    return { fileName, contentType, base64 };
  }).filter((n) => n.fileName && n.base64);
}

/**
 * Helper to convert base64 file data to File object.
 * Expects normalized shape { fileName, contentType, base64 }.
 */
const getFile = (sfile: NormalizedFileItem): File => {
  const { fileName, contentType, base64 } = sfile;
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], fileName, { type: contentType });
};

/**
 * Load files for a specific deliverable
 * Fetches files from SharePoint under Researches/{researchNumber}/Deliverables/{deliverableName-deliverableType}
 */
export const loadDeliverableFiles = async (
  researchNumber: string,
  deliverableName: string,
  deliverableType: string,
  triggerFlow: (url: string, payload: any) => Promise<any>,
): Promise<{ file: File; action: "existing" }[]> => {
  if (!researchNumber || !deliverableName || !deliverableType) {
    return [];
  }

  try {
    // Sanitize names for folder path (remove invalid characters)
    const sanitizedDeliverableName = deliverableName.replace(/[<>:"/\\|?*]/g, '-');
    const sanitizedDeliverableType = deliverableType.replace(/[<>:"/\\|?*]/g, '-');
    
    const folderPath = `${researchNumber}/Deliverables/${sanitizedDeliverableName}-${sanitizedDeliverableType}`;

    const response = await triggerFlow(APIURL.FileGetEndpoint, {
      Library: "Researches",
      Folder: folderPath,
    });

    if (response?.success) {
      const normalized = normalizeGetFilesResponse(response.data);
      return normalized.map((f) => ({
        file: getFile(f),
        action: "existing" as const,
      }));
    }

    return [];
  } catch (error) {
    
    return [];
  }
};

/**
 * Load files for a specific dissemination request
 * Fetches files from SharePoint under Researches/{researchNumber}/Dissemination Requests/{submissionDate}-{budgetNeeded}
 */
export const loadDisseminationFiles = async (
  researchNumber: string,
  submissionDate: string,
  budgetNeeded: string,
  triggerFlow: (url: string, payload: any) => Promise<any>,
): Promise<{ file: File; action: "existing" }[]> => {
  if (!researchNumber || !submissionDate || !budgetNeeded) {
    return [];
  }

  try {
    // Sanitize values for folder path (remove invalid characters)
    const sanitizedDate = submissionDate.replace(/[<>:"/\\|?*]/g, '-');
    const sanitizedBudget = budgetNeeded.replace(/[<>:"/\\|?*]/g, '-');
    
    const folderPath = `${researchNumber}/Dissemination Requests/${sanitizedDate}-${sanitizedBudget}`;

    const response = await triggerFlow(APIURL.FileGetEndpoint, {
      Library: "Researches",
      Folder: folderPath,
    });

    if (response?.success) {
      const normalized = normalizeGetFilesResponse(response.data);
      return normalized.map((f) => ({
        file: getFile(f),
        action: "existing" as const,
      }));
    }

    return [];
  } catch (error) {
    
    return [];
  }
};

/** Type labels for dissemination activity folder naming (must match DisseminationActivitiesSection options) */
const DISSEMINATION_ACTIVITY_TYPE_LABELS: Record<number, string> = {
  1: "International",
  2: "Local",
  3: "Regional",
  4: "Conference-or-Symposium",
  5: "Webinar",
  6: "Forum",
  7: "Newsletter",
  8: "Workshop",
  9: "Local-Stakeholder-Academic-Presentation",
  10: "Other",
};

/**
 * Build folder path for a dissemination activity: Type + Date (no activityId in path).
 * Used for SharePoint under Researches/{researchNumber}/Dissemination Activities/{typeSlug}-{dateSlug}
 */
export const getDisseminationActivityFolderPath = (
  researchNumber: string,
  type: number,
  date: string,
  activityId: string,
): string => {
  const typeLabel = DISSEMINATION_ACTIVITY_TYPE_LABELS[type] ?? "Other";
  const typeSlug = typeLabel.replace(/[^a-zA-Z0-9-]/g, "");
  const dateStr = date
    ? new Date(date).toISOString().slice(0, 10).replace(/-/g, "")
    : "";
  const dateSlug = dateStr || "nodate";
  return `${researchNumber}/Dissemination Activities/${typeSlug}-${dateSlug}`;
};

/**
 * SharePoint folder for a capacity building / research activity:
 * Researches/{researchNumber}/Capacity Building/{titleSlug}-{dateSlug}
 * (activityId reserved for API parity with other helpers; path is title+date based)
 */
export const getResearchActivityFolderPath = (
  researchNumber: string,
  title: string,
  date: string,
  _activityId: string,
): string => {
  const safeTitle =
    (title || "untitled")
      .trim()
      .replace(/[<>:"/\\|?*]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "untitled";
  const dateStr = date
    ? new Date(date).toISOString().slice(0, 10).replace(/-/g, "")
    : "";
  const dateSlug = dateStr || "nodate";
  return `${researchNumber}/Capacity Building/${safeTitle}-${dateSlug}`;
};

/**
 * Load files for a specific dissemination activity (Materials / Attachments)
 * Fetches files from SharePoint under Researches/{researchNumber}/Dissemination Activities/{typeSlug}-{dateSlug}
 */
export const loadDisseminationActivityFiles = async (
  researchNumber: string,
  type: number,
  date: string,
  activityId: string,
  triggerFlow: (url: string, payload: any) => Promise<any>,
): Promise<{ file: File; action: "existing" }[]> => {
  if (!researchNumber || !activityId) {
    return [];
  }

  try {
    const folderPath = getDisseminationActivityFolderPath(
      researchNumber,
      type,
      date,
      activityId,
    );

    const response = await triggerFlow(APIURL.FileGetEndpoint, {
      Library: "Researches",
      Folder: folderPath,
    });

    if (response?.success) {
      const normalized = normalizeGetFilesResponse(response.data);
      return normalized.map((f) => ({
        file: getFile(f),
        action: "existing" as const,
      }));
    }

    return [];
  } catch (error) {
    
    return [];
  }
};

/** Load attachments for a capacity building / research activity */
export const loadResearchActivityFiles = async (
  researchNumber: string,
  title: string,
  date: string,
  activityId: string,
  triggerFlow: (url: string, payload: any) => Promise<any>,
): Promise<{ file: File; action: "existing" }[]> => {
  if (!researchNumber || !activityId) {
    return [];
  }

  try {
    const folderPath = getResearchActivityFolderPath(
      researchNumber,
      title,
      date,
      activityId,
    );

    const response = await triggerFlow(APIURL.FileGetEndpoint, {
      Library: "Researches",
      Folder: folderPath,
    });

    if (response?.success) {
      const normalized = normalizeGetFilesResponse(response.data);
      return normalized.map((f) => ({
        file: getFile(f),
        action: "existing" as const,
      }));
    }

    return [];
  } catch (error) {
    
    return [];
  }
};

/**
 * Load files for a specific status report
 * Fetches files from SharePoint under Researches/{researchNumber}/Status Reports/{year-month}
 */
export const loadReportFiles = async (
  researchNumber: string,
  reportYear: string,
  reportMonth: string,
  triggerFlow: (url: string, payload: any) => Promise<any>,
): Promise<{ file: File; action: "existing" }[]> => {
  if (!researchNumber || !reportYear || !reportMonth) {
    return [];
  }

  try {
    // Pad month with leading zero if needed (e.g., 1 -> 01)
    const paddedMonth = reportMonth.padStart(2, '0');
    
    const folderPath = `${researchNumber}/Status Reports/${reportYear}-${paddedMonth}`;

    const response = await triggerFlow(APIURL.FileGetEndpoint, {
      Library: "Researches",
      Folder: folderPath,
    });

    if (response?.success) {
      const normalized = normalizeGetFilesResponse(response.data);
      return normalized.map((f) => ({
        file: getFile(f),
        action: "existing" as const,
      }));
    }

    return [];
  } catch (error) {
    
    return [];
  }
};
