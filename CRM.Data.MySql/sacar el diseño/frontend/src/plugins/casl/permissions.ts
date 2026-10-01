import type { AppAbilityRule } from './ability'

const permissionMap: Record<string, AppAbilityRule> = {
  'quotes.view.all': { action: 'read', subject: 'QuoteRequest' },
  'quotes.view.own': { action: 'read', subject: 'QuoteRequest' },
  'quotes.create': { action: 'create', subject: 'QuoteRequest' },
  'quotes.update': { action: 'update', subject: 'QuoteRequest' },
  'quotes.change-status': { action: 'update', subject: 'QuoteRequest' },
  'quotes.view-history': { action: 'read', subject: 'QuoteRequest' },
  'customers.view.all': { action: 'read', subject: 'Customer' },
  'customers.view.own': { action: 'read', subject: 'CustomerOwn' },
  'customers.create': { action: 'create', subject: 'Customer' },
  'customers.update.all': { action: 'update', subject: 'Customer' },
  'users.view': { action: 'read', subject: 'User' },
  'users.create': { action: 'create', subject: 'User' },
  'users.update': { action: 'update', subject: 'User' },
  'roles.view': { action: 'read', subject: 'Role' },
  'roles.create': { action: 'create', subject: 'Role' },
  'roles.update': { action: 'update', subject: 'Role' },
  'promotions.view': { action: 'read', subject: 'Promotion' },
  'promotions.create': { action: 'create', subject: 'Promotion' },
  'promotions.update': { action: 'update', subject: 'Promotion' },
  'promotions.delete': { action: 'delete', subject: 'Promotion' },
  'catalog.view': { action: 'read', subject: 'Catalog' },
  'catalog.create': { action: 'create', subject: 'Catalog' },
  'catalog.update': { action: 'update', subject: 'Catalog' },
  'catalog.delete': { action: 'delete', subject: 'Catalog' },
}

export const permissionsToAbilityRules = (
  permissions: string[],
): AppAbilityRule[] =>
  permissions
    .map(permission => permissionMap[permission])
    .filter((rule): rule is AppAbilityRule => Boolean(rule))
