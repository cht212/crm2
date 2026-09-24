import { type MongoAbility, createMongoAbility } from '@casl/ability'
import { useCookie } from '@core/composable/useCookie'

export type AppAction = 'manage' | 'read' | 'create' | 'update' | 'delete'
export type AppSubject =
  | 'QuoteRequest'
  | 'Customer'
  | 'CustomerOwn'
  | 'Promotion'
  | 'Catalog'
  | 'User'
  | 'Role'
  | 'all'
export interface AppAbilityRule {
  action: AppAction
  subject: AppSubject
}

export type AppAbility = MongoAbility<[AppAction, AppSubject]>

const storedRules = useCookie<AppAbilityRule[]>('userAbilityRules').value ?? []

export const ability = createMongoAbility<AppAbility>(storedRules)
