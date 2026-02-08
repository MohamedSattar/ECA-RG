/**
 * Budget Header entity field names
 * Entity: prmtk_budgetheader
 */
export const BudgetHeaderFields = {
  // Primary Key
  BUDGETHEADERID: "prmtk_budgetheaderid",
  
  // Business Fields
  BUDGETNAME: "prmtk_budgetname",
  TOTALBUDGET: "prmtk_totalbudget",
  TOTALBUDGET_BASE: "prmtk_totalbudget_base",
  VERSIONNUMBER_BUDGET: "prmtk_versionnumber",
  STATUS: "prmtk_status",
  
  // Lookups (values)
  APPLICATION: "_prmtk_application_value",
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
  APPLICATION_ID: "prmtk_Application@odata.bind",
  RESEARCH_ID: "prmtk_Research@odata.bind",
  TRANSACTIONCURRENCY_ID: "transactioncurrencyid@odata.bind",
  
  // Formatted Values
  TOTALBUDGET_FORMATTED: "prmtk_totalbudget@OData.Community.Display.V1.FormattedValue",
  TOTALBUDGET_BASE_FORMATTED: "prmtk_totalbudget_base@OData.Community.Display.V1.FormattedValue",
  STATUS_FORMATTED: "prmtk_status@OData.Community.Display.V1.FormattedValue",
  APPLICATION_FORMATTED: "_prmtk_application_value@OData.Community.Display.V1.FormattedValue",
  TRANSACTIONCURRENCY_FORMATTED: "_transactioncurrencyid_value@OData.Community.Display.V1.FormattedValue",
  OWNERID_FORMATTED: "_ownerid_value@OData.Community.Display.V1.FormattedValue",
  CREATEDBY_FORMATTED: "_createdby_value@OData.Community.Display.V1.FormattedValue",
  MODIFIEDBY_FORMATTED: "_modifiedby_value@OData.Community.Display.V1.FormattedValue",
  CREATEDONBEHALFBY_FORMATTED: "_createdonbehalfby_value@OData.Community.Display.V1.FormattedValue",
  OWNINGBUSINESSUNIT_FORMATTED: "_owningbusinessunit_value@OData.Community.Display.V1.FormattedValue",
  VERSIONNUMBER_BUDGET_FORMATTED: "prmtk_versionnumber@OData.Community.Display.V1.FormattedValue",
  CREATEDON_FORMATTED: "createdon@OData.Community.Display.V1.FormattedValue",
  MODIFIEDON_FORMATTED: "modifiedon@OData.Community.Display.V1.FormattedValue",
  EXCHANGERATE_FORMATTED: "exchangerate@OData.Community.Display.V1.FormattedValue",
  VERSIONNUMBER_FORMATTED: "versionnumber@OData.Community.Display.V1.FormattedValue",
  STATUSCODE_FORMATTED: "statuscode@OData.Community.Display.V1.FormattedValue",
  STATECODE_FORMATTED: "statecode@OData.Community.Display.V1.FormattedValue",
  
  // System Fields
  CREATEDON: "createdon",
  MODIFIEDON: "modifiedon",
  OVERRIDDENCREATEDON: "overriddencreatedon",
  STATECODE: "statecode",
  STATUSCODE: "statuscode",
  VERSIONNUMBER: "versionnumber",
  EXCHANGERATE: "exchangerate",
  IMPORTSEQUENCENUMBER: "importsequencenumber",
  TIMEZONERULEVERSIONNUMBER: "timezoneruleversionnumber",
  UTCCONVERSIONTIMEZONECODE: "utcconversiontimezonecode",
} as const;
