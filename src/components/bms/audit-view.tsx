'use client'

/**
 * AuditView — registo de auditoria com filtros por acção, entidade e pesquisa.
 */

import { useCallback, useEffect, useState } from 'react'
import { CircleAlert, RefreshCw, ScrollText, Search } from 'lucide-react'

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
import { listAudit } from '@/lib/bms-api'
import type { AuditEntry } from '@/lib/bms-api'
import { formatDateTime, formatRelative } from '@/lib/format'
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  AuditBadge,
  auditActionLabel,
  EmptyState,
  entityLabel,
  PageHeader,
  TableSkeleton,
} from './shared'

const AUDIT_LIMIT = 50

export function AuditView() {
  const [action, setAction] = useState('ALL')
  const [entityType, setEntityType] = useState('ALL')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [items, setItems] = useState<AuditEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listAudit({ action, entityType, search, limit: AUDIT_LIMIT })
      setItems(res.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar a auditoria.')
    } finally {
      setLoading(false)
    }
  }, [action, entityType, search])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <PageHeader title="Auditoria" description="Registo de acções efectuadas no sistema" />

      {/* Filtros */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_220px_200px]">
        <div className="space-y-1.5">
          <Label htmlFor="audit-search" className="text-xs text-muted-foreground">
            Pesquisar
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="audit-search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Entidade, detalhes ou actor…"
              className="h-11 pl-10"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-action" className="text-xs text-muted-foreground">
            Acção
          </Label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger id="audit-action" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as acções</SelectItem>
              {AUDIT_ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {auditActionLabel(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-entity" className="text-xs text-muted-foreground">
            Entidade
          </Label>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger id="audit-entity" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as entidades</SelectItem>
              {AUDIT_ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {entityLabel(t)}
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
              title="Erro ao carregar a auditoria"
              description={error}
              action={
                <Button variant="outline" onClick={() => void load()}>
                  <RefreshCw className="size-4" aria-hidden />
                  Tentar novamente
                </Button>
              }
            />
          ) : !loading && items && items.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="Nenhum registo encontrado"
              description="Ajuste os filtros para ver mais resultados."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setAction('ALL')
                    setEntityType('ALL')
                    setSearchInput('')
                    setSearch('')
                  }}
                >
                  Limpar filtros
                </Button>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">Acção</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead className="pr-4">Quando</TableHead>
                  </TableRow>
                </TableHeader>
                {loading ? (
                  <TableSkeleton rows={8} cols={5} />
                ) : (
                  <TableBody>
                    {items?.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="pl-4">
                          <AuditBadge action={a.action} />
                        </TableCell>
                        <TableCell>
                          <span className="block text-sm font-medium">{a.entityName ?? '—'}</span>
                          <span className="block text-xs text-muted-foreground">{entityLabel(a.entityType)}</span>
                        </TableCell>
                        <TableCell className="max-w-72">
                          <span className="block truncate text-sm text-muted-foreground" title={a.details ?? undefined}>
                            {a.details ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <code className="font-mono text-xs text-muted-foreground">{a.actorEmail ?? '—'}</code>
                        </TableCell>
                        <TableCell className="pr-4 text-sm text-muted-foreground">
                          <span title={formatDateTime(a.createdAt)}>{formatRelative(a.createdAt)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                )}
              </Table>
              {!loading && items ? (
                <p className="px-4 pt-3 text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? 'registo' : 'registos'} (limite de {AUDIT_LIMIT} por consulta)
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
