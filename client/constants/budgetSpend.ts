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

  // Lookups (values) — Web API uses _prmtk_lineitem_value (see server/routes/budget.ts).
  BUDGETLINEITEM: "_prmtk_lineitem_value",

  // Lookups (OData binding)
  BUDGETLINEITEM_ID: "prmtk_LineItem@odata.bind",

  // System
  CREATEDON: "createdon",
  MODIFIEDON: "modifiedon",
} as const;
