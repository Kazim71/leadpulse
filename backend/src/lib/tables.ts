/**
 * Single source of truth for database identifiers. Nothing else in the
 * codebase should contain a table or function name as a bare string —
 * renaming a table should be a one-line change here plus a migration.
 */
export const TABLES = {
  ORGANIZATIONS: 'organizations',
  ADMIN_USERS: 'admin_users',
  CONTACTS: 'contacts',
  EVENTS: 'events',
  VISITOR_IDENTITY_MAP: 'visitor_identity_map',
} as const;

export const RPC = {
  IDENTIFY_VISITOR: 'identify_visitor',
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];
