/**
 * Seed — Carsai BMS Admin
 * CarsaiDev — Uma linha, uma solução. 🇲🇿
 *
 * Popula a base de dados com: utilizadores do painel, módulos do sistema,
 * planos de subscrição, empresas de demonstração, configurações e auditoria.
 *
 * Executar: bun prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/* ------------------------------------------------------------------ */
/* Utilitários de geração                                              */
/* ------------------------------------------------------------------ */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const HEX = '0123456789abcdef'

function code(len: number, alphabet = CODE_ALPHABET): string {
  let out = ''
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

function genLicenseKey(): string {
  return `CARSAI-LIC-${code(4)}-${code(4)}-${code(4)}`
}

function genApiKey(): string {
  return `sk_live_${code(32, HEX)}`
}

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function daysAgo(n: number, hourOffset = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(9 + (hourOffset % 9), (hourOffset * 7) % 60, 0, 0)
  return d
}

/* ------------------------------------------------------------------ */
/* Dados                                                               */
/* ------------------------------------------------------------------ */

const MODULES = [
  { key: 'dashboard', name: 'Dashboard', description: 'Métricas e indicadores em tempo real', icon: 'LayoutDashboard', category: 'CORE', isCore: true },
  { key: 'pos', name: 'Ponto de Venda (POS)', description: 'Interface touch-friendly com carrinho rápido, leitor de código de barras e múltiplos métodos de pagamento', icon: 'ShoppingCart', category: 'POS', isCore: false },
  { key: 'products', name: 'Produtos', description: 'Gestão completa de produtos com traduções e imagens', icon: 'Package', category: 'VENDAS', isCore: false },
  { key: 'services', name: 'Serviços', description: 'Catálogo e agendamento de serviços', icon: 'Wrench', category: 'VENDAS', isCore: false },
  { key: 'categories', name: 'Categorias', description: 'Hierarquia de categorias para produtos e serviços', icon: 'FolderTree', category: 'VENDAS', isCore: false },
  { key: 'orders', name: 'Pedidos', description: 'Gestão e actualização de pedidos de clientes', icon: 'ClipboardList', category: 'VENDAS', isCore: false },
  { key: 'sales', name: 'Vendas', description: 'Histórico completo de vendas da empresa', icon: 'TrendingUp', category: 'VENDAS', isCore: false },
  { key: 'purchases', name: 'Compras', description: 'Pedidos de compra a fornecedores', icon: 'ShoppingBag', category: 'INVENTÁRIO', isCore: false },
  { key: 'suppliers', name: 'Fornecedores', description: 'Cadastro e histórico de fornecedores', icon: 'Truck', category: 'INVENTÁRIO', isCore: false },
  { key: 'stock', name: 'Stock & Armazéns', description: 'Gestão de stock com múltiplos armazéns e movimentações', icon: 'Warehouse', category: 'INVENTÁRIO', isCore: false },
  { key: 'customers', name: 'Clientes', description: 'Cadastro de clientes e histórico de atendimento', icon: 'Users', category: 'CRM', isCore: false },
  { key: 'employees', name: 'Funcionários', description: 'Cadastro de funcionários e permissões', icon: 'UserCog', category: 'RH', isCore: false },
  { key: 'roles', name: 'Cargos & Permissões', description: 'Criação de cargos personalizados e permissões granulares', icon: 'ShieldCheck', category: 'RH', isCore: false },
  { key: 'tickets', name: 'Tickets de Suporte', description: 'Sistema de suporte com respostas e acompanhamento', icon: 'LifeBuoy', category: 'SUPORTE', isCore: false },
  { key: 'finance', name: 'Gestão Financeira', description: 'Contas a pagar e a receber, fluxo de caixa e faturação', icon: 'Wallet', category: 'FINANÇAS', isCore: false },
  { key: 'reports', name: 'Relatórios & Estatísticas', description: 'Relatórios personalizáveis em PDF/Excel com gráficos', icon: 'BarChart3', category: 'FINANÇAS', isCore: false },
  { key: 'posts', name: 'Blog & Publicações', description: 'Blog com editor de texto rico e categorias', icon: 'Newspaper', category: 'CONTEÚDO', isCore: false },
  { key: 'website', name: 'Website Público', description: 'Website institucional com catálogo público e formulários de contacto', icon: 'Globe', category: 'WEBSITE', isCore: false },
  { key: 'api', name: 'API & Integrações', description: 'Acesso à API REST para integrações externas', icon: 'KeyRound', category: 'INTEGRAÇÕES', isCore: false },
]

const PLANS: Array<{
  name: string
  slug: string
  description: string
  price: number
  interval: string
  maxUsers: number
  isPopular: boolean
  sortOrder: number
  moduleKeys: string[]
}> = [
  { name: 'Teste Gratuito', slug: 'teste', description: 'Para conhecer a plataforma durante 14 dias', price: 0, interval: 'MONTHLY', maxUsers: 2, isPopular: false, sortOrder: 0, moduleKeys: ['dashboard', 'products', 'services', 'categories', 'customers', 'tickets'] },
  { name: 'Básico', slug: 'basico', description: 'Ideal para pequenas empresas em crescimento', price: 1500, interval: 'MONTHLY', maxUsers: 5, isPopular: false, sortOrder: 1, moduleKeys: ['dashboard', 'products', 'services', 'categories', 'orders', 'customers', 'stock', 'tickets'] },
  { name: 'Profissional', slug: 'profissional', description: 'Para empresas em expansão com necessidades avançadas', price: 3500, interval: 'MONTHLY', maxUsers: 15, isPopular: true, sortOrder: 2, moduleKeys: ['dashboard', 'products', 'services', 'categories', 'orders', 'sales', 'purchases', 'suppliers', 'stock', 'customers', 'employees', 'roles', 'pos', 'tickets'] },
  { name: 'Empresarial', slug: 'empresarial', description: 'Solução completa para médias e grandes empresas', price: 7500, interval: 'MONTHLY', maxUsers: 50, isPopular: false, sortOrder: 3, moduleKeys: ['ALL'] },
]

const COMPANIES: Array<{
  name: string
  email: string
  phone?: string
  nuit?: string
  address?: string
  city: string
  province: string
  status: string
  planSlug: string
  daysAgo: number
  maxUsers: number
  notes?: string
  disableModules?: string[]
}> = [
  { name: 'Carsai Moçambique, Lda', email: 'geral@carsai.co.mz', phone: '+258 84 000 0001', nuit: '400123456', address: 'Av. Julius Nyerere, 1250', city: 'Maputo', province: 'Maputo', status: 'ACTIVE', planSlug: 'empresarial', daysAgo: 165, maxUsers: 50, notes: 'Empresa-mãe. Conta de referência e demonstração.' },
  { name: 'Mercado Chissano & Filhos', email: 'geral@chissanofilhos.co.mz', phone: '+258 82 555 1234', nuit: '400234567', address: 'Rua da Argélia, 89', city: 'Matola', province: 'Maputo', status: 'ACTIVE', planSlug: 'profissional', daysAgo: 140, maxUsers: 15 },
  { name: 'Beira Logística, S.A.', email: 'info@beiralogistica.co.mz', phone: '+258 83 222 4455', nuit: '400345678', address: 'Estrada Nacional 1, Km 7', city: 'Beira', province: 'Sofala', status: 'ACTIVE', planSlug: 'profissional', daysAgo: 118, maxUsers: 15, disableModules: ['stock'] },
  { name: 'Nacala Pescas, Lda', email: 'comercial@nacalapescas.co.mz', phone: '+258 87 310 9988', nuit: '400456789', city: 'Nacala', province: 'Nampula', status: 'PENDING', planSlug: 'basico', daysAgo: 10, maxUsers: 5, notes: 'Aguarda confirmação de pagamento.' },
  { name: 'Quelimane Digital', email: 'hello@quelimanedigital.co.mz', phone: '+258 86 445 2211', nuit: '400567890', city: 'Quelimane', province: 'Zambézia', status: 'ACTIVE', planSlug: 'basico', daysAgo: 76, maxUsers: 5 },
  { name: 'Chimoio Agro-Indústria', email: 'geral@chimoioagro.co.mz', phone: '+258 84 778 6655', nuit: '400678901', city: 'Chimoio', province: 'Manica', status: 'SUSPENDED', planSlug: 'profissional', daysAgo: 96, maxUsers: 15, notes: 'Suspensa por falta de pagamento (2 meses).', disableModules: ['finance'] },
  { name: 'Pemba Turismo, Lda', email: 'reservas@pembaturismo.co.mz', phone: '+258 82 909 1122', nuit: '400789012', city: 'Pemba', province: 'Cabo Delgado', status: 'ACTIVE', planSlug: 'basico', daysAgo: 41, maxUsers: 5 },
  { name: 'Xai-Xai Construção', email: 'obras@xaixaiconstrucao.co.mz', phone: '+258 84 121 3344', nuit: '400890123', city: 'Xai-Xai', province: 'Gaza', status: 'CANCELLED', planSlug: 'teste', daysAgo: 200, maxUsers: 2, notes: 'Cancelou após o período de teste.' },
]

const USERS = [
  { name: 'Administrador Carsai', email: 'admin@carsai.co.mz', password: 'Admin@2025', role: 'SUPER_ADMIN' },
  { name: 'Gestor de Contas', email: 'gestor@carsai.co.mz', password: 'Gestor@2025', role: 'ADMIN' },
  { name: 'Equipa de Suporte', email: 'suporte@carsai.co.mz', password: 'Suporte@2025', role: 'SUPPORT' },
]

const SETTINGS = [
  { key: 'siteName', value: 'Carsai BMS', type: 'string', group: 'general', description: 'Nome público da plataforma' },
  { key: 'companyName', value: 'Carsai Moçambique, Lda', type: 'string', group: 'general', description: 'Nome legal da empresa' },
  { key: 'siteUrl', value: 'https://bms.carsai.co.mz', type: 'string', group: 'general', description: 'URL público da plataforma' },
  { key: 'supportEmail', value: 'suporte@carsai.co.mz', type: 'string', group: 'general', description: 'Email de suporte' },
  { key: 'defaultLanguage', value: 'pt', type: 'string', group: 'general', description: 'Idioma padrão (pt, en)' },
  { key: 'currency', value: 'MZN', type: 'string', group: 'general', description: 'Moeda padrão' },
  { key: 'timezone', value: 'Africa/Maputo', type: 'string', group: 'general', description: 'Fuso horário da plataforma' },
  { key: 'allowRegistration', value: 'false', type: 'boolean', group: 'access', description: 'Permitir auto-registo de empresas' },
  { key: 'requireEmailVerification', value: 'true', type: 'boolean', group: 'access', description: 'Exigir verificação de email no registo' },
  { key: 'sessionTimeoutHours', value: '24', type: 'number', group: 'access', description: 'Expiração de sessão (horas)' },
  { key: 'maintenanceMode', value: 'false', type: 'boolean', group: 'system', description: 'Modo de manutenção da plataforma' },
  { key: 'licenseEnforcement', value: 'true', type: 'boolean', group: 'system', description: 'Bloquear acesso quando a licença está expirada ou revogada' },
  { key: 'auditRetentionDays', value: '365', type: 'number', group: 'system', description: 'Retenção de registos de auditoria (dias)' },
]

const AUDIT = [
  { action: 'COMPANY_CREATED', entityType: 'Company', entityName: 'Carsai Moçambique, Lda', details: 'Empresa criada no plano Empresarial', actorEmail: 'admin@carsai.co.mz', daysAgo: 165 },
  { action: 'COMPANY_CREATED', entityType: 'Company', entityName: 'Beira Logística, S.A.', details: 'Empresa criada no plano Profissional', actorEmail: 'admin@carsai.co.mz', daysAgo: 118 },
  { action: 'MODULE_DISABLED', entityType: 'CompanyModule', entityName: 'Stock — Beira Logística, S.A.', details: 'Módulo desactivado a pedido do cliente', actorEmail: 'gestor@carsai.co.mz', daysAgo: 30 },
  { action: 'KEY_REGENERATED', entityType: 'Company', entityName: 'Pemba Turismo, Lda', details: 'Chave de API regenerada por suspeita de compromisso', actorEmail: 'suporte@carsai.co.mz', daysAgo: 7 },
  { action: 'COMPANY_SUSPENDED', entityType: 'Company', entityName: 'Chimoio Agro-Indústria', details: 'Suspensa por falta de pagamento', actorEmail: 'admin@carsai.co.mz', daysAgo: 5 },
  { action: 'INVOICE_PAID', entityType: 'Invoice', entityName: 'Mercado Chissano & Filhos', details: 'Factura paga via M-Pesa', actorEmail: 'gestor@carsai.co.mz', daysAgo: 4 },
  { action: 'WEBHOOK_CREATED', entityType: 'Webhook', entityName: 'Carsai Moçambique, Lda', details: 'Webhook criado → https://hooks.carsai.co.mz/bms/main', actorEmail: 'admin@carsai.co.mz', daysAgo: 12 },
  { action: 'SETTING_UPDATED', entityType: 'Setting', entityName: 'licenseEnforcement', details: 'valor → true', actorEmail: 'admin@carsai.co.mz', daysAgo: 3 },
  { action: 'LOGIN', entityType: 'Auth', entityName: 'admin@carsai.co.mz', details: 'Sessão iniciada', actorEmail: 'admin@carsai.co.mz', daysAgo: 1 },
]

/* ------------------------------------------------------------------ */
/* Seed principal                                                      */
/* ------------------------------------------------------------------ */

async function main() {
  console.log('🌱 Seed — Carsai BMS Admin')

  // Limpeza (ordem respeita dependências)
  await prisma.auditLog.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.instance.deleteMany()
  await prisma.webhook.deleteMany()
  await prisma.companyModule.deleteMany()
  await prisma.planModule.deleteMany()
  await prisma.company.deleteMany()
  await prisma.plan.deleteMany()
  await prisma.module.deleteMany()
  await prisma.user.deleteMany()
  await prisma.setting.deleteMany()

  // Utilizadores do painel
  for (const u of USERS) {
    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash: await bcrypt.hash(u.password, 10),
        role: u.role,
        isActive: true,
      },
    })
  }
  console.log(`  ✓ ${USERS.length} utilizadores do painel`)

  // Módulos
  const moduleIdByKey = new Map<string, string>()
  for (const [i, m] of MODULES.entries()) {
    const created = await prisma.module.create({
      data: { ...m, sortOrder: i },
    })
    moduleIdByKey.set(m.key, created.id)
  }
  console.log(`  ✓ ${MODULES.length} módulos do sistema`)

  // Planos + módulos de cada plano
  const planIdBySlug = new Map<string, string>()
  const allModuleIds = [...moduleIdByKey.values()]
  for (const p of PLANS) {
    const created = await prisma.plan.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        interval: p.interval,
        maxUsers: p.maxUsers,
        isPopular: p.isPopular,
        isActive: true,
        sortOrder: p.sortOrder,
      },
    })
    planIdBySlug.set(p.slug, created.id)
    const keys = p.moduleKeys.includes('ALL') ? [...moduleIdByKey.keys()] : p.moduleKeys
    for (const k of keys) {
      await prisma.planModule.create({
        data: { planId: created.id, moduleId: moduleIdByKey.get(k)! },
      })
    }
  }
  console.log(`  ✓ ${PLANS.length} planos de subscrição`)

  // Empresas + activação de módulos por plano
  const createdCompanies: Array<{
    id: string
    name: string
    status: string
    planSlug: string
    licenseKey: string
    daysAgo: number
  }> = []
  for (const c of COMPANIES) {
    const licenseKey = genLicenseKey()
    const created = await prisma.company.create({
      data: {
        name: c.name,
        slug: slugify(c.name),
        email: c.email,
        phone: c.phone,
        nuit: c.nuit,
        address: c.address,
        city: c.city,
        province: c.province,
        status: c.status,
        planId: planIdBySlug.get(c.planSlug)!,
        licenseKey,
        licenseStatus: 'ACTIVE',
        apiKey: genApiKey(),
        apiKeyStatus: 'ACTIVE',
        maxUsers: c.maxUsers,
        notes: c.notes,
        createdAt: daysAgo(c.daysAgo),
        updatedAt: daysAgo(Math.max(0, c.daysAgo - 5)),
      },
    })
    createdCompanies.push({
      id: created.id,
      name: created.name,
      status: c.status,
      planSlug: c.planSlug,
      licenseKey,
      daysAgo: c.daysAgo,
    })

    const planDef = PLANS.find((p) => p.slug === c.planSlug)!
    const keys = planDef.moduleKeys.includes('ALL') ? [...moduleIdByKey.keys()] : planDef.moduleKeys
    for (const k of keys) {
      const disabled = c.disableModules?.includes(k) ?? false
      await prisma.companyModule.create({
        data: {
          companyId: created.id,
          moduleId: moduleIdByKey.get(k)!,
          isEnabled: !disabled,
          enabledAt: disabled ? null : created.createdAt,
        },
      })
    }

    // Licença de teste expira 14 dias após criação
    if (c.planSlug === 'teste') {
      await prisma.company.update({
        where: { id: created.id },
        data: { expiresAt: new Date(created.createdAt.getTime() + 14 * 24 * 3600 * 1000) },
      })
    }
  }
  console.log(`  ✓ ${COMPANIES.length} empresas de demonstração`)

  /* ---------------- Telemetria: instâncias BMS ---------------- */
  function hoursAgo(h: number): Date {
    return new Date(Date.now() - h * 3600 * 1000)
  }
  const carsaiCo = createdCompanies[0]
  const chissanoCo = createdCompanies[1]
  const beiraCo = createdCompanies[2]
  const quelimaneCo = createdCompanies[4]
  const INSTANCE_SEED = [
    { co: carsaiCo, instanceId: 'srv-maputo-01', appVersion: '1.1.0', nodeVersion: 'v20.18.0', dbEngine: 'postgres', usersCount: 38, lastSeenAt: hoursAgo(0.2), meta: '{"memoryMb":2048,"uptimeDays":96}' },
    { co: carsaiCo, instanceId: 'srv-backup-01', appVersion: '1.1.0', nodeVersion: 'v20.18.0', dbEngine: 'postgres', usersCount: 38, lastSeenAt: hoursAgo(2), meta: '{"role":"replica"}' },
    { co: chissanoCo, instanceId: 'loja-matola', appVersion: '1.0.4', nodeVersion: 'v20.11.0', dbEngine: 'sqlite', usersCount: 11, lastSeenAt: hoursAgo(5), meta: null },
    { co: beiraCo, instanceId: 'armazem-beira', appVersion: '1.0.4', nodeVersion: 'v20.11.0', dbEngine: 'sqlite', usersCount: 9, lastSeenAt: hoursAgo(6), meta: null },
    { co: quelimaneCo, instanceId: 'quelimane-main', appVersion: '1.0.2', nodeVersion: 'v18.20.1', dbEngine: 'sqlite', usersCount: 4, lastSeenAt: hoursAgo(24 * 3), meta: null },
    { co: createdCompanies[6], instanceId: 'pemba-recepcao', appVersion: '1.0.2', nodeVersion: 'v18.20.1', dbEngine: 'sqlite', usersCount: 3, lastSeenAt: hoursAgo(24 * 41), meta: null },
  ]
  for (const inst of INSTANCE_SEED) {
    await prisma.instance.create({
      data: {
        companyId: inst.co.id,
        instanceId: inst.instanceId,
        appVersion: inst.appVersion,
        nodeVersion: inst.nodeVersion,
        dbEngine: inst.dbEngine,
        usersCount: inst.usersCount,
        meta: inst.meta,
        lastSeenAt: inst.lastSeenAt,
        firstSeenAt: daysAgo(Math.max(1, inst.co.daysAgo - 2)),
      },
    })
  }
  console.log(`  ✓ ${INSTANCE_SEED.length} instâncias com telemetria`)

  /* ---------------- Facturas de subscrição ---------------- */
  function monthPeriod(offset: number): { start: Date; end: Date; due: Date; year: number; month: number } {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999)
    const due = new Date(end.getTime() + 15 * 24 * 3600 * 1000)
    return { start, end, due, year: start.getFullYear(), month: start.getMonth() + 1 }
  }
  const PAID_METHODS = ['MPESA', 'TRANSFER', 'CASH', 'CARD'] as const
  let invoiceSeq = 1
  function nextNumber(year: number): string {
    const n = `FT-${year}-${String(invoiceSeq).padStart(5, '0')}`
    invoiceSeq += 1
    return n
  }
  const BILLING_COMPANIES = [carsaiCo, chissanoCo, beiraCo, quelimaneCo, createdCompanies[6]]
  let paidCount = 0
  // 4 meses fechados (pagos) + mês corrente (aberto)
  for (let offset = 4; offset >= 1; offset--) {
    const p = monthPeriod(offset)
    for (const co of BILLING_COMPANIES) {
      const plan = PLANS.find((pl) => pl.slug === co.planSlug)
      if (!plan || plan.price <= 0) continue
      const method = PAID_METHODS[paidCount % PAID_METHODS.length]
      paidCount += 1
      await prisma.invoice.create({
        data: {
          number: nextNumber(p.year),
          companyId: co.id,
          planId: planIdBySlug.get(co.planSlug)!,
          planName: plan.name,
          amount: plan.price,
          periodStart: p.start,
          periodEnd: p.end,
          issuedAt: p.start,
          dueAt: p.due,
          paidAt: new Date(p.start.getTime() + 8 * 24 * 3600 * 1000),
          method,
          status: 'PAID',
        },
      })
    }
  }
  // Mês corrente: activas com plano → OPEN; suspensas → OVERDUE
  const current = monthPeriod(0)
  for (const co of createdCompanies) {
    const plan = PLANS.find((pl) => pl.slug === co.planSlug)
    if (!plan || plan.price <= 0) continue
    if (co.status === 'ACTIVE') {
      await prisma.invoice.create({
        data: {
          number: nextNumber(current.year),
          companyId: co.id,
          planId: planIdBySlug.get(co.planSlug)!,
          planName: plan.name,
          amount: plan.price,
          periodStart: current.start,
          periodEnd: current.end,
          issuedAt: current.start,
          dueAt: current.due,
          status: 'OPEN',
        },
      })
    } else if (co.status === 'SUSPENDED') {
      // 2 meses em atraso
      for (const offset of [1, 0]) {
        const p = monthPeriod(offset)
        await prisma.invoice.create({
          data: {
            number: nextNumber(p.year),
            companyId: co.id,
            planId: planIdBySlug.get(co.planSlug)!,
            planName: plan.name,
            amount: plan.price,
            periodStart: p.start,
            periodEnd: p.end,
            issuedAt: p.start,
            dueAt: offset === 0 ? new Date(Date.now() - 5 * 24 * 3600 * 1000) : p.due,
            status: 'OVERDUE',
          },
        })
      }
    }
  }
  // Uma cancelada (cliente desistiu)
  const pCancel = monthPeriod(3)
  await prisma.invoice.create({
    data: {
      number: nextNumber(pCancel.year),
      companyId: createdCompanies[7].id,
      planId: planIdBySlug.get('teste')!,
      planName: 'Teste Gratuito',
      amount: 0,
      periodStart: pCancel.start,
      periodEnd: pCancel.end,
      issuedAt: pCancel.start,
      dueAt: pCancel.due,
      status: 'CANCELLED',
      notes: 'Cliente cancelou o período de teste.',
    },
  })
  const totalInvoices = await prisma.invoice.count()
  console.log(`  ✓ ${totalInvoices} facturas de subscrição`)

  /* ---------------- Webhooks ---------------- */
  await prisma.webhook.create({
    data: {
      companyId: carsaiCo.id,
      url: 'https://hooks.carsai.co.mz/bms/main',
      events: '*',
      secret: `whsec_${code(48, HEX)}`,
      isActive: true,
      lastStatus: 200,
      lastFiredAt: hoursAgo(3),
    },
  })
  await prisma.webhook.create({
    data: {
      companyId: chissanoCo.id,
      url: 'https://erp.chissanofilhos.co.mz/webhooks/carsai',
      events: 'INVOICE_PAID,INVOICE_OVERDUE',
      secret: `whsec_${code(48, HEX)}`,
      isActive: true,
      lastStatus: null,
    },
  })
  console.log('  ✓ 2 webhooks registados')

  // Configurações
  for (const s of SETTINGS) {
    await prisma.setting.create({ data: s })
  }
  console.log(`  ✓ ${SETTINGS.length} configurações do sistema`)

  // Auditoria
  for (const a of AUDIT) {
    await prisma.auditLog.create({
      data: {
        action: a.action,
        entityType: a.entityType,
        entityName: a.entityName,
        details: a.details,
        actorEmail: a.actorEmail,
        createdAt: daysAgo(a.daysAgo, a.daysAgo),
      },
    })
  }
  console.log(`  ✓ ${AUDIT.length} registos de auditoria`)

  console.log('✅ Seed concluído com sucesso!')
  console.log('   Credenciais: admin@carsai.co.mz / Admin@2025 (SUPER_ADMIN)')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
