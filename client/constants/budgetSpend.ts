/**
 * Budget Spend entity field names
 * Entity: prmtk_budgetspends
 * One record per budget line item per period (e.g. per month); used to track spent amount per period.
 */
export const BudgetSpendFields = {
  // Primary Key
  BUDGETSPENDID: "prmtk_budgetspendid",

  // Business Fields
  AMOUNT: "prmtk_amount",
  MONTH: "prmtk_month",
  YEAR: "prmtk_year",

  // Lookups (values)
  BUDGETLINEITEM: "_prmtk_budgetlineitem_value",

  // Lookups (OData binding)
  BUDGETLINEITEM_ID: "prmtk_BudgetLineItem@odata.bind",

  // System
  CREATEDON: "createdon",
  MODIFIEDON: "modifiedon",
} as const;
