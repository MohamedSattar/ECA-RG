/**
 * Research Area entity field names
 * Entity: prmtk_researcharea
 */
export const ResearchAreaFields = {
  // Primary Key
  RESEARCHAREAID: "prmtk_researchareaid",
  
  // Business Fields
  AREANAME: "prmtk_areaname",
  AREADESCRIPTION: "prmtk_areadescription",
  THUMBNAIL: "prmtk_thumbnail",
  THUMBNAIL_URL: "prmtk_thumbnail_url",
  THUMBNAIL_TIMESTAMP: "prmtk_thumbnail_timestamp",
  THUMBNAILID: "prmtk_thumbnailid",
  
  // Lookups
  GRANTCYCLE: "_prmtk_grantcycle_value",
  
  // Formatted Values
  GRANTCYCLE_FORMATTED: "_prmtk_grantcycle_value@OData.Community.Display.V1.FormattedValue",
  THUMBNAIL_TIMESTAMP_FORMATTED: "prmtk_thumbnail_timestamp@OData.Community.Display.V1.FormattedValue",
  
  // System Fields
  CREATEDON: "createdon",
  MODIFIEDON: "modifiedon",
  STATECODE: "statecode",
  STATUSCODE: "statuscode",
} as const;

/**
 * Contact entity field names
 * Entity: contact
 */
export const ContactFields = {
  CONTACTID: "contactid",
  FULLNAME: "fullname",
  EMAILADDRESS1: "emailaddress1",
  TELEPHONE1: "telephone1",
  ADX_USERID: "adx_identity_username",
  FIRSTNAME: "firstname",
  LASTNAME: "lastname",
  MOBILEPHONE: "mobilephone",
  PREFERREDCONTACTMETHODCODE: "preferredcontactmethodcode",
  PARENTCUSTOMERID: "_parentcustomerid_value",
  PARENTCUSTOMERID_BIND: "parentcustomerid_account@odata.bind",
  institute:
    "_parentcustomerid_value@OData.Community.Display.V1.FormattedValue",
} as const;

/**
 * Research entity field names
 * Entity: prmtk_research
 */
export const ResearchFields = {
  // Primary Key
  RESEARCHID: "prmtk_researchid",

  // Business Fields
  RESEARCHTITLE: "prmtk_researchtitle",
  RESEARCHNUMBER: "prmtk_researchnumber",
  RESEARCHSTATUS: "prmtk_researchstatus",
  STARTDATE: "prmtk_startdate",
  ENDDATE: "prmtk_enddate",
  TOTALBUDGET: "prmtk_totalbudget",
  TOTALBUDGET_BASE: "prmtk_totalbudget_base",
  FOLDERURL: "prmtk_folderurl",
  BUDGETCHANGEREQUESTED: "prmtk_budgetchangerequested",
  EXCHANGERATE: "exchangerate",

  // Lookups (values)
  PRINCIPALINVESTIGATOR: "_prmtk_principalinvestigator_value",
  RESEARCHAREA: "_prmtk_researcharea_value",
  APPLICATIONREFERENCE: "_prmtk_applicationreference_value",
  BUDGETHEADER: "_prmtk_budgetheader_value",
  CURRENCY: "_transactioncurrencyid_value",

  // Lookups (OData binding)
  PRINCIPALINVESTIGATOR_ID: "prmtk_PrincipalInvestigator@odata.bind",
  RESEARCHAREA_ID: "prmtk_ResearchArea@odata.bind",
  APPLICATIONREFERENCE_ID: "prmtk_ApplicationReference@odata.bind",

  // Formatted Values
  STARTDATE_FORMATTED:
    "prmtk_startdate@OData.Community.Display.V1.FormattedValue",
  ENDDATE_FORMATTED: "prmtk_enddate@OData.Community.Display.V1.FormattedValue",
  RESEARCHSTATUS_FORMATTED:
    "prmtk_researchstatus@OData.Community.Display.V1.FormattedValue",
  TOTALBUDGET_FORMATTED:
    "prmtk_totalbudget@OData.Community.Display.V1.FormattedValue",
  PRINCIPALINVESTIGATOR_FORMATTED:
    "_prmtk_principalinvestigator_value@OData.Community.Display.V1.FormattedValue",
  RESEARCHAREA_FORMATTED:
    "_prmtk_researcharea_value@OData.Community.Display.V1.FormattedValue",
  APPLICATIONREFERENCE_FORMATTED:
    "_prmtk_applicationreference_value@OData.Community.Display.V1.FormattedValue",

  // System Fields
  CREATEDON: "createdon",
  MODIFIEDON: "modifiedon",
  STATECODE: "statecode",
  STATUSCODE: "statuscode",
} as const;

/**
 * Research Team Member entity field names
 * Entity: prmtk_researchteammember
 */
export const ResearchTeamMemberFields = {
  // Primary Key
  RESEARCHTEAMMEMBERID: "prmtk_researchteammemberid",
  EDUCATIONLEVEL: "prmtk_educationallevel",
  // Business Fields
  TEAMMEMBERNAME: "prmtk_teammembername",
  ROLE: "prmtk_memberrole",
  CUSTOMROLE: "prmtk_otherrolename",
  // Lookups (values)
  RESEARCH: "_prmtk_research_value",
  CONTACT: "_prmtk_contact_value",

  // Lookups (OData binding)
  RESEARCH_ID: "prmtk_Research@odata.bind",
  CONTACT_ID: "prmtk_Contact@odata.bind",

  // Formatted Values
  ROLE_FORMATTED: "prmtk_role@OData.Community.Display.V1.FormattedValue",
  RESEARCH_FORMATTED:
    "_prmtk_research_value@OData.Community.Display.V1.FormattedValue",
  CONTACT_FORMATTED:
    "_prmtk_contact_value@OData.Community.Display.V1.FormattedValue",

  // System Fields
  CREATEDON: "createdon",
  MODIFIEDON: "modifiedon",
  STATECODE: "statecode",
  STATUSCODE: "statuscode",
} as const;

/**
 * Application Team Member entity field names
 * Entity: prmtk_applicationteammember
 */
export const ApplicationTeamMemberFields = {
  // Primary Key
  APPLICATIONTEAMMEMBERID: "prmtk_applicationteammemberid",

  // Business Fields
  PARTICIPATIONNAME: "prmtk_participationname",
  ROLE: "prmtk_memberrole",
  CUSTOMROLE: "prmtk_otherrolename",
  EDUCATIONLEVEL: "prmtk_educationlevel",

  // Lookups (values)
  APPLICATION: "_prmtk_application_value",
  CONTACT: "_prmtk_contact_value",

  // Lookups (OData binding)
  APPLICATION_ID: "prmtk_Application@odata.bind",
  CONTACT_ID: "prmtk_Contact@odata.bind",

  // Formatted Values
  ROLE_FORMATTED: "prmtk_role@OData.Community.Display.V1.FormattedValue",
  APPLICATION_FORMATTED:
    "_prmtk_application_value@OData.Community.Display.V1.FormattedValue",
  CONTACT_FORMATTED:
    "_prmtk_contact_value@OData.Community.Display.V1.FormattedValue",

  // System Fields
  CREATEDON: "createdon",
  MODIFIEDON: "modifiedon",
  STATECODE: "statecode",
  STATUSCODE: "statuscode",
} as const;
