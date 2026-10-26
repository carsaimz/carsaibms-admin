'use client'

/**
 * CompaniesView — gestão de empresas clientes.
 * Filtros (pesquisa, estado, plano) + tabela + paginação + diálogos.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Building2,
  CircleAlert,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  deleteCompany,
  listCompanies,
  listModules,
  listPlans,
} from '@/lib/bms-api'
import type { Company, CompanyListItem, Plan, User } from '@/lib/bms-api'
import { formatDate } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import {
  COMPANY_STATUSES,
  ConfirmDialog,
  CopyKeyButton,
  EmptyState,
  maskKey,
  PageHeader,
  StatusBadge,
  TablePagination,
  TableSkeleton,
  useLabels,
} from './shared'
import { CompanyFormDialog } from './company-form-dialog'
import { CompanyDetailDialog } from './company-detail-dialog'

const PAGE_SIZE = 10

export function CompaniesView({ user }: { user: User }) {
  const isSuperAdmin = user.role === 'SUPER_ADMIN'
  const { t } = useI18n()
  const L = useLabels()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [planId, setPlanId] = useState('ALL')
  const [page, setPage] = useState(1)

  const [data, setData] = useState<CompanyListItem[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [plans, setPlans] = useState<Plan[]>([])
  const [modulesTotal, setModulesTotal] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [toDelete, setToDelete] = useState<CompanyListItem | null>(null)

  // Pesquisa com debounce
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const loadCompanies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listCompanies({ search, status, planId, page, pageSize: PAGE_SIZE })
      setData(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('companiesPage.loadError'))
    } finally {
      setLoading(false)
    }
  }, [search, status, planId, page, t])

  useEffect(() => {
    void loadCompanies()
  }, [loadCompanies])

  // Planos e módulos para filtros/colunas (carregamento único)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [ps, ms] = await Promise.all([listPlans(), listModules()])
        if (!cancelled) {
          setPlans(ps)
          setModulesTotal(ms.length)
        }
      } catch {
        // Filtros secundários — silencioso; a tabela principal trata erros
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(company: CompanyListItem) {
    setEditing(company)
    setFormOpen(true)
  }

  function openDetail(company: CompanyListItem) {
    setDetailId(company.id)
    setDetailOpen(true)
  }

  async function handleDelete() {
    if (!toDelete) return
    try {
      await deleteCompany(toDelete.id)
      toast.success(t('companiesPage.deletedToast', { name: toDelete.name }))
      void loadCompanies()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('companiesPage.deleteErrorToast'))
    }
  }

  function resetFilters() {
    setSearchInput('')
    setSearch('')
    setStatus('ALL')
    setPlanId('ALL')
    setPage(1)
  }

  const hasFilters = Boolean(search) || status !== 'ALL' || planId !== 'ALL'

  return (
    <div className="space-y-6">
      <PageHeader title={t('companiesPage.title')} description={t('companiesPage.subtitle')}>
        <Button onClick={openCreate} className="h-11">
          <Plus className="size-4" aria-hidden />
          {t('companiesPage.newCompany')}
        </Button>
      </PageHeader>

      {/* Filtros */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_200px]">
        <div className="space-y-1.5">
          <Label htmlFor="companies-search" className="text-xs text-muted-foreground">
            {t('common.search')}
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="companies-search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('companiesPage.searchPlaceholder')}
              className="h-11 pl-10"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="companies-status" className="text-xs text-muted-foreground">
            {t('companiesPage.statusLabel')}
          </Label>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
            <SelectTrigger id="companies-status" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('companiesPage.allStatuses')}</SelectItem>
              {COMPANY_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {L.status(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="companies-plan" className="text-xs text-muted-foreground">
            {t('companiesPage.planLabel')}
          </Label>
          <Select value={planId} onValueChange={(v) => { setPlanId(v); setPage(1) }}>
            <SelectTrigger id="companies-plan" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('companiesPage.allPlans')}</SelectItem>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <Card className="py-0">
        <CardContent className="p-0 pb-4">
          {error && !loading ? (
            <EmptyState
              icon={CircleAlert}
              title={t('companiesPage.loadErrorTitle')}
              description={error}
              action={
                <Button variant="outline" onClick={() => void loadCompanies()}>
                  <RefreshCw className="size-4" aria-hidden />
                  {t('common.retry')}
                </Button>
              }
            />
          ) : !loading && data && data.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={hasFilters ? t('companiesPage.emptyFilteredTitle') : t('companiesPage.emptyAllTitle')}
              description={
                hasFilters
                  ? t('companiesPage.emptyFilteredDesc')
                  : t('companiesPage.emptyAllDesc')
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={resetFilters}>
                    {t('common.clearFilters')}
                  </Button>
                ) : (
                  <Button onClick={openCreate}>
                    <Plus className="size-4" aria-hidden />
                    {t('companiesPage.newCompany')}
                  </Button>
                )
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">{t('companiesPage.table.company')}</TableHead>
                    <TableHead>{t('companiesPage.table.plan')}</TableHead>
                    <TableHead>{t('companiesPage.table.status')}</TableHead>
                    <TableHead className="text-center">{t('companiesPage.table.modules')}</TableHead>
                    <TableHead>{t('companiesPage.table.keys')}</TableHead>
                    <TableHead>{t('companiesPage.table.createdAt')}</TableHead>
                    <TableHead className="pr-4 text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                {loading ? (
                  <TableSkeleton rows={6} cols={7} />
                ) : (
                  <TableBody>
                    {data?.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="max-w-56 pl-4">
                          <button
                            type="button"
                            className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => openDetail(c)}
                            aria-label={t('companiesPage.viewDetailsOf', { name: c.name })}
                          >
                            <span className="block truncate font-medium hover:text-emerald-700 dark:hover:text-emerald-400">
                              {c.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">{c.email}</span>
                          </button>
                        </TableCell>
                        <TableCell>
                          {c.plan ? (
                            <Badge variant="outline" className="max-w-36 truncate px-2 py-0.5">
                              {c.plan.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {c.modulesEnabled}
                          {modulesTotal ? `/${modulesTotal}` : ''}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                              <code className="font-mono text-[11px] text-muted-foreground">{maskKey(c.licenseKey)}</code>
                              <CopyKeyButton value={c.licenseKey} label={t('companiesPage.copyLicenseKey')} />
                            </div>
                            <div className="flex items-center gap-1">
                              <code className="font-mono text-[11px] text-muted-foreground">{maskKey(c.apiKey)}</code>
                              <CopyKeyButton value={c.apiKey} label={t('companiesPage.copyApiKey')} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                        <TableCell className="pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-9"
                              aria-label={t('companiesPage.viewDetailsOf', { name: c.name })}
                              title={t('common.viewDetails')}
                              onClick={() => openDetail(c)}
                            >
                              <Eye className="size-4" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-9"
                              aria-label={t('companiesPage.editOf', { name: c.name })}
                              title={t('common.edit')}
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="size-4" aria-hidden />
                            </Button>
                            {isSuperAdmin ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-9 text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400"
                                aria-label={t('companiesPage.deleteOf', { name: c.name })}
                                title={t('common.delete')}
                                onClick={() => setToDelete(c)}
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                )}
              </Table>
              {!loading && (
                <div className="px-4 pt-2">
                  <TablePagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={total}
                    onPageChange={setPage}
                    unit={t('companiesPage.unit')}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Diálogos */}
      <CompanyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        company={editing}
        plans={plans}
        onSaved={() => void loadCompanies()}
      />

      <CompanyDetailDialog
        companyId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onChanged={() => void loadCompanies()}
        onEdit={(company) => {
          setDetailOpen(false)
          setEditing(company)
          setFormOpen(true)
        }}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('companiesPage.deleteTitle', { name: toDelete?.name ?? '' })}
        description={t('companiesPage.deleteDesc')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </div>
  )
}
