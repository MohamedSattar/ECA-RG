const DEV_FILE_UPLOAD =
  "https://d2b51a037ca4edf98f016454711544.54.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/24c0c9cf14384c0d9a11b81d46341eac/triggers/manual/paths/invoke/UploadFile?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=YrI7_GdaKKrR_O9WppKBUV4unM0s2xHJG_9nAAdvMLI";
const DEV_FILE_DOWNLOAD =
  "https://d2b51a037ca4edf98f016454711544.54.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/d1437a9c8d004c41aa6db353daf7db30/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=UTKOP6q1SRhrYNlzInA9oLVeXhs7m_VTaJFoAGMDOdI";
const DEV_FILE_GET =
  "https://d2b51a037ca4edf98f016454711544.54.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/46548f658fc7492a959ba03069bc3209/triggers/manual/paths/invoke/GetFiles?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=xl4cDPxMW42ElFDPHr0rxwUd0bKNd9ZgkHMQgDsbucU";
const DEV_FILE_DELETE =
  "https://d2b51a037ca4edf98f016454711544.54.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/98ad766d3b754f0c8135d0df4151a57d/triggers/manual/paths/invoke/DeleteFile?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=UvNQhmblHlLhwIJwYC1C0azNT_B2_nNENzjRrCNuEaI";

export const APIURL = {
  FileUploadEndpoint:
    import.meta.env.VITE_FILE_UPLOAD_ENDPOINT ?? DEV_FILE_UPLOAD,
  FileDownloadEndpoint:
    import.meta.env.VITE_FILE_DOWNLOAD_ENDPOINT ?? DEV_FILE_DOWNLOAD,
  FileGetEndpoint: import.meta.env.VITE_FILE_GET_ENDPOINT ?? DEV_FILE_GET,
  FileDeleteEndpoint:
    import.meta.env.VITE_FILE_DELETE_ENDPOINT ?? DEV_FILE_DELETE,
};