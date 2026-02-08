 /**
 * Budget Line Item entity field names
 * Entity: prmtk_budgetlineitem
 */
export const BudgetLineItemFields = {
  // Primary Key
  BUDGETLINEITEMID: "prmtk_budgetlineitemid",
    
  // Business Fields
  LINEITEMNAME: "prmtk_lineitemname",
  DESCRIPTION: "prmtk_description",
  AMOUNT: "prmtk_amount",
  AMOUNT_BASE: "prmtk_amount_base",
  CATEGORY: "prmtk_category",
  
  // Lookups (values)
  BUDGETHEADER: "_prmtk_budgetheader_value",
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
  BUDGETHEADER_ID: "prmtk_BudgetHeader@odata.bind",
  TRANSACTIONCURRENCY_ID: "transactioncurrencyid@odata.bind",
  
  // Formatted Values
  AMOUNT_FORMATTED: "prmtk_amount@OData.Community.Display.V1.FormattedValue",
  AMOUNT_BASE_FORMATTED: "prmtk_amount_base@OData.Community.Display.V1.FormattedValue",
  CATEGORY_FORMATTED: "prmtk_category@OData.Community.Display.V1.FormattedValue",
  BUDGETHEADER_FORMATTED: "_prmtk_budgetheader_value@OData.Community.Display.V1.FormattedValue",
  TRANSACTIONCURRENCY_FORMATTED: "_transactioncurrencyid_value@OData.Community.Display.V1.FormattedValue",
  OWNERID_FORMATTED: "_ownerid_value@OData.Community.Display.V1.FormattedValue",
  OWNINGBUSINESSUNIT_FORMATTED: "_owningbusinessunit_value@OData.Community.Display.V1.FormattedValue",
  CREATEDBY_FORMATTED: "_createdby_value@OData.Community.Display.V1.FormattedValue",
  MODIFIEDBY_FORMATTED: "_modifiedby_value@OData.Community.Display.V1.FormattedValue",
  CREATEDONBEHALFBY_FORMATTED: "_createdonbehalfby_value@OData.Community.Display.V1.FormattedValue",
  MODIFIEDONBEHALFBY_FORMATTED: "_modifiedonbehalfby_value@OData.Community.Display.V1.FormattedValue",
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