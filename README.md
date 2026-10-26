# Carsai BMS Admin

<div align="center">

**Plataforma administrativa do [Carsai Business Management System](https://github.com/carsaimz/carsaibms)**

Gere empresas cliente, planos de subscrição, módulos do sistema, chaves de licença e de API, acessos e auditoria.

*CarsaiDev — Uma linha, uma solução. 🇲🇿*

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-6-2D3748) ![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4)

</div>

---

## 🎯 O que é

O **Carsai BMS Admin** é a camada de controlo da plataforma Carsai BMS: é aqui que a equipa Carsai gere **quem acede ao sistema, o que cada empresa pode usar e durante quanto tempo** — planos, módulos activáveis, chaves de licença/API, estados de conta e auditoria completa.

## ✨ Funcionalidades

- **Dashboard em tempo real** — 8 KPIs (empresas activas, MRR, módulos, utilizadores, instâncias activas, facturas em aberto/atraso, cobrado no mês) + gráficos de distribuição por plano, estados, crescimento e facturação de 6 meses
- **Facturação de subscrições** — geração mensal automática, facturas manuais, marcação de pagamento (M-Pesa · e-Mola · Transferência · Numerário · Cartão), KPIs de cobrança e emitido vs. cobrado
- **Telemetria de instâncias** — heartbeat das instalações Carsai BMS (activas · dormentes · offline), por empresa e globais, com auto-refresco
- **Webhooks assinados** — subscrição por eventos (empresa, licença, factura), segredo copiável, teste de entrega e histórico de estado
- **Gestão de Empresas** — CRUD com pesquisa e filtros, estados (Pendente · Activa · Suspensa · Cancelada), mudança de plano com **provisionamento automático de módulos**
- **Módulos por empresa** — activar/desactivar qualquer módulo individualmente (módulos essenciais protegidos)
- **Chaves de licença e API** — geração (`CARSAI-LIC-XXXX-XXXX-XXXX` · `sk_live_…`), regeneração, revogação e reactivação, máscara e cópia rápida
- **Planos de subscrição** — CRUD com selecção de módulos incluídos, preços em Meticais (MZN), plano destacado como popular
- **Módulos do sistema** — catálogo por categoria (Núcleo, Vendas, Inventário, CRM, RH, Suporte, Finanças, Conteúdo, Website, POS, Integrações) com activação global
- **Utilizadores do painel** — papéis Super Admin · Admin · Suporte, com protecção de auto-edição
- **Auditoria completa** — todas as acções sensíveis registadas automaticamente, com filtros por acção/entidade/pesquisa
- **Configurações** — geral, acesso e sistema (alterações auditadas)
- **Internacionalização (i18n)** — 🇲🇿 Português (Moçambique) e 🇬🇧 English em toda a interface (incl. datas, números e tempo relativo via `Intl`), com seletor no topo e persistência em `localStorage`
- Tema claro/escuro · Responsivo mobile-first · Acessibilidade ARIA

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Linguagem | TypeScript 5 |
| UI | Tailwind CSS 4 · shadcn/ui · Lucide Icons · Recharts |
| Base de dados | Prisma 6 + SQLite (portável para MySQL/Postgres) |
| Estado/Notificações | Sonner · next-themes |

## 🚀 Arranque rápido

```bash
# 1. Instalar dependências
bun install        # ou npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# → definir DATABASE_URL e AUTH_SECRET

# 3. Criar a base de dados e popular dados de demonstração
bun run db:push
bun run db:seed

# 4. Iniciar em desenvolvimento
bun run dev
# → http://localhost:3000
```

### Credenciais padrão (após seed)

| Papel | Email | Password |
|---|---|---|
| Super Admin | `admin@carsai.co.mz` | `Admin@2025` |
| Admin | `gestor@carsai.co.mz` | `Gestor@2025` |
| Suporte | `suporte@carsai.co.mz` | `Suporte@2025` |

> ⚠️ **Importante:** altere estas credenciais e defina um `AUTH_SECRET` forte antes de usar em produção.

## 📁 Estrutura

