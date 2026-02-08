/**
 * Application entity field names
 * Entity: prmtk_application
 */
export const ApplicationFields = {
  // Primary Key
  APPLICATIONID: "prmtk_applicationid",

  // Business Fields
  APPLICATIONTITLE: "prmtk_applicationtitle",
  APPLICATIONNUMBER: "prmtk_applicationnumber",
  ABSTRACT: "prmtk_abstract",
  SUBMISSIONDATE: "prmtk_submissiondate",
  STATUS: "prmtk_status",
  SHORTLIST: "prmtk_shortlist",
  FOLDERURL: "prmtk_folderurl",

  // Comments
  AWARDEDCOMMENTS: "prmtk_awardedcomments",
  REJECTIONCOMMENTS: "prmtk_rejectioncomments",
  AMENDMENTCOMMENTS: "prmtk_amendmentcomments",
  ARCHIVALCOMMENTS: "prmtk_archivalcomments",
  BUDGETHEADERS: "_prmtk_budgetheader_value",
  CANCELLATIONCOMMENTS: "prmtk_cancellationcomments",

  // Compliance
  COMPLIANCESTATUS: "prmtk_compliancestatus",

  // Lookups (values)
  MAINAPPLICANT: "_prmtk_mainapplicant_value",
  GRANTCYCLE: "_prmtk_grantcycle_value",
  RESEARCHAREA: "_prmtk_researcharea_value",
  REVIEWER: "_prmtk_reviewer_value",
  UNIVERSITY: "_prmtk_university_value",
  BUDGETHEADER: "_prmtk_budgetheader_value",
  BUDGETLINEITEM: "_prmtk_budgetlineitems_value",

  // Lookups (OData binding)
  MAINAPPLICANT_ID: "prmtk_MainApplicant@odata.bind",
  GRANTCYCLE_ID: "prmtk_GrantCycle@odata.bind",
  RESEARCHAREA_ID: "prmtk_ResearchArea@odata.bind",

  // Formatted Values
  SUBMISSIONDATE_FORMATTED:
    "prmtk_submissiondate@OData.Community.Display.V1.FormattedValue",
  STATUS_FORMATTED: "prmtk_status@OData.Community.Display.V1.FormattedValue",
  COMPLIANCESTATUS_FORMATTED:
    "prmtk_compliancestatus@OData.Community.Display.V1.FormattedValue",
  MAINAPPLICANT_FORMATTED:
    "_prmtk_mainapplicant_value@OData.Community.Display.V1.FormattedValue",
  GRANTCYCLE_FORMATTED:
    "_prmtk_grantcycle_value@OData.Community.Display.V1.FormattedValue",
  RESEARCHAREA_FORMATTED:
    "_prmtk_researcharea_value@OData.Community.Display.V1.FormattedValue",

  // System Fields
  CREATEDON: "createdon",
  MODIFIEDON: "modifiedon",
  STATECODE: "statecode",
  STATUSCODE: "statuscode",
} as const;
