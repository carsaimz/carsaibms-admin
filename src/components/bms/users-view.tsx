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
import { useI18n } from '@/lib/i18n'
import { ConfirmDialog, EmptyState, PageHeader, RoleBadge, TableSkeleton, useLabels } from './shared'

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] as const

export function UsersView({ currentUser }: { currentUser: User }) {
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN'

  const [users, setUsers] = useState<User[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [toDelete, setToDelete] = useState<User | null>(null)
  const { t } = useI18n()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await listUsers())
    } catch (e) {
      setError(e instanceof Error ? e.message : t('users.errors.load'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  async function handleToggleActive(u: User, active: boolean) {
    if (busyId) return
    setBusyId(u.id)
    try {
      await updateUser(u.id, { isActive: active })
      setUsers((prev) => prev?.map((x) => (x.id === u.id ? { ...x, isActive: active } : x)) ?? prev)
      toast.success(
        active
          ? t('users.toasts.activated', { name: u.name })
          : t('users.toasts.deactivated', { name: u.name })
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('users.toasts.updateError'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    try {
      await deleteUser(toDelete.id)
      toast.success(t('users.toasts.deleted', { name: toDelete.name }))
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('users.toasts.deleteError'))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('users.title')} description={t('users.subtitle')}>
        {isSuperAdmin ? (
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="h-11"
          >
            <Plus className="size-4" aria-hidden />
            {t('users.newUser')}
          </Button>
        ) : null}
      </PageHeader>

      <Card className="py-0">
        <CardContent className="p-0 pb-4">
          {error && !loading ? (
            <EmptyState
              icon={CircleAlert}
              title={t('users.errors.loadTitle')}
              description={error}
              action={
                <Button variant="outline" onClick={() => void load()}>
                  <RefreshCw className="size-4" aria-hidden />
                  {t('common.retry')}
                </Button>
              }
            />
          ) : !loading && users && users.length === 0 ? (
            <EmptyState icon={UserCog} title={t('users.empty.title')} description={t('users.empty.description')} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">{t('users.table.user')}</TableHead>
                  <TableHead>{t('users.table.role')}</TableHead>
                  <TableHead>{t('users.table.status')}</TableHead>
                  <TableHead>{t('users.table.lastLogin')}</TableHead>
                  <TableHead>{t('users.table.createdAt')}</TableHead>
                  {isSuperAdmin ? <TableHead className="pr-4 text-right">{t('common.actions')}</TableHead> : null}
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
                                {isSelf ? <span className="ml-2 text-xs text-muted-foreground">{t('users.self')}</span> : null}
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
                            aria-label={
                              u.isActive
                                ? t('users.toggleDeactivate', { name: u.name })
                                : t('users.toggleActivate', { name: u.name })
                            }
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
                                aria-label={t('users.editAria', { name: u.name })}
                                title={t('common.edit')}
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
                                aria-label={t('users.deleteAria', { name: u.name })}
                                title={isSelf ? t('users.deleteSelfTitle') : t('common.delete')}
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
        title={t('users.deleteConfirmTitle', { name: toDelete?.name ?? '' })}
        description={t('users.deleteConfirmDesc')}
        confirmLabel={t('common.delete')}
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
  const { t } = useI18n()
  const L = useLabels()

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(user ? { name: user.name, email: user.email, password: '', role: user.role } : EMPTY_USER_FORM)
  }, [open, user])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim() || !form.email.trim()) {
      setError(t('users.form.errors.nameEmailRequired'))
      return
    }
    if (!isEdit && form.password.length < 8) {
      setError(t('users.form.errors.passwordShort'))
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
      setError(err instanceof Error ? err.message : t('users.form.errors.save'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-thin sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('users.form.editTitle') : t('users.newUser')}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('users.form.editDescription')
              : t('users.form.createDescription')}
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
              {t('users.form.name')} <span className="text-rose-600 dark:text-rose-400">*</span>
            </Label>
            <Input
              id="user-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={t('users.form.namePlaceholder')}
              disabled={saving}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">
              {t('users.form.email')} <span className="text-rose-600 dark:text-rose-400">*</span>
            </Label>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder={t('users.form.emailPlaceholder')}
              disabled={saving || isEdit}
              required
            />
            {isEdit ? <p className="text-xs text-muted-foreground">{t('users.form.emailHint')}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-password">
              {t('users.form.password')}{' '}
              {isEdit ? <span className="text-xs font-normal text-muted-foreground">{t('users.form.passwordKeepHint')}</span> : (
                <span className="text-rose-600 dark:text-rose-400">*</span>
              )}
            </Label>
            <Input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder={t('users.form.passwordPlaceholder')}
              autoComplete={isEdit ? 'new-password' : 'new-password'}
              disabled={saving}
              required={!isEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-role">{t('users.form.role')}</Label>
            <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))} disabled={saving}>
              <SelectTrigger id="user-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {L.role(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {isEdit ? t('users.form.saveChanges') : t('users.form.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
