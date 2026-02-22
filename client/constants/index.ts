/**
 * @fileoverview Centralized constants for the Research Grants Portal
 * 
 * This module provides a clean, organized structure for all application constants:
 * - Entity field names (with proper type safety via `as const`)
 * - Table names for Dataverse entities
 * - Option set values for dropdowns/selects
 * - Expand navigation properties for OData queries
 * 
 * Import patterns:
 * ```ts
 * // Named imports (preferred)
 * import { ApplicationFields, TableName } from '@/constants';
 * 
 * // Legacy compatibility (deprecated - use named imports)
 * import { ApplicationKeys } from '@/constants';
 * ```
 */

// Entity Fields
export { GrantCycleFields } from './grantCycle';
export { ApplicationFields } from './application';
export {
  ResearchAreaFields,
  ContactFields,
  ResearchFields,
  ResearchTeamMemberFields,
  ApplicationTeamMemberFields,
} from './entities';
export { StatusReportFields } from "./statusReport";
export { DisseminationRequestFields } from "./disseminationRequest";
export { DisseminationActivityFields } from "./disseminationActivity";
export { DeliverablesFields as DeliverableFields, DeliverableTypeOptions } from "./deliverables";

// Tables & Metadata
export { TableName, ColumnName, ExpandRelations } from './tables';

// Option Sets
export { TeamMemberRoles } from './options';

// ============================================
// Legacy Compatibility Exports (Deprecated)
// ============================================
// These are kept for backward compatibility.
// New code should use the named exports above.

/**
 * @deprecated Use ApplicationFields instead
 */
export { ApplicationFields as ApplicationKeys } from './application';

/**
 * @deprecated Use GrantCycleFields instead
 */
export { GrantCycleFields as GrantCycleKeys } from './grantCycle';

/**
 * @deprecated Use ResearchAreaFields instead
 */
export { ResearchAreaFields as ResearchAreaKeys } from './entities';

/**
 * @deprecated Use ContactFields instead
 */
export { ContactFields as ContactKeys } from './entities';

/**
 * @deprecated Use ResearchFields instead
 */
export { ResearchFields as ResearchKeys } from './entities';

/**
 * @deprecated Use ResearchTeamMemberFields instead
 */
export { ResearchTeamMemberFields as ResearchTeamMemberKeys } from './entities';

/**
 * @deprecated Use ApplicationTeamMemberFields instead
 */
export { ApplicationTeamMemberFields as ApplicationTeamMemberKeys } from './entities';

/**
 * @deprecated Use ExpandRelations instead
 */
export const ApplicationsExpand = "prmtk_Application_prmtk_GrantCycle_prmtk_GrantCycle";
/**
 * @deprecated Use ExpandRelations instead
 */
export const ResearchAreasExpand = "prmtk_ResearchArea_prmtk_GrantCycle_prmtk_GrantCycle";
/**
 * @deprecated Use ExpandRelations instead
 */
export const ApplicationTeamMemberExpand = "prmtk_ApplicationTeamMember_prmtk_Application_prmtk_Application";

export const ResearchTeamMemberExpand = "prmtk_TeamMember_prmtk_Research_prmtk_Research";
