/**
 * Deliverables entity field names
 * Entity: prmtk_deliverables
 */
export const DeliverablesFields = {
  // Primary Key
  DELIVERABLEID: "prmtk_deliverableid",

  // Business Fields
  DELIVERABLENAME: "prmtk_deliverablename",
  DESCRIPTION: "prmtk_description",
  DELIVERABLETYPE: "prmtk_deliverabletype",
  SUBMISSIONDATE: "prmtk_submissiondate",
  FILEURL: "prmtk_fileurl",

  // Lookups (values)
  RESEARCH: "_prmtk_research_value",
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

  // Formatted Values
  DELIVERABLETYPE_FORMATTED:
    "prmtk_deliverabletype@OData.Community.Display.V1.FormattedValue",
  SUBMISSIONDATE_FORMATTED:
    "prmtk_submissiondate@OData.Community.Display.V1.FormattedValue",
  RESEARCH_FORMATTED:
    "_prmtk_research_value@OData.Community.Display.V1.FormattedValue",
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
  IMPORTSEQUENCENUMBER: "importsequencenumber",
  OVERRIDDENCREATEDON: "overriddencreatedon",
  TIMEZONERULEVERSIONNUMBER: "timezoneruleversionnumber",
  UTCCONVERSIONTIMEZONECODE: "utcconversiontimezonecode",
} as const;

export type DeliverablesFieldKeys = typeof DeliverablesFields[keyof typeof DeliverablesFields];

/**
 * Deliverable Type Options
 */
export const DeliverableTypeOptions = [
  { key: 912180000, text: "Final Report" },
  { key: 912180001, text: "Aman Script" },
  { key: 912180002, text: "Policy Brief" },
  { key: 912180003, text: "Final Dataset" },
] as const;

/**
 * Helper function to get deliverable type text from value
 */
export const getDeliverableTypeText = (value: number): string => {
  const option = DeliverableTypeOptions.find(opt => opt.key === value);
  return option?.text || "Unknown";
};
