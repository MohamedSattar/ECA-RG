/**
 * Grant Cycle entity field names
 * Entity: prmtk_grantcycle
 */
export const GrantCycleFields = {
  // Primary Key
  GRANTCYCLEID: "prmtk_grantcycleid",
  
  // Business Fields
  CYCLENAME: "prmtk_cyclename",
  CYCLEDESCRIPTION: "prmtk_cycledescription",
  CYCLEBUDGET: "prmtk_cyclebudget",
  CYCLEBUDGET_BASE: "prmtk_cyclebudget_base",
  STARTDATE: "prmtk_startdate",
  ENDDATE: "prmtk_enddate",
  TYPE: "prmtk_type",
  STATUS: "prmtk_status",
  ISPUBLISHED: "prmtk_ispublished",
  
  // Lookups
  PROGRAMINITIATIVE: "_prmtk_programinitiative_value",
  CURRENCY: "_transactioncurrencyid_value",
  
  // Formatted Values
  STARTDATE_FORMATTED: "prmtk_startdate@OData.Community.Display.V1.FormattedValue",
  ENDDATE_FORMATTED: "prmtk_enddate@OData.Community.Display.V1.FormattedValue",
  CYCLEBUDGET_FORMATTED: "prmtk_cyclebudget@OData.Community.Display.V1.FormattedValue",
  TYPE_FORMATTED: "prmtk_type@OData.Community.Display.V1.FormattedValue",
  STATUS_FORMATTED: "prmtk_status@OData.Community.Display.V1.FormattedValue",
  ISPUBLISHED_FORMATTED: "prmtk_ispublished@OData.Community.Display.V1.FormattedValue",
  
  // System Fields
  CREATEDON: "createdon",
  MODIFIEDON: "modifiedon",
  STATECODE: "statecode",
  STATUSCODE: "statuscode",
} as const;
