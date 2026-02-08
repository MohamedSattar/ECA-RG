/**
 * Dissemination Request entity field names
 * Entity: prmtk_disseminationapplicants
 */
export const DisseminationRequestFields = {
  // Primary Key
  DISSEMINATIONAPPLICANTID: "prmtk_disseminationapplicantid",
  DISSEMINATIONAPPLICANTIDAPI: "prmtk_disseminationapplicantid@odata.bind",
  APPLICATIONID: "prmtk_applicationid@odata.bind",
  // Business Fields
  TITLE: "prmtk_title",
  ABSTRACT: "prmtk_abstract",
  JOURNALNAME: "prmtk_journalname",
  BUDGETNEEDED: "prmtk_budgetneeded",
  BUDGETNEEDED_BASE: "prmtk_budgetneeded_base",
  SUBMISSIONDATE: "prmtk_submissiondate",
  REQUESTSTATUS: "prmtk_requeststatus",
  // Lookups (values)
  RESEARCH: "_prmtk_research_value",
  TRANSACTIONCURRENCY: "_transactioncurrencyid_value",
  OWNERID: "_ownerid_value",
  OWNINGUSER: "_owninguser_value",
  OWNINGTEAM: "_owningteam_value",
  OWNINGBUSINESSUNIT: "_owningbusinessunit_value",
  CREATEDBY: "_createdby_value",
  MODIFIEDBY: "_modifiedby_value",
  CREATEDONBEHALFBY: "_createdonbehalfby_value",
  MODIFIEDONBEHALFBY: "_modifiedonbehalfby_value",

  // Lookups (OData binding)
  RESEARCH_ID: "prmtk_Research@odata.bind",
  TRANSACTIONCURRENCY_ID: "transactioncurrencyid@odata.bind",
  OWNERID_ID_BIND: "ownerid@odata.bind",
  // Formatted Values
  BUDGETNEEDED_FORMATTED:
    "prmtk_budgetneeded@OData.Community.Display.V1.FormattedValue",
  BUDGETNEEDED_BASE_FORMATTED:
    "prmtk_budgetneeded_base@OData.Community.Display.V1.FormattedValue",
  SUBMISSIONDATE_FORMATTED:
    "prmtk_submissiondate@OData.Community.Display.V1.FormattedValue",
  REQUESTSTATUS_FORMATTED:
    "prmtk_requeststatus@OData.Community.Display.V1.FormattedValue",
  RESEARCH_FORMATTED:
    "_prmtk_research_value@OData.Community.Display.V1.FormattedValue",
  TRANSACTIONCURRENCY_FORMATTED:
    "_transactioncurrencyid_value@OData.Community.Display.V1.FormattedValue",
  OWNERID_FORMATTED: "_ownerid_value@OData.Community.Display.V1.FormattedValue",
  OWNINGBUSINESSUNIT_FORMATTED:
    "_owningbusinessunit_value@OData.Community.Display.V1.FormattedValue",
  CREATEDBY_FORMATTED:
    "_createdby_value@OData.Community.Display.V1.FormattedValue",
  MODIFIEDBY_FORMATTED:
    "_modifiedby_value@OData.Community.Display.V1.FormattedValue",
  CREATEDONBEHALFBY_FORMATTED:
    "_createdonbehalfby_value@OData.Community.Display.V1.FormattedValue",
  MODIFIEDONBEHALFBY_FORMATTED:
    "_modifiedonbehalfby_value@OData.Community.Display.V1.FormattedValue",
  CREATEDON_FORMATTED: "createdon@OData.Community.Display.V1.FormattedValue",
  MODIFIEDON_FORMATTED: "modifiedon@OData.Community.Display.V1.FormattedValue",

  // System Fields
  CREATEDON: "createdon",
  MODIFIEDON: "modifiedon",
  STATECODE: "statecode",
  STATUSCODE: "statuscode",
  VERSIONNUMBER: "versionnumber",
  EXCHANGERATE: "exchangerate",
  IMPORTSEQUENCENUMBER: "importsequencenumber",
  OVERRIDDENCREATEDON: "overriddencreatedon",
  TIMEZONERULEVERSIONNUMBER: "timezoneruleversionnumber",
  UTCCONVERSIONTIMEZONECODE: "utcconversiontimezonecode",
} as const;

export type DisseminationRequestFieldKeys = typeof DisseminationRequestFields[keyof typeof DisseminationRequestFields];
