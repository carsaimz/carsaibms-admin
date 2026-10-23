/**
 * Cliente da API do Carsai BMS Admin.
 * Todas as chamadas usam a cookie de sessão httpOnly (credentials: 'include')
 * e lança ApiError com a mensagem do backend quando a resposta não é 2xx.
 *
 * CarsaiDev — Uma linha, uma solução. 🇲🇿
 */

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT'
export type CompanyStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'
export type KeyStatus = 'ACTIVE' | 'REVOKED'
export type PlanInterval = 'MONTHLY' | 'YEARLY'
export type KeyType = 'LICENSE' | 'API'

/* ------------------------------------------------------------------ */
/* Tipos de dados                                                      */
/* ------------------------------------------------------------------ */

export interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  interval: string
  maxUsers: number
  isPopular: boolean
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface PlanModuleRef {
  id: string
  key: string
  name: string
  category: string
}

export interface PlanWithModules extends Plan {
  modules: PlanModuleRef[]
  companiesCount: number
}

export interface ModuleWithCounts {
  id: string
  key: string
  name: string
  description: string | null
  icon: string
  category: string
  isCore: boolean
  isActive: boolean
  sortOrder: number
  companiesCount: number
  plansCount: number
}

export interface Company {
  id: string
  name: string
  slug: string
  email: string
  phone: string | null
  nuit: string | null
  address: string | null
  city: string | null
  province: string | null
  status: string
  planId: string | null
  licenseKey: string | null
  licenseStatus: string
  apiKey: string | null
  apiKeyStatus: string
  maxUsers: number
  expiresAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CompanyPlanRef {
  id: string
  name: string
  price: number
  interval: string
}

export interface CompanyListItem extends Company {
  plan: CompanyPlanRef | null
  modulesEnabled: number
}

export interface CompanyModuleState {
  moduleId: string
  key: string
  name: string
  description: string | null
  icon: string
  category: string
  isCore: boolean
  isActive: boolean
  isEnabled: boolean
  enabledAt: string | null
}

export interface CompanyDetail {
  company: Company & { plan: Plan | null }
  modules: CompanyModuleState[]
  audit: AuditEntry[]
}

export interface AuditEntry {
  id: string
  action: string
  entityType: string
  entityId: string | null
  entityName: string | null
  details: string | null
  actorEmail: string | null
  createdAt: string
}

export interface DashboardStats {
  companies: { total: number; active: number; pending: number; suspended: number; cancelled: number }
  mrr: number
  adminUsers: number
  activeModules: number
  companiesByPlan: Array<{ planName: string; count: number }>
  growth: Array<{ month: string; count: number }>
  moduleUsage: Array<{ name: string; count: number }>
  recentCompanies: Array<Company & { plan: { name: string } | null }>
  recentAudit: AuditEntry[]
}

export interface PaginatedCompanies {
  items: CompanyListItem[]
  total: number
  page: number
  pageSize: number
}

export type SettingsMap = Record<string, string | number | boolean>

/* ------------------------------------------------------------------ */
/* Helper base                                                         */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  })

  if (res.status === 204) return undefined as T

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const backendMessage =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as Record<string, unknown>).error === 'string'
        ? ((data as Record<string, unknown>).error as string)
        : null
    throw new ApiError(backendMessage ?? `Erro ${res.status} — não foi possível concluir o pedido.`, res.status)
  }

  return data as T
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export async function login(email: string, password: string): Promise<User> {
  const data = await api<{ user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return data.user
}

export async function logout(): Promise<void> {
  await api<void>('/api/auth/logout', { method: 'POST' })
}

export async function getMe(): Promise<User | null> {
  try {
    const data = await api<{ user: User }>('/api/auth/me')
    return data.user
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null
    throw e
  }
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export function getDashboard(): Promise<DashboardStats> {
  return api<DashboardStats>('/api/dashboard')
}

/* ------------------------------------------------------------------ */
/* Empresas                                                            */
/* ------------------------------------------------------------------ */

export interface CompanyPayload {
  name: string
  email: string
  phone?: string
  nuit?: string
  address?: string
  city?: string
  province?: string
  planId?: string | null
  maxUsers?: number
  expiresAt?: string | null
  notes?: string
  status?: CompanyStatus
}

export interface CompanyFilters {
  search?: string
  status?: string
  planId?: string
  page?: number
  pageSize?: number
}

export async function listCompanies(filters: CompanyFilters = {}): Promise<PaginatedCompanies> {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.status && filters.status !== 'ALL') params.set('status', filters.status)
  if (filters.planId && filters.planId !== 'ALL') params.set('planId', filters.planId)
  params.set('page', String(filters.page ?? 1))
  params.set('pageSize', String(filters.pageSize ?? 10))
  const qs = params.toString()
  return api<PaginatedCompanies>(`/api/companies${qs ? `?${qs}` : ''}`)
}

export function getCompany(id: string): Promise<CompanyDetail> {
  return api<CompanyDetail>(`/api/companies/${id}`)
}

export function createCompany(payload: CompanyPayload): Promise<Company> {
  return api<Company>('/api/companies', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateCompany(id: string, payload: Partial<CompanyPayload>): Promise<Company> {
  return api<Company>(`/api/companies/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function deleteCompany(id: string): Promise<void> {
  return api<void>(`/api/companies/${id}`, { method: 'DELETE' })
}

export function toggleCompanyModule(
  id: string,
  moduleId: string,
  isEnabled: boolean
): Promise<{ modules: CompanyModuleState[] }> {
  return api<{ modules: CompanyModuleState[] }>(`/api/companies/${id}/modules`, {
    method: 'PATCH',
    body: JSON.stringify({ moduleId, isEnabled }),
  })
}

export function regenerateKey(id: string, type: KeyType): Promise<{ licenseKey?: string; apiKey?: string }> {
  return api<{ licenseKey?: string; apiKey?: string }>(`/api/companies/${id}/keys`, {
    method: 'POST',
    body: JSON.stringify({ type }),
  })
}

export function setKeyStatus(id: string, type: KeyType, status: KeyStatus): Promise<void> {
  return api<void>(`/api/companies/${id}/keys`, {
    method: 'PATCH',
    body: JSON.stringify({ type, status }),
  })
}

/* ------------------------------------------------------------------ */
/* Planos                                                              */
/* ------------------------------------------------------------------ */

export interface PlanPayload {
  name: string
  description?: string
  price: number
  interval: PlanInterval
  maxUsers: number
  moduleIds: string[]
  isPopular?: boolean
  isActive?: boolean
}

export function listPlans(): Promise<PlanWithModules[]> {
  return api<PlanWithModules[]>('/api/plans')
}

export function createPlan(payload: PlanPayload): Promise<Plan> {
  return api<Plan>('/api/plans', { method: 'POST', body: JSON.stringify(payload) })
}

export function updatePlan(id: string, payload: Partial<PlanPayload>): Promise<Plan> {
  return api<Plan>(`/api/plans/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function deletePlan(id: string): Promise<void> {
  return api<void>(`/api/plans/${id}`, { method: 'DELETE' })
}

/* ------------------------------------------------------------------ */
/* Módulos                                                             */
/* ------------------------------------------------------------------ */

export interface ModulePayload {
  name: string
  key?: string
  description?: string
  icon?: string
  category?: string
  isActive?: boolean
  sortOrder?: number
}

export function listModules(): Promise<ModuleWithCounts[]> {
  return api<ModuleWithCounts[]>('/api/modules')
}

export function createModule(payload: ModulePayload): Promise<ModuleWithCounts> {
  return api<ModuleWithCounts>('/api/modules', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateModule(id: string, payload: Partial<ModulePayload>): Promise<ModuleWithCounts> {
  return api<ModuleWithCounts>(`/api/modules/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function deleteModule(id: string): Promise<void> {
  return api<void>(`/api/modules/${id}`, { method: 'DELETE' })
}

/* ------------------------------------------------------------------ */
/* Utilizadores do painel                                              */
/* ------------------------------------------------------------------ */

export function listUsers(): Promise<User[]> {
  return api<User[]>('/api/users')
}

export function createUser(payload: { name: string; email: string; password: string; role: string }): Promise<User> {
  return api<User>('/api/users', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateUser(
  id: string,
  payload: { name?: string; role?: string; isActive?: boolean; password?: string }
): Promise<User> {
  return api<User>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function deleteUser(id: string): Promise<void> {
  return api<void>(`/api/users/${id}`, { method: 'DELETE' })
}

/* ------------------------------------------------------------------ */
/* Auditoria                                                           */
/* ------------------------------------------------------------------ */

export interface AuditFilters {
  action?: string
  entityType?: string
  search?: string
  limit?: number
}

export async function listAudit(filters: AuditFilters = {}): Promise<{ items: AuditEntry[] }> {
  const params = new URLSearchParams()
  if (filters.action && filters.action !== 'ALL') params.set('action', filters.action)
  if (filters.entityType && filters.entityType !== 'ALL') params.set('entityType', filters.entityType)
  if (filters.search) params.set('search', filters.search)
  if (filters.limit) params.set('limit', String(filters.limit))
  const qs = params.toString()
  return api<{ items: AuditEntry[] }>(`/api/audit${qs ? `?${qs}` : ''}`)
}

/* ------------------------------------------------------------------ */
/* Configurações                                                       */
/* ------------------------------------------------------------------ */

export function getSettings(): Promise<SettingsMap> {
  return api<SettingsMap>('/api/settings')
}

export function updateSettings(
  patch: Record<string, string | number | boolean>
): Promise<{ settings: SettingsMap }> {
  return api<{ settings: SettingsMap }>('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}
