# Constants Refactoring

This directory contains the refactored constants following React SPA best practices.

## Structure

```
constants/
├── index.ts                    # Barrel export (main entry point)
├── tables.ts                   # Table names and metadata
├── options.ts                  # Option set values
├── grantCycle.ts              # Grant Cycle entity fields
├── application.ts             # Application entity fields  
└── entities.ts                # Other entity fields (Research, Contact, TeamMembers, etc.)
```

## Usage

### Recommended (New Code)

```typescript
import { ApplicationFields, TableName, TeamMemberRoles } from '@/constants';

// Using application fields
const url = `/_api/${TableName.APPLICATIONS}?$select=${ApplicationFields.APPLICATIONID},${ApplicationFields.APPLICATIONTITLE}`;

// Using team member roles
<Dropdown options={TeamMemberRoles.APPLICATION} />
```

### Legacy Compatibility (Existing Code)

All old imports still work for backward compatibility:

```typescript
// Old way (still works)
import { ApplicationKeys, TableName, OPTIONS } from '@/interfaces/constants';

// New way (preferred)
import { ApplicationFields, TableName, TeamMemberRoles } from '@/constants';
```

## Benefits

1. **Better Organization**: Each entity in its own file
2. **Type Safety**: All constants use `as const` for literal types
3. **Tree Shaking**: Import only what you need
4. **Discoverability**: Clear naming (Fields suffix indicates entity fields)
5. **Maintainability**: Easier to locate and update specific entity fields

## Migration Path

The old `/client/interfaces/constants.ts` file still exists for compatibility. You can gradually migrate imports:

```typescript
// Before
import { ApplicationKeys } from '@/interfaces/constants';

// After  
import { ApplicationFields } from '@/constants';

// Usage stays the same
ApplicationFields.APPLICATIONID
```

## Field Naming Convention

Each entity exports three types of fields:

1. **Business Fields**: Direct property names (e.g., `APPLICATIONTITLE`)
2. **Lookups (values)**: Read-only lookup values (e.g., `MAINAPPLICANT`)
3. **Lookups (OData binding)**: For creating/updating relationships (e.g., `MAINAPPLICANT_ID`)
4. **Formatted Values**: Display-formatted versions (e.g., `SUBMISSIONDATE_FORMATTED`)
5. **System Fields**: Metadata fields (e.g., `CREATEDON`, `MODIFIEDON`)
