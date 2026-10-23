'use client'

/**
 * AdminShell — estrutura principal do painel (sidebar + topbar + conteúdo).
 * Navegação por estado (SPA), sidebar escura fixa em md+ e Sheet em mobile.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Blocks,
  Building2,
  ChevronsUpDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  UserCog,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { User } from '@/lib/bms-api'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'
import { DashboardView } from './dashboard-view'
import { CompaniesView } from './companies-view'
import { PlansView } from './plans-view'
import { ModulesView } from './modules-view'
import { UsersView } from './users-view'
import { AuditView } from './audit-view'
import { SettingsView } from './settings-view'
import { Logo, ThemeToggle, roleLabel, type SectionId } from './shared'

const NAV_GROUPS: Array<{
  label: string
  items: Array<{ id: SectionId; label: string; icon: LucideIcon }>
}> = [
  {
    label: 'Visão geral',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Gestão',
    items: [
      { id: 'companies', label: 'Empresas', icon: Building2 },
      { id: 'plans', label: 'Planos', icon: CreditCard },
      { id: 'modules', label: 'Módulos', icon: Blocks },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { id: 'users', label: 'Utilizadores', icon: UserCog },
      { id: 'audit', label: 'Auditoria', icon: ScrollText },
      { id: 'settings', label: 'Configurações', icon: Settings },
    ],
  },
]

const SECTION_META: Record<SectionId, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Visão geral da plataforma em tempo real' },
  companies: { title: 'Empresas', subtitle: 'Gestão de empresas clientes e chaves de licença' },
  plans: { title: 'Planos', subtitle: 'Planos de subscrição e módulos incluídos' },
  modules: { title: 'Módulos', subtitle: 'Módulos do sistema BMS' },
  users: { title: 'Utilizadores', subtitle: 'Equipa com acesso ao painel administrativo' },
  audit: { title: 'Auditoria', subtitle: 'Registo de acções efectuadas no sistema' },
  settings: { title: 'Configurações', subtitle: 'Parâmetros gerais da plataforma' },
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { id: SectionId; label: string; icon: LucideIcon }
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60',
        active
          ? 'bg-emerald-600/10 font-medium text-emerald-500'
          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
      )}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-500" aria-hidden />
      ) : null}
      <Icon className="size-[18px] shrink-0" aria-hidden />
      <span className="truncate">{item.label}</span>
    </button>
  )
}

function NavGroups({
  section,
  onSelect,
}: {
  section: SectionId
  onSelect: (id: SectionId) => void
}) {
  return (
    <div className="space-y-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavButton key={item.id} item={item} active={section === item.id} onClick={() => onSelect(item.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SidebarUser({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="border-t border-zinc-800 p-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-9 border border-zinc-800">
          <AvatarFallback className="bg-emerald-600 text-xs font-semibold text-white">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">{user.name}</p>
          <p className="truncate text-xs text-zinc-500">{roleLabel(user.role)}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-rose-400"
          aria-label="Terminar sessão"
          title="Terminar sessão"
          onClick={onLogout}
        >
          <LogOut className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}

export function AdminShell({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [section, setSection] = useState<SectionId>('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const meta = SECTION_META[section]

  function selectSection(id: SectionId) {
    setSection(id)
    setMobileNavOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar fixa (md+) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-zinc-800 px-5">
          <Logo size="sm" dark />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin" aria-label="Navegação principal">
          <NavGroups section={section} onSelect={selectSection} />
        </nav>
        <SidebarUser user={user} onLogout={onLogout} />
      </aside>

      {/* Coluna principal */}
      <div className="flex min-h-screen flex-col md:pl-64">
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-2 px-4 sm:gap-3 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="size-11 md:hidden"
              aria-label="Abrir menu de navegação"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-5" aria-hidden />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold leading-tight tracking-tight sm:text-lg">
                {meta.title}
              </h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">{meta.subtitle}</p>
            </div>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="size-11 gap-2 px-1.5 sm:w-auto sm:px-2"
                  aria-label="Menu do utilizador"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-emerald-600 text-xs font-semibold text-white">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden min-w-0 flex-col items-start leading-tight md:flex">
                    <span className="max-w-36 truncate text-sm font-medium">{user.name}</span>
                    <span className="text-[11px] text-muted-foreground">{roleLabel(user.role)}</span>
                  </span>
                  <ChevronsUpDown className="hidden size-4 text-muted-foreground md:block" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="truncate">{user.name}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={onLogout}
                  className="cursor-pointer"
                >
                  <LogOut className="size-4" aria-hidden />
                  Terminar sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {section === 'dashboard' && <DashboardView onNavigate={selectSection} />}
            {section === 'companies' && <CompaniesView user={user} />}
            {section === 'plans' && <PlansView />}
            {section === 'modules' && <ModulesView />}
            {section === 'users' && <UsersView currentUser={user} />}
            {section === 'audit' && <AuditView />}
            {section === 'settings' && <SettingsView />}
          </motion.div>
        </main>

        <footer className="mt-auto border-t">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-1.5 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
            <p>Carsai BMS Admin v1.0 · © 2025 CarsaiDev — Uma linha, uma solução. 🇲🇿</p>
            <p>Desenvolvido com Next.js + Prisma</p>
          </div>
        </footer>
      </div>

      {/* Navegação mobile */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-72 border-r border-zinc-800 bg-zinc-950 p-0 text-zinc-300 [&>button]:text-zinc-400"
        >
          <SheetHeader className="border-b border-zinc-800 px-5 py-4">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <Logo size="sm" dark />
          </SheetHeader>
          <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin" aria-label="Navegação principal">
            <NavGroups section={section} onSelect={selectSection} />
          </nav>
          <SidebarUser user={user} onLogout={onLogout} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
