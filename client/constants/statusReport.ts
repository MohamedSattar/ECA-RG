/**
 * Status Report entity field names
 * Entity: prmtk_statusreport
 */
export const StatusReportFields = {
  // Primary Key
  STATUSREPORTID: "prmtk_statusreportid",
    
  // Business Fields
  REPORTTITLE: "prmtk_reporttitle",
  REPORTINGYEAR: "prmtk_reportingyear",
  REPORTINGMONTH: "prmtk_reportingmonth",
  REPORTINGDATE: "prmtk_reportingdate",
  BUDGETSPENT: "prmtk_budgetspent",
  BUDGETSPENT_BASE: "prmtk_budgetspent_base",
  RESEARCHHEALTHINDICATOR: "prmtk_researchhealthindicator",
  ACHIEVEMENTS: "prmtk_achievements",
  CHALLENGES: "prmtk_challenges",
  KEYACTIVITIES: "prmtk_keyactivities",
  UPCOMINGACTIVITIES: "prmtk_upcomingactivities",
  JOURNALPUBLICATIONS: "prmtk_journalpublications",
  WORKFORCEDEVELOPMENT: "prmtk_workforcedevelopment",
  
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
  
  // Formatted Values
  BUDGETSPENT_FORMATTED: "prmtk_budgetspent@OData.Community.Display.V1.FormattedValue",
  BUDGETSPENT_BASE_FORMATTED: "prmtk_budgetspent_base@OData.Community.Display.V1.FormattedValue",
  REPORTINGYEAR_FORMATTED: "prmtk_reportingyear@OData.Community.Display.V1.FormattedValue",
  REPORTINGMONTH_FORMATTED: "prmtk_reportingmonth@OData.Community.Display.V1.FormattedValue",
  REPORTINGDATE_FORMATTED: "prmtk_reportingdate@OData.Community.Display.V1.FormattedValue",
  RESEARCH_FORMATTED: "_prmtk_research_value@OData.Community.Display.V1.FormattedValue",
  TRANSACTIONCURRENCY_FORMATTED: "_transactioncurrencyid_value@OData.Community.Display.V1.FormattedValue",
  OWNERID_FORMATTED: "_ownerid_value@OData.Community.Display.V1.FormattedValue",
  OWNINGBUSINESSUNIT_FORMATTED: "_owningbusinessunit_value@OData.Community.Display.V1.FormattedValue",
  CREATEDBY_FORMATTED: "_createdby_value@OData.Community.Display.V1.FormattedValue",
  MODIFIEDBY_FORMATTED: "_modifiedby_value@OData.Community.Display.V1.FormattedValue",
  CREATEDONBEHALFBY_FORMATTED: "_createdonbehalfby_value@OData.Community.Display.V1.FormattedValue",
  MODIFIEDONBEHALFBY_FORMATTED: "_modifiedonbehalfby_value@OData.Community.Display.V1.FormattedValue",
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

export type StatusReportFieldKeys = typeof StatusReportFields[keyof typeof StatusReportFields];
