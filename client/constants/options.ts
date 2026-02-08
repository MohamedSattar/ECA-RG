/**
 * Option set texts for team member roles
 */
export const TeamMemberRoles = {
  APPLICATION: [
    { key: "1", text: "Principle Investigator (PI)" },
    { key: "2", text: "Co-Principle Investigator (Co-PI)" },
    { key: "3", text: "Emirati Researcher" },
    { key: "4", text: "Assistant" },
    { key: "5", text: "Other" },
  ],
  RESEARCH: [
    { key: "912180000", text: "Principal Investigator" },
    { key: "912180001", text: "Co-Principal Investigator" },
    { key: "912180002", text: "Research Assistant" },
    { key: "912180003", text: "Collaborator" },
    { key: "912180004", text: "Co-Investigator" },
  ],
} as const;

export const ApplicationStatus = [
  { text: "Draft", key: 1 },
  { text: "Submitted", key: 2 },
  { text: "Return for updates", key: 3 },
  { text: "Shortlisted", key: 4 },
  { text: "Rejected", key: 5 },
  { text: "Pending Review", key: 6 },
  { text: "Review Completed", key: 7 },
  { text: "Awarded (Approved)", key: 8 },
  { text: "Active (Research In Progress)", key: 9 },
  { text: "Disqualified (Low Score)", key: 10 },
  { text: "Archived", key: 11 }
] as const;

export const BudgetCategorys = [
  { text: "Institutional Overhead", key: 912180000 },
  { text: "Research Personnel", key: 912180001 },
  { text: "Supplies", key: 912180002 },
  { text: "Research Dissemination and communication", key: 912180003 },
  { text: "Administrative Personnel Costs", key: 912180004 },
  { text: "Consultants and Subgrants", key: 912180005 },
  { text: "VAT", key: 912180006 },
];

export const PreferredContactMethodCode = [
  {text:"Any", key:1},
  { text: "Email", key: 2 },
  { text: "Phone", key: 3 },
  { text: "Mobile", key: 4 },
  { text:"Fax", key:5},
  { text:"Mail", key:6}
] as const;