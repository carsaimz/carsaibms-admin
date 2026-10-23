'use client'

/**
 * UsersView — gestão de utilizadores do painel.
 * Mutações (criar, editar, activar/desactivar, eliminar) só para SUPER_ADMIN.
 */

import { useCallback, useEffect, useState } from 'react'
import { CircleAlert, Loader2, Pencil, Plus, RefreshCw, Trash2, UserCog } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createUser, deleteUser, listUsers, updateUser } from '@/lib/bms-api'
import type { User } from '@/lib/bms-api'
import { formatDate, formatRelative, initials } from '@/lib/format'
import { ConfirmDialog, EmptyState, PageHeader, RoleBadge, TableSkeleton } from './shared'

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'SUPPORT', label: 'Suporte' },
]

export function UsersView({ currentUser }: { currentUser: User }) {
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN'

  const [users, setUsers] = useState<User[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [toDelete, setToDelete] = useState<User | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await listUsers())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar utilizadores.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleToggleActive(u: User, active: boolean) {
    if (busyId) return
    setBusyId(u.id)
    try {
      await updateUser(u.id, { isActive: active })
      setUsers((prev) => prev?.map((x) => (x.id === u.id ? { ...x, isActive: active } : x)) ?? prev)
      toast.success(active ? `Utilizador "${u.name}" activado.` : `Utilizador "${u.name}" desactivado.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao actualizar o utilizador.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    try {
      await deleteUser(toDelete.id)
      toast.success(`Utilizador "${toDelete.name}" eliminado.`)
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao eliminar o utilizador.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Utilizadores" description="Equipa com acesso ao painel administrativo">
        {isSuperAdmin ? (
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="h-11"
          >
            <Plus className="size-4" aria-hidden />
            Novo utilizador
          </Button>
        ) : null}
      </PageHeader>

      <Card className="py-0">
        <CardContent className="p-0 pb-4">
          {error && !loading ? (
            <EmptyState
              icon={CircleAlert}
              title="Erro ao carregar utilizadores"
              description={error}
              action={
                <Button variant="outline" onClick={() => void load()}>
                  <RefreshCw className="size-4" aria-hidden />
                  Tentar novamente
                </Button>
              }
            />
          ) : !loading && users && users.length === 0 ? (
            <EmptyState icon={UserCog} title="Nenhum utilizador" description="Crie o primeiro utilizador do painel." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Utilizador</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último login</TableHead>
                  <TableHead>Criado em</TableHead>
                  {isSuperAdmin ? <TableHead className="pr-4 text-right">Acções</TableHead> : null}
                </TableRow>
              </TableHeader>
              {loading ? (
                <TableSkeleton rows={4} cols={isSuperAdmin ? 6 : 5} />
              ) : (
                <TableBody>
                  {users?.map((u) => {
                    const isSelf = u.id === currentUser.id
                    const canEdit = isSuperAdmin && !isSelf
                    return (
                      <TableRow key={u.id} className={u.isActive ? undefined : 'opacity-60'}>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9">
                              <AvatarFallback className="bg-emerald-600/15 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                {initials(u.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {u.name}
                                {isSelf ? <span className="ml-2 text-xs text-muted-foreground">(você)</span> : null}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={u.role} />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={u.isActive}
                            disabled={!canEdit || busyId === u.id}
                            onCheckedChange={(v) => void handleToggleActive(u, v)}
                            aria-label={u.isActive ? `Desactivar ${u.name}` : `Activar ${u.name}`}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.lastLoginAt ? (
                            <span title={formatDate(u.lastLoginAt)}>{formatRelative(u.lastLoginAt)}</span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                        {isSuperAdmin ? (
                          <TableCell className="pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-9"
                                aria-label={`Editar ${u.name}`}
                                title="Editar"
                                disabled={!canEdit}
                                onClick={() => {
                                  setEditing(u)
                                  setFormOpen(true)
                                }}
                              >
                                <Pencil className="size-4" aria-hidden />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-9 text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400"
                                aria-label={`Eliminar ${u.name}`}
                                title={isSelf ? 'Não pode eliminar a sua própria conta' : 'Eliminar'}
                                disabled={isSelf}
                                onClick={() => setToDelete(u)}
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </Button>
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    )
                  })}
                </TableBody>
              )}
            </Table>
          )}
        </CardContent>
      </Card>

      {isSuperAdmin ? (
        <UserFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          user={editing}
          onSaved={() => void load()}
        />
      ) : null}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Eliminar utilizador "${toDelete?.name ?? ''}"?`}
        description="O utilizador perderá o acesso ao painel imediatamente. Esta acção não pode ser revertida."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Diálogo de utilizador                                               */
/* ------------------------------------------------------------------ */

interface UserFormState {
  name: string
  email: string
  password: string
  role: string
}

const EMPTY_USER_FORM: UserFormState = { name: '', email: '', password: '', role: 'SUPPORT' }

function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onSaved: () => void
}) {
  const isEdit = Boolean(user)
  const [form, setForm] = useState<UserFormState>(EMPTY_USER_FORM)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(user ? { name: user.name, email: user.email, password: '', role: user.role } : EMPTY_USER_FORM)
  }, [open, user])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim() || !form.email.trim()) {
      setError('O nome e o email são obrigatórios.')
      return
    }
    if (!isEdit && form.password.length < 8) {
      setError('A password deve ter pelo menos 8 caracteres.')
      return
    }
    setSaving(true)
    try {
      if (isEdit && user) {
        await updateUser(user.id, {
          name: form.name.trim(),
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        })
      } else {
        await createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        })
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível guardar o utilizador.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-thin sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar utilizador' : 'Novo utilizador'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualize os dados do utilizador. Deixe a password vazia para a manter.'
              : 'Crie uma conta de acesso ao painel administrativo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error ? (
            <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-400" role="alert">
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="user-name">
              Nome <span className="text-rose-600 dark:text-rose-400">*</span>
            </Label>
            <Input
              id="user-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Gestor de Contas"
              disabled={saving}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">
              Email <span className="text-rose-600 dark:text-rose-400">*</span>
            </Label>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="nome@carsai.co.mz"
              disabled={saving || isEdit}
              required
            />
            {isEdit ? <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-password">
              Password{' '}
              {isEdit ? <span className="text-xs font-normal text-muted-foreground">(vazia = manter actual)</span> : (
                <span className="text-rose-600 dark:text-rose-400">*</span>
              )}
            </Label>
            <Input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Mínimo 8 caracteres"
              autoComplete={isEdit ? 'new-password' : 'new-password'}
              disabled={saving}
              required={!isEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-role">Papel</Label>
            <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))} disabled={saving}>
              <SelectTrigger id="user-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {isEdit ? 'Guardar alterações' : 'Criar utilizador'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