```
src/
├── app/
│   ├── api/                  # Route handlers (REST)
│   │   ├── auth/             # login · me · logout (cookie httpOnly HMAC)
│   │   ├── companies/        # CRUD + módulos + chaves por empresa
│   │   ├── plans/            # CRUD de planos
│   │   ├── modules/          # CRUD de módulos do sistema
│   │   ├── users/            # utilizadores do painel
│   │   ├── audit/            # consulta de auditoria
│   │   ├── settings/         # configurações
│   │   ├── invoices/         # facturação de subscrições (+ generate)
│   ├── webhooks/         # webhooks por empresa
│   ├── instances/        # telemetria de instâncias
│   ├── telemetry/        # heartbeat do produto BMS
│   ├── activate/         # activação pública de licenças (instalador)
│   └── dashboard/        # métricas agregadas
│   ├── layout.tsx
│   └── page.tsx              # SPA (AuthGate → Login | AdminShell)
├── components/
│   ├── bms/                  # views e componentes do painel
│   └── ui/                   # shadcn/ui
└── lib/
    ├── i18n/                 # provider + dicionários pt-MZ/en (núcleo + vistas)
    ├── auth.ts               # tokens HMAC-SHA256 + sessão
    ├── audit.ts              # registo de auditoria
    ├── keys.ts               # geração de chaves/slug
    ├── bms-api.ts            # cliente tipado da API
    ├── format.ts             # MZN, datas (Africa/Maputo)
    └── db.ts                 # Prisma Client
prisma/
├── schema.prisma             # User · Plan · Module · Company · AuditLog · Setting…
└── seed.ts                   # dados de demonstração (19 módulos, 4 planos, empresas)
```

## 🔌 API (resumo)

| Domínio | Endpoints |
|---|---|
| Auth | `POST /api/auth/login` · `GET /api/auth/me` · `POST /api/auth/logout` |
| Dashboard | `GET /api/dashboard` |
| Empresas | `GET/POST /api/companies` · `GET/PATCH/DELETE /api/companies/[id]` · `PATCH …/modules` · `POST/PATCH …/keys` |
| Planos | `GET/POST /api/plans` · `PATCH/DELETE /api/plans/[id]` |
| Módulos | `GET/POST /api/modules` · `PATCH/DELETE /api/modules/[id]` |
| Utilizadores | `GET/POST /api/users` · `PATCH/DELETE /api/users/[id]` |
| Facturação | `GET/POST /api/invoices` · `POST /api/invoices/generate` · `PATCH/DELETE /api/invoices/[id]` |
| Webhooks | `GET/POST /api/webhooks` · `PATCH/DELETE /api/webhooks/[id]` · `POST …/test` |
| Instâncias | `GET /api/instances` · `POST /api/telemetry` (heartbeat) · `POST /api/activate` |
| Auditoria | `GET /api/audit` |
| Configurações | `GET/PATCH /api/settings` |

Autenticação via cookie `httpOnly` (`bms_token`) assinado com HMAC-SHA256; passwords com bcrypt; operações sensíveis restritas ao papel **Super Admin**; toda a actividade registada na auditoria.

## 🌍 Internacionalização

A plataforma é **bilingue desde a v1.2**:

- **`pt`** — Português de Moçambique (pré-Acordo) — idioma por defeito
- **`en`** — English — tradução de apoio

O seletor (🌐) fica na topbar/login; a escolha persiste em `localStorage` (`carsai-locale`). Datas, números e tempo relativo usam `Intl` no locale activo (`pt-PT` / `en-GB`, fuso `Africa/Maputo`). Os dicionários vivem em `src/lib/i18n/` (`locales.ts` núcleo + `views-*.ts` por área) com fallback `pt → en → chave` e interpolação `{variável}`.

## 🔒 Segurança

- Sessões em cookie `httpOnly` + `sameSite=lax` com token assinado (sem JWT em localStorage)
- Hash de passwords com `bcryptjs`
- Autorização por papéis (SUPER_ADMIN/ADMIN/SUPPORT) no backend
- Auditoria automática (login, mutações, chaves, configurações)
- Validação de inputs com `zod`

## 🗺️ Roadmap

- [x] v1.0 — Empresas, planos, módulos, chaves, utilizadores, auditoria, configurações
- [x] v1.1 — Facturação de subscrições, telemetria de instâncias, webhooks assinados
- [x] v1.2 — Internacionalização completa (pt-MZ · en) com `Intl` para datas/números
- [ ] mKesh e mais métodos de pagamento
- [ ] Convites e onboarding de empresas
- [ ] 2FA para utilizadores do painel
- [ ] Exportações (PDF/Excel) e notificações por email

## 📄 Licença

MIT © [Carsai Moçambique](https://github.com/carsaimz) — divisão **CarsaiDev**

*CarsaiDev — Uma linha, uma solução. 🇲🇿*
