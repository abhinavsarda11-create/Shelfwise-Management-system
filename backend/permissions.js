const PERMISSIONS = [
  'dashboard:view',
  'analytics:view',
  'products:read',
  'products:write',
  'products:delete',
  'stock:adjust',
  'stocklog:read',
  'customers:read',
  'customers:write',
  'customers:delete',
  'suppliers:read',
  'suppliers:write',
  'suppliers:delete',
  'orders:read',
  'orders:create',
  'orders:update',
  'orders:cancel',
  'import:run',
  'team:manage',
  'workspace:manage',
];

const ROLES = ['owner', 'manager', 'staff', 'viewer'];
const ASSIGNABLE = ['manager', 'staff', 'viewer'];

const matrix = {
  owner: PERMISSIONS,
  manager: PERMISSIONS.filter((p) => !['team:manage', 'workspace:manage'].includes(p)),
  staff: ['products:read', 'customers:read', 'customers:write', 'orders:read', 'orders:create', 'orders:update'],
  viewer: ['dashboard:view', 'analytics:view', 'products:read', 'stocklog:read', 'customers:read', 'suppliers:read', 'orders:read'],
};

const permsFor = (role) => matrix[role] || [];
const can = (role, permission) => permsFor(role).includes(permission);

module.exports = { PERMISSIONS, ROLES, ASSIGNABLE, matrix, permsFor, can };
