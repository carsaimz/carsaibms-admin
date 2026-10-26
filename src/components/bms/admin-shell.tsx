'use client'

/**
 * AdminShell — estrutura principal do painel (sidebar + topbar + conteúdo).
 * Navegação por estado (SPA), sidebar escura fixa em md+ e Sheet em mobile.
 * Todos os textos via i18n (pt-MZ / en).
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
  Radar,
  ReceiptText,
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
import { useI18n } from '@/lib/i18n'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'
import { DashboardView } from './dashboard-view'
import { CompaniesView } from './companies-view'
import { PlansView } from './plans-view'
import { ModulesView } from './modules-view'
import { BillingView } from './billing-view'
import { UsersView } from './users-view'
import { AuditView } from './audit-view'
import { InstancesView } from './instances-view'
import { SettingsView } from './settings-view'
import { Logo, ThemeToggle, LanguageToggle, useLabels, type SectionId } from './shared'

const NAV_GROUPS: Array<{
  key: 'overview' | 'management' | 'system'
  items: Array<{ id: SectionId; icon: LucideIcon }>
}> = [
  {
    key: 'overview',
    items: [{ id: 'dashboard', icon: LayoutDashboard }],
  },
  {
    key: 'management',
    items: [
      { id: 'companies', icon: Building2 },
      { id: 'plans', icon: CreditCard },
      { id: 'modules', icon: Blocks },
      { id: 'billing', icon: ReceiptText },
    ],
  },
  {
    key: 'system',
    items: [
      { id: 'users', icon: UserCog },
      { id: 'audit', icon: ScrollText },
      { id: 'instances', icon: Radar },
      { id: 'settings', icon: Settings },
    ],
  },
]

function sectionLabel(t: (p: string) => string, id: SectionId, part: 'title' | 'subtitle'): string {
  return t(`shell.sections.${id}.${part}`)
}

function NavButton({
  item,
  label,
  active,
  onClick,
}: {
  item: { id: SectionId; icon: LucideIcon }
  label: string
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
      <span className="truncate">{label}</span>
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
  const { t } = useI18n()
  return (
    <div className="space-y-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.key}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
            {t(`shell.groups.${group.key}`)}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                label={sectionLabel(t, item.id, 'title')}
                active={section === item.id}
                onClick={() => onSelect(item.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SidebarUser({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { t } = useI18n()
  const { role } = useLabels()
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
          <p className="truncate text-xs text-zinc-500">{role(user.role)}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-rose-400"
          aria-label={t('shell.logout')}
          title={t('shell.logout')}
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
  const { t } = useI18n()
  const { role } = useLabels()

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
        <nav className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin" aria-label={t('shell.navAria')}>
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
              aria-label={t('shell.openNav')}
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-5" aria-hidden />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold leading-tight tracking-tight sm:text-lg">
                {sectionLabel(t, section, 'title')}
              </h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {sectionLabel(t, section, 'subtitle')}
              </p>
            </div>
            <LanguageToggle />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="size-11 gap-2 px-1.5 sm:w-auto sm:px-2"
                  aria-label={t('shell.userMenu')}
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-emerald-600 text-xs font-semibold text-white">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden min-w-0 flex-col items-start leading-tight md:flex">
                    <span className="max-w-36 truncate text-sm font-medium">{user.name}</span>
                    <span className="text-[11px] text-muted-foreground">{role(user.role)}</span>
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
                  {t('shell.logout')}
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
            {section === 'billing' && <BillingView />}
            {section === 'users' && <UsersView currentUser={user} />}
            {section === 'audit' && <AuditView />}
            {section === 'instances' && <InstancesView />}
            {section === 'settings' && <SettingsView />}
          </motion.div>
        </main>

        <footer className="mt-auto border-t">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-1.5 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
            <p>{t('brand.footer')}</p>
            <p>{t('brand.developedWith')}</p>
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
            <SheetTitle className="sr-only">{t('shell.mobileNavTitle')}</SheetTitle>
            <Logo size="sm" dark />
          </SheetHeader>
          <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin" aria-label={t('shell.navAria')}>
            <NavGroups section={section} onSelect={selectSection} />
          </nav>
          <SidebarUser user={user} onLogout={onLogout} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
