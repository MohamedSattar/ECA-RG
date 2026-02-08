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
        // console.log(`Uploaded file ${file.file.name} successfully to ${folderPath}.`);
      } else {
        console.error(
          `Failed to upload file ${file.file.name}. Error:`,
          response.error,
        );
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
        // console.log(`Uploaded file ${file.file.name} successfully to ${folderPath}.`);
      } else {
        console.error(
          `Failed to upload file ${file.file.name}. Error:`,
          response.error,
        );
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
        // console.log(`Uploaded file ${file.file.name} successfully to ${folderPath}.`);
      } else {
        console.error(
          `Failed to upload file ${file.file.name}. Error:`,
          response.error,
        );
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
 * Helper to convert base64 file data to File object
 */
const getFile = (sfile: any): File => {
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

    if (response?.success && response?.data) {
      return response.data.map((f: any) => ({
        file: getFile(f),
        action: "existing" as const,
      }));
    }

    return [];
  } catch (error) {
    console.error("Failed to load deliverable files:", error);
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

    if (response?.success && response?.data) {
      return response.data.map((f: any) => ({
        file: getFile(f),
        action: "existing" as const,
      }));
    }

    return [];
  } catch (error) {
    console.error("Failed to load dissemination files:", error);
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

    if (response?.success && response?.data) {
      return response.data.map((f: any) => ({
        file: getFile(f),
        action: "existing" as const,
      }));
    }

    return [];
  } catch (error) {
    console.error("Failed to load report files:", error);
    return [];
  }
};
