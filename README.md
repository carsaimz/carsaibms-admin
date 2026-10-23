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

- **Dashboard em tempo real** — KPIs (empresas activas, MRR estimado em MTn, módulos activos, utilizadores), gráficos de distribuição por plano, estados e crescimento de 6 meses, actividade recente
- **Gestão de Empresas** — CRUD com pesquisa e filtros, estados (Pendente · Activa · Suspensa · Cancelada), mudança de plano com **provisionamento automático de módulos**
- **Módulos por empresa** — activar/desactivar qualquer módulo individualmente (módulos essenciais protegidos)
- **Chaves de licença e API** — geração (`CARSAI-LIC-XXXX-XXXX-XXXX` · `sk_live_…`), regeneração, revogação e reactivação, máscara e cópia rápida
- **Planos de subscrição** — CRUD com selecção de módulos incluídos, preços em Meticais (MZN), plano destacado como popular
- **Módulos do sistema** — catálogo por categoria (Núcleo, Vendas, Inventário, CRM, RH, Suporte, Finanças, Conteúdo, Website, POS, Integrações) com activação global
- **Utilizadores do painel** — papéis Super Admin · Admin · Suporte, com protecção de auto-edição
- **Auditoria completa** — todas as acções sensíveis registadas automaticamente, com filtros por acção/entidade/pesquisa
- **Configurações** — geral, acesso e sistema (alterações auditadas)
- Tema claro/escuro · Interface 100% em Português · Responsivo mobile-first

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
│   │   └── dashboard/        # métricas agregadas
│   ├── layout.tsx
│   └── page.tsx              # SPA (AuthGate → Login | AdminShell)
├── components/
│   ├── bms/                  # views e componentes do painel
│   └── ui/                   # shadcn/ui
└── lib/
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
| Auditoria | `GET /api/audit` |
| Configurações | `GET/PATCH /api/settings` |

Autenticação via cookie `httpOnly` (`bms_token`) assinado com HMAC-SHA256; passwords com bcrypt; operações sensíveis restritas ao papel **Super Admin**; toda a actividade registada na auditoria.

## 🔒 Segurança

- Sessões em cookie `httpOnly` + `sameSite=lax` com token assinado (sem JWT em localStorage)
- Hash de passwords com `bcryptjs`
- Autorização por papéis (SUPER_ADMIN/ADMIN/SUPPORT) no backend
- Auditoria automática (login, mutações, chaves, configurações)
- Validação de inputs com `zod`

## 🗺️ Roadmap

- [x] v1.0 — Empresas, planos, módulos, chaves, utilizadores, auditoria, configurações
- [ ] Facturação/recibos de subscrições (M-Pesa, e-Mola, mKesh)
- [ ] Convites e onboarding de empresas
- [ ] 2FA para utilizadores do painel
- [ ] Exportações (PDF/Excel) e notificações por email

## 📄 Licença

MIT © [Carsai Moçambique](https://github.com/carsaimz) — divisão **CarsaiDev**

*CarsaiDev — Uma linha, uma solução. 🇲🇿*
