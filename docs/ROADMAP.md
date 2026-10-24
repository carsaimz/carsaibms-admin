# 🗺️ ROADMAP CARSODEV 2026–2028
## Carsai BMS + Plataforma SaaS — Documento Estratégico de Produto

> **🏢 Perspectiva: PLATAFORMA SaaS** (`carsaibms-admin` — Next.js 16 + Prisma/SQLite)
> Este mesmo roadmap existe em perspectiva do **📦 PRODUTO BMS** em `github.com/carsaimz/carsaibms → docs/ROADMAP.md`.
> As secções partilhadas são idênticas em ambos; apenas a **secção 2 (Estado actual)** é adaptada a cada perspectiva.

> ### 🇲🇿 «Uma linha, uma solução.»

| Ficha do documento | |
| --- | --- |
| **Versão** | 1.0 |
| **Data** | Outubro de 2026 |
| **Propriedade** | CarsaiDev (`carsaimz`) |
| **Horizonte** | Q4 2026 → Q4 2028 |
| **Cadência de revisão** | No fim de cada fase trimestral |
| **Idioma** | Português de Moçambique (ortografia pré-Acordo) |
| **Repositórios** | `github.com/carsaimz/carsaibms-admin` · `github.com/carsaimz/carsaibms` |

---

## 📑 Índice

- **1.** 🎯 Visão, Missão e Princípios
- **2.** 📍 Estado actual (Plataforma SaaS)
- **3.** 🧭 Metodologia — fases, Definition of Done, versionamento
- **4.** 🚀 Fases detalhadas (v1.1 → v3.0)
- **5.** 🛡️ Infra-estrutura e segurança transversal
- **6.** 📊 KPIs de negócio e metas
- **7.** 🗓️ Cronograma trimestral 2026–2028
- **8.** ⚠️ Riscos principais do produto
- **9.** 📖 Glossário
- **10.** 🤝 Governança e como contribuir

---

## 1. 🎯 Visão, Missão e Princípios

### 1.1 Visão

Ser o **sistema de gestão de referência do comércio e dos serviços em Moçambique** — e, a seguir, no espaço lusófono — ao alcance de qualquer PME: instalado em minutos, operado por qualquer pessoa com um telemóvel ou um computador, e pago em meticais, com M-Pesa ou e-Mola.

### 1.2 Missão

Eliminar a complexidade: **«uma linha, uma solução»**. A CarsaiDev entrega um BMS (*Business Management System*) modular — 19 módulos, do POS ao financeiro — instalado por um assistente de 6 passos e licenciado contra uma plataforma SaaS que gere empresas, planos, chaves, telemetria, facturação e webhooks.

### 1.3 Princípios de produto

Os seis princípios que orientam cada decisão — do schema ao botão:

| # | Princípio | O que significa na prática |
| :---: | --- | --- |
| 1 | **🪶 Extremamente minimalista** | Cada ecrã, campo e dependência tem de justificar a sua existência. Uma linha, uma solução — se precisar de duas, reencontramos o problema. |
| 2 | **🧩 Modular** | 19 módulos activáveis por plano e por licença. O cliente paga (e vê) só o que usa; a plataforma provisiona módulos automaticamente. |
| 3 | **⚡ Dinâmico** | UI fluida e responsiva, toasts em vez de recarregamentos, telemetria contínua (heartbeat de 6h), releases trimestrais. |
| 4 | **🔒 Seguro** | Seguro por omissão: sessões assinadas de curta duração, chaves revogáveis, auditoria de todas as mutações, menor privilégio sempre. |
| 5 | **🌍 Traduzível** | Zero strings hardcoded: tudo em ficheiros i18n (pt hoje, en amanhã, fr depois). Moeda e datas formatadas por locale e fuso. |
| 6 | **🛂 Baseado em permissões** | Toda a acção passa por papel × módulo × permissão granular (`view/create/edit/delete`). Administrador, Funcionário e Cliente veem mundos diferentes do mesmo sistema. |

### 1.4 Identidade

- **Slogan:** *«Uma linha, uma solução.»* — em rodapés, recibos e documentação, sempre com 🇲🇿.
- **Cores:** plataforma Admin em **emerald + zinc**; BMS em **âmbar `#f5a524` + zinc**. Nunca azul/indigo.
- **Moeda:** sempre em meticais (`1 500,00 MTn`). **Fuso:** `Africa/Maputo` em todo o sistema.
- **Português:** ortografia pré-Acordo e vocabulário de Moçambique (factura, NUIT, MTn, e-Mola).

---

## 2. 📍 Estado actual — Plataforma SaaS (carsaibms-admin)

> Nesta perspectiva, o «produto» é a **plataforma de licenciamento e facturação** que gere o ciclo de vida das empresas clientes, dos planos, dos módulos e das chaves consumidas pelo BMS. O estado do produto BMS (instalado nos clientes) é resumido em 2.3.

### 2.1 · v1.0 — Base da plataforma ✅

| Área | Capacidade entregue | Estado |
| --- | --- | :---: |
| **Stack** | Next.js 16 (App Router) + TypeScript 5 + Tailwind 4 + shadcn/ui + Prisma 6 + SQLite | ✅ |
| **Autenticação** | Cookie httpOnly assinado com HMAC-SHA256 (7 dias), bcryptjs, papéis SUPER_ADMIN/ADMIN/SUPPORT | ✅ |
| **Empresas** | CRUD completo, pesquisa/filtros/paginação, mudança de plano transacional (provisiona módulos), suspensão/activação auditadas | ✅ |
| **Planos** | CRUD + matriz planos↔módulos; 4 planos: Teste 0 · Básico 1 500 · Profissional 3 500 (popular) · Empresarial 7 500 MTn/mês | ✅ |
| **Módulos** | 19 módulos por categoria, `isCore` protegido contra eliminação, contadores de uso (empresas/planos) | ✅ |
| **Chaves** | Licença `CARSAI-LIC-XXXX-XXXX-XXXX` + API key `sk_live_…`, regeneração e revogação auditadas, máscara na UI | ✅ |
| **Activación** | `POST /api/activate` público (usado pelo instalador BMS): validação ordenada 404→401→403, devolve plano + módulos efectivos + validade | ✅ |
| **Auditoria** | `logAudit` à prova de falhas em todas as mutações (incl. LOGIN/LOGIN_FAILED), vista com filtros por acção/entidade | ✅ |
| **Configurações** | Grupos Geral/Acesso/Sistema com conversão de tipos | ✅ |
| **Dashboard** | MRR estimado, crescimento 6 meses, empresas por plano/estado, top módulos, actividade recente | ✅ |
| **UI** | Identidade emerald+zinc, tema claro/escuro, responsivo (Sheet em mobile), toasts sonner, alvos de toque ≥44px | ✅ |

### 2.2 · v1.1 — Fundação SaaS ✅ (backend completo; acabamento em curso)

| Área | Capacidade entregue | Estado |
| --- | --- | :---: |
| **Telemetria** | `POST /api/telemetry` público autenticado por licença; upsert idempotente de `Instance`; heartbeat de 6h; `GET /api/instances`; KPI «activas nas últimas 24h» | ✅ |
| **Facturação** | Modelo `Invoice` com número sequencial `FT-AAAA-NNNNN`; geração mensal em lote **idempotente** (MONTHLY todos os meses, YEARLY só em Janeiro); sweep automático `OPEN→OVERDUE`; métodos M-Pesa · e-Mola · Transferência · Numerário · Cartão; KPIs de billing + série de 6 meses | ✅ |
| **Webhooks** | Registo por empresa com segredo `whsec_`; entrega assinada HMAC-SHA256 no header `X-Carsai-Signature` (timeout 5s, nunca lança); eventos `COMPANY_*` · `LICENSE_*` · `INVOICE_*` · `TEST`; endpoint de teste | ✅ |
| **Dashboard** | Cartões de billing (aberto/vencido/pago no mês) e de instâncias (total/activas 24h) | ✅ |

### 2.3 · Estado do BMS (referência cruzada)

O produto **Carsai BMS v1.0** está completo em `github.com/carsaimz/carsaibms`: 5 áreas (Público, Admin com 19 ecrãs, Staff, Portal do Cliente, POS touch), wizard instalador de 6 passos, i18n pt/en, gates 451/410, JWT com permissões granulares, POS com IVA 16%, relatórios xlsx/pdf, deploy multi-alvo (Apache/nginx/cPanel/Docker/PM2/Vercel/Netlify) e workflows CI (Android Capacitor, Desktop Electron, Web). O **heartbeat do BMS já envia telemetria** para esta plataforma (`server/utils/telemetry.js`, 6h). **Prova E2E efectuada:** plataforma emite licença → instalador activa online → módulos do plano activados → login → venda POS com impacto em stock e financeiro. O detalhe completo está na versão BMS deste roadmap.

### 2.4 · Snapshot do ambiente de demonstração (seed)

| Indicador | Valor |
| --- | ---: |
| Empresas demo | 8 (Maputo, Matola, Beira, Nacala, Quelimane, Chimoio, Pemba, Xai-Xai) |
| Módulos do catálogo | 19 |
| Planos | 4 (Teste · Básico · Profissional · Empresarial) |
| MRR (demo) | 17 500 MTn |
| Instâncias (telemetria demo) | 6 (4 activas nas últimas 24h) |
| Facturas (demo) | 28 (20 pagas · 5 abertas · 2 vencidas · 1 cancelada) |
| Webhooks (demo) | 2 |

> ⚠️ Valores do ambiente de demonstração — servem de base de teste para os KPIs da secção 6.

---

## 3. 🧭 Metodologia

### 3.1 Ciclo trimestral

Trabalhamos em **fases trimestrais**, cada uma com um tema único e épicos verificáveis. A fase só encerra com demo do fluxo dourado, revisão de KPIs e release com tag `vX.Y`.

| Momento | Actividade | Artefacto |
| --- | --- | --- |
| Semana 1 | Planeamento da fase (épicos, issues, estimativas) | Issues + milestone no GitHub |
| Semanas 2–11 | Implementação por agentes em contexto partilhado | PRs + worklog.md |
| Semana 12 | Verificação end-to-end (curl + browser), lint/tsc, retro | Demo + CHANGELOG + tag `vX.Y` |

### 3.2 Definition of Done

Uma fase só fecha quando **todos** os épicos cumprirem este checklist:

- [ ] Código em branch/PR, revisto e integrado (nunca push directo em `main`)
- [ ] `lint` e `tsc` limpos; `dev.log` sem erros de runtime
- [ ] Testado end-to-end (curl + browser; mobile 390px e tema escuro incluídos)
- [ ] Mutações registadas em auditoria; chaves mascaradas nos logs
- [ ] Documentação actualizada (README, docs/, CHANGELOG) em pt-MZ
- [ ] Secção appended no `worklog.md` com Stage Summary
- [ ] Critérios de aceitação da fase verificados um a um
- [ ] KPIs da secção 6 medidos e registados

### 3.3 Versionamento semântico e CHANGELOG

| Incremento | Quando se usa | Exemplos |
| :---: | --- | --- |
| **MAJOR** `x.0` | Breaking: migração de BD, redesign de UI, novas áreas de produto | v2.0 (BMS 2.0), v3.0 (Ecossistema) |
| **MINOR** `1.x` | Funcionalidades retro-compatíveis, uma por fase trimestral | v1.1, v1.2, v1.3, v2.1… |
| **PATCH** `1.1.x` | Correcções de bugs e segurança | v1.1.1, v1.1.2 |

Regras do `CHANGELOG.md` (em cada repositório):

- Formato *Keep a Changelog*; uma entrada por release, com data e fase associada.
- Categorias fixas: **Adicionado · Alterado · Corrigido · Segurança · Removido**.
- ⚠️ Breaking changes precedidas de aviso com guia de migração.

### 3.4 Priorização

Dentro de cada fase, os épicos executam nesta ordem: **(1) segurança → (2) receita directa → (3) redução de churn → (4) dívida técnica bloqueante → (5) polimento**. Nada entra na fase sem epic escrito e critérios de aceitação definidos.

---

## 4. 🚀 Fases detalhadas

> Nota: a fase indica o **foco principal**; alguns épicos tocam os dois produtos (plataforma + BMS). O estado usa ✅ (feito), 🟡 (em curso) e ⬜ (planeado).

### 4.0 · Resumo das fases

| Versão | Trimestre | Tema | Foco principal | Estado |
| :---: | :---: | --- | --- | :---: |
| **v1.1** | Q4 2026 | Fundação SaaS | Telemetria · Facturação · Webhooks · Emails · 2FA · Exportações | 🟡 ~75% |
| **v1.2** | Q1 2027 | Self-service & Pagamentos | Portal do cliente · M-Pesa/e-Mola API · Dunning · Dark mode BMS | ⬜ |
| **v1.3** | Q2 2027 | Escala operacional | White-label · Multi-instância/failover · Alertas · SLO 99,9% | ⬜ |
| **v2.0** | Q3 2027 | BMS 2.0 | Design system · POS offline · Play Store · Desktop assinado · TypeScript | ⬜ |
| **v2.1** | Q4 2027 | Novos módulos BMS | RH & Folha · CRM · Multi-armazém · Activos · Frota · Agenda · RFQ | ⬜ |
| **v2.2** | Q1 2028 | BI & IA | Dashboards à carta · Previsão de stock · Assistente IA em pt | ⬜ |
| **v2.3** | Q2 2028 | Compliance fiscal | AGT · IVA multi-taxa · Retenções · Banco · SAF-T | ⬜ |
| **v3.0** | Q3–Q4 2028 | Ecossistema | Marketplace · API v2 · Multi-idioma · Multi-país · Resellers | ⬜ |

---

### 4.1 · v1.1 — Fundação SaaS · **Q4 2026** · 🟡 EM CURSO (~75%)

**Objectivo:** transformar a plataforma de «emissor de licenças» em infra-estrutura SaaS completa: observabilidade das instâncias (telemetria), ciclo de vida financeiro (facturação) e integração programável (webhooks) — mais o acabamento de segurança e operação.

**Épicos:**

#### E1 · Telemetria de instâncias ✅
- [x] `POST /api/telemetry` público, autenticado pela chave de licença
- [x] Upsert idempotente de `Instance` (instanceId, versão da app, node, motor de BD, nº de utilizadores)
- [x] Heartbeat de 6h; KPI «activas nas últimas 24h» no dashboard
- [x] `GET /api/instances` com estado por empresa
- [x] Heartbeat no BMS (`server/utils/telemetry.js` + arranque em `index.js`) — agente C1 ✅

#### E2 · Facturação de subscrições ✅
- [x] Modelo `Invoice` com número sequencial `FT-AAAA-NNNNN`
- [x] Geração mensal em lote **idempotente** (MONTHLY todos os meses; YEARLY só em Janeiro)
- [x] Sweep automático `OPEN → OVERDUE` sem intervenção manual
- [x] Métodos de pagamento: M-Pesa · e-Mola · Transferência · Numerário · Cartão
- [x] KPIs de billing (aberto/vencido/pago no mês) + série de 6 meses no dashboard

#### E3 · Webhooks por empresa ✅
- [x] Registo por empresa com segredo `whsec_`
- [x] Entrega assinada HMAC-SHA256 no header `X-Carsai-Signature` (timeout 5s, nunca lança)
- [x] Eventos `COMPANY_*` · `LICENSE_*` · `INVOICE_*` · `TEST`
- [x] Endpoint de teste por webhook

#### E4 · Emails transaccionais SMTP ⬜
- [ ] Configuração SMTP na plataforma (host/porta/credenciais/remetente)
- [ ] Email de boas-vindas/activação de licença (plano, módulos, validade)
- [ ] Factura mensal em anexo PDF
- [ ] Aviso de renovação (7 · 3 · 1 dias antes da expiração)
- [ ] Fallback seguro: registo em log quando o SMTP não está configurado

#### E5 · 2FA TOTP no painel ⬜
- [ ] Inscrição com QR (app autenticadora) + códigos de recuperação
- [ ] Verificação do código no login do painel Admin
- [ ] Política: obrigatório para SUPER_ADMIN

#### E6 · Exportações CSV/Excel da plataforma ⬜
- [ ] Empresas · Facturas · Auditoria · Instâncias
- [ ] Exportação respeita os filtros activos na UI
- [ ] Limite de linhas + processamento assíncrono para conjuntos grandes

#### E7 · Heartbeat enriquecido ⬜
- [ ] Payload com versão do schema da BD do BMS
- [ ] Contagem de erros de runtime da última janela
- [ ] Retrocompatibilidade validada com a plataforma (campos novos opcionais)

**Critérios de aceitação**

1. Uma instância BMS recém-instalada aparece no dashboard de instâncias <10 min após o primeiro heartbeat.
2. Gerar facturas do mesmo mês duas vezes → `created: 0, skipped: N` na segunda execução.
3. Facturas abertas passam a OVERDUE pelo sweep, sem trabalho manual.
4. O webhook de teste entrega uma assinatura HMAC verificável com o `whsec_` da empresa.
5. Sem SMTP configurado, nenhuma acção quebra — tudo fica em log auditável.
6. Um SUPER_ADMIN sem 2FA é conduzido à inscrição no próximo login.
7. A exportação devolve exactamente os registos filtrados na UI.

**Riscos e mitigações**

| Risco | Mitigação |
| --- | --- |
| Emails a cair em spam (deliverability) | SPF/DKIM/DMARC + fornecedor transaccional; testes em Gmail/Outlook |
| Bloqueio por perda do 2FA | Códigos de recuperação únicos + reposição assistida por SUPPORT com auditoria |
| Exportações pesadas a bloquear o servidor | Limites server-side, paginação e job assíncrono para >10k linhas |
| Heartbeats duplicados ou falseados | Upsert por instanceId + validação de licença + revogação auditada |

**Dependências**

- Schema v1.1 (`Instance`, `Invoice`, `Webhook`) migrado ✅
- Backend v1.1 implementado e testado via curl ✅
- UI do painel para facturação/instâncias/webhooks (agente P1) — 🟡 em curso
- Heartbeat no BMS (agente C1) ✅

---

### 4.2 · v1.2 — Self-service & Pagamentos · **Q1 2027** · ⬜

**Objectivo:** o cliente resolve sozinho o ciclo de vida — ver licenças, pagar facturas, levantar bloqueios — sem abrir um ticket; os pagamentos digitais moçambicanos passam a ser nativos.

**Épicos:**

#### E1 · Portal do cliente (self-service) ⬜
- [ ] Login do cliente na plataforma (conta por empresa, sem acesso ao painel interno)
- [ ] Vista de licenças e chaves (mascaradas, com validade e estado)
- [ ] Facturas: lista, estado, pagamento e download do PDF
- [ ] Uso: instâncias activas, últimos heartbeats e módulos do plano

#### E2 · Gateway de pagamentos ⬜
- [ ] M-Pesa API (Moçambique) — cobrança + callback de confirmação
- [ ] e-Mola API — cobrança + callback
- [ ] Cartão via PayMoz/dLocal (checkout alojado)
- [ ] Factura marca-se **PAID** automaticamente por callback assinado
- [ ] Fallback manual (transferência/numerário) mantido para zonas sem cobertura

#### E3 · Factura PDF com NUIT ⬜
- [ ] Template A4 com NUIT, endereço, itens, IVA e total em MTn
- [ ] Anexo nos emails de facturação (liga ao E4 da v1.1)

#### E4 · Dunning automático ⬜
- [ ] Lembretes em D+1 · D+7 · D+14 após o vencimento
- [ ] Suspensão automática em D+15 (com webhook `COMPANY_SUSPENDED`)
- [ ] Reactivação imediata após pagamento

#### E5 · Notificações in-app ⬜
- [ ] Centro de notificações com badge de não-lidas
- [ ] Eventos: factura emitida/paga, webhook com falha, instância inactiva >24h

#### E6 · Dark mode no BMS ⬜
- [ ] Tema escuro consistente (identidade âmbar/zinc)
- [ ] Preferência por utilizador, persistente entre sessões

**Critérios de aceitação**

1. O cliente cria conta no portal, vê as facturas e paga uma via M-Pesa API em <2 min, sem contactar a Carsai.
2. Factura paga por callback fica PAID com método e referência — zero marcação manual.
3. O PDF da factura contém o NUIT da empresa e o total formatado em MTn.
4. Simulação de 15 dias de atraso gera 3 lembretes e a suspensão com webhooks correctos.
5. Reactivação após pagamento em <1 min.
6. Dark mode no BMS sem contrastes quebrados (audit aos 5 ecrãs mais usados).

**Riscos e mitigações**

| Risco | Mitigação |
| --- | --- |
| Callbacks das operadoras móveis pouco fiáveis | Verificação activa (polling) + conciliação diária + fila de reprocessamento |
| Contas self-service falsas | Criação de conta só com chave de licença válida existente |
| Dunning a suspender clientes legítimos | Janela generosa, aviso claro no portal e no BMS, reactivação instantânea |

**Dependências**

- E4 (emails) da v1.1 para lembretes
- Sweep `OVERDUE` e webhooks `COMPANY_*`/`INVOICE_*` já implementados ✅

---

### 4.3 · v1.3 — Escala operacional · **Q2 2027** · ⬜

**Objectivo:** operar a passagem de dezenas para centenas de clientes sem crescer o esforço humano: white-label, redundância, alertas, onboarding guiado, health score e um SLO público.

**Épicos:**

#### E1 · White-label ⬜
- [ ] Logo e cor primária por empresa
- [ ] Domínio próprio do cliente no portal (CNAME + certificado)
- [ ] Marca aplicada nas instâncias BMS licenciadas

#### E2 · Multi-instâncias com failover ⬜
- [ ] N instâncias por empresa (sede/filial) no modelo `Instance`
- [ ] Detecção de primária inactiva (heartbeat) e promoção assistida
- [ ] Runbook de restauro por empresa

#### E3 · Alertas ⬜
- [ ] Uptime da plataforma e das instâncias (base do SLO)
- [ ] Stock crítico reportado via heartbeat do BMS
- [ ] Factura vencida → alerta interno + email

#### E4 · Templates de onboarding ⬜
- [ ] 3 templates por sector (retalho, serviços, restauração)
- [ ] Importação inicial de produtos/clientes (CSV) guiada
- [ ] Checklist de go-live com desligamento dos dados demo

#### E5 · Health score de clientes ⬜
- [ ] Pontuação 0–100: uso (telemetria), pagamentos, tickets, actividade
- [ ] 4 níveis (verde/amarelo/laranja/vermelho) com playbooks de retenção

#### E6 · SLO 99,9% + status page ⬜
- [ ] Monitorização externa + status page pública com histórico de 90 dias
- [ ] Post-mortem público para incidentes >30 min

**Critérios de aceitação**

1. Empresa Empresarial instala o BMS com o próprio logo/cor/domínio em <1 dia.
2. Failover de instância concluído em <15 min com passos documentados.
3. Alertas de stock crítico e factura vencida chegam por email + in-app.
4. Nova empresa operacional em <30 min usando um template.
5. Health score calculado diariamente para 100% das empresas activas.
6. Status page com 30 dias consecutivos de medição antes do anúncio do SLO.

**Riscos e mitigações**

| Risco | Mitigação |
| --- | --- |
| Failover mal executado corrompe dados | Promoção assistida (não automática) + verificação de consistência |
| White-label a quebrar layouts | Tokens de tema + testes de regressão visual nos 2 temas |
| Alertas a gerar fadiga | Thresholds configuráveis e agrupamento de alertas |

**Dependências**

- Telemetria v1.1 ✅ (heartbeat é a fonte de verdade de uptime/uso)
- Webhooks v1.1 ✅ (alertas reutilizam o despacho assinado)

---

### 4.4 · v2.0 — BMS 2.0 · **Q3 2027** · ⬜

**Objectivo:** modernizar o produto cliente: design system próprio, um POS que nunca falha por falta de rede, presença nas lojas (Play Store), instaladores desktop assinados e bases de código sustentáveis (TypeScript).

**Épicos:**

#### E1 · Design system Carsai ⬜
- [ ] Tokens (cor/tipografia/espaçamento) + biblioteca de componentes documentada
- [ ] Redesign por ondas: primeiro POS, Dashboard, Produtos, Encomendas e Stock
- [ ] Acessibilidade: alvos ≥44px, ARIA e contraste verificado

#### E2 · POS offline-first ⬜
- [ ] PWA instalável com service worker e cache de catálogo
- [ ] Fila de sincronização persistente (IndexedDB) para vendas offline
- [ ] Conciliação de stock na reconexão, sem duplicados e com ordem preservada

#### E3 · App Android na Play Store ⬜
- [ ] Build Capacitor assinado + conta de developer + ficha da loja
- [ ] Internal testing → produção; actualizações pela store

#### E4 · Instaladores desktop assinados ⬜
- [ ] NSIS (Windows) com certificado de code signing
- [ ] AppImage/DEB (Linux) + DMG (macOS) com notarização
- [ ] Auto-update via Electron Builder

#### E5 · Migração do BMS para TypeScript ⬜
- [ ] Client (React) primeiro; server (Express/Sequelize) depois
- [ ] `tsconfig` strict + tipos partilhados dos contratos de API
- [ ] CI bloqueante para novos erros de tipo

**Critérios de aceitação**

1. ≥90% dos ecrãs BMS usam o design system novo; zero regressões visuais críticas.
2. Venda concluída no POS **sem rede** e sincronizada na reconexão, sem duplicados.
3. APK assinado disponível na Play Store (canal de testes → produção).
4. Instaladores desktop assinados sem avisos bloqueantes de SmartScreen/Gatekeeper.
5. Build do BMS 100% TypeScript com `strict` e CI verde.

**Riscos e mitigações**

| Risco | Mitigação |
| --- | --- |
| Conflitos de sincronização offline | IDs gerados no cliente + resolução determinística + log de conflitos |
| Migração TS a quebrar runtime | Migração incremental por ficheiro + testes do fluxo dourado a cada passo |
| Atraso da conta/revisão da Play Store | Submissão antecipada + canal interno de distribuição como fallback |

**Dependências**

- Workflows Android/Desktop já existentes ✅ (base de CI)
- Design tokens alinhados com white-label (v1.3)

---

### 4.5 · v2.1 — Novos módulos BMS · **Q4 2027** · ⬜

**Objectivo:** alargar o catálogo de 19 → **26 módulos** com as áreas mais pedidas pelas PMEs moçambicanas, mantendo a matriz de permissões, o i18n e o licenciamento por plano.

**Épicos:**

#### E1 · RH & Folha ⬜
- [ ] Fichas e contratos de colaboradores
- [ ] Folha mensal com descontos de INSS (7% trabalhador + 7% entidade patronal) e tabelas de IRPS vigentes
- [ ] Recibos de vencimento em PDF

#### E2 · CRM com pipeline ⬜
- [ ] Oportunidades com etapas configuráveis (kanban)
- [ ] Conversão de oportunidade em encomenda/factura

#### E3 · Multi-armazém ⬜
- [ ] Stock por armazém/localização
- [ ] Transferências entre armazéns com documento e trilha de auditoria

#### E4 · Manutenção de activos ⬜
- [ ] Registo de activos com depreciação
- [ ] Planos preventivos e ordens de intervenção

#### E5 · Frota ⬜
- [ ] Viaturas, condutores, consumos e custos por viatura

#### E6 · Agenda & reservas ⬜
- [ ] Marcações por serviço/profissional (salões, clínicas, oficinas)
- [ ] Lembretes por email/SMS quando SMTP configurado

#### E7 · Ensaio/Compras com RFQ ⬜
- [ ] Requisição → RFQ a múltiplos fornecedores → comparativo → compra
- [ ] Aprovações por valor ligadas às permissões

**Critérios de aceitação**

1. Cada novo módulo cumpre a matriz de permissões (papel × módulo × acção) e o i18n pt/en.
2. A plataforma expõe os 26 módulos; os planos Profissional/Empresarial actualizados com a nova matriz.
3. Uma folha de salários de exemplo processa INSS/IRPS correctos contra tabela de teste.
4. Transferência entre armazéns move stock com `StockMovement` auditável.
5. RFQ produz comparativo de 3 fornecedores e gera compra aprovada.

**Riscos e mitigações**

| Risco | Mitigação |
| --- | --- |
| 7 módulos de uma vez = esforço enorme | Ordem por procura: RH → CRM → Multi-armazém → resto; cortar épicos se necessário |
| Complexidade fiscal da folha (IRPS) | Tabelas de teste validadas com contabilista parceiro antes do release |
| Catálogo a fragmentar a UX | Padrões de UI partilhados (CrudPage/DataTable) e review de design por módulo |

**Dependências**

- v2.0 (TypeScript + design system) como base técnica
- Matriz de planos/módulos na plataforma (já dinâmica ✅)

---

### 4.6 · v2.2 — BI & IA · **Q1 2028** · ⬜

**Objectivo:** transformar os dados acumulados em decisões: dashboards à carta, previsões acessíveis e um assistente em português que responde com números reais do próprio negócio.

**Épicos:**

#### E1 · Dashboards customizáveis ⬜
- [ ] Widgets arrastáveis salvos por utilizador (por área)
- [ ] Biblioteca de KPIs reutilizável entre módulos

#### E2 · Relatórios agendados por email ⬜
- [ ] Agendamento diário/semanal/mensal (fuso `Africa/Maputo`)
- [ ] Anexos PDF/XLSX com branding white-label

#### E3 · Previsão de stock ⬜
- [ ] Modelo de sazonalidade por SKU (baseline estatístico simples e explicável)
- [ ] Sugestão de quantidade e data de reposição

#### E4 · Detecção de anomalias em caixa ⬜
- [ ] Alertas para diferenças de caixa atípicas, estornos em série e descontos fora do padrão

#### E5 · Assistente IA em português ⬜
- [ ] Perguntas em linguagem natural sobre vendas/stock/financeiro (pt)
- [ ] Respostas com números do próprio BMS + fonte (consulta/tabela citada)
- [ ] Modo degradado sem rede (KPIs fixos, sem IA)

#### E6 · Sugestões de reposição ⬜
- [ ] Rascunho de encomenda ao fornecedor em 1 clique a partir da previsão

**Critérios de aceitação**

1. Utilizador monta um dashboard próprio e o layout sobrevive a logout/login.
2. Relatório agendado chega ao email no horário configurado, 3 semanas seguidas.
3. Previsão com erro médio <25% em SKUs sazonais do conjunto de teste.
4. Anomalia injectada em caixa de teste gera alerta <5 min após a venda.
5. Assistente responde «quanto vendi esta semana?» com o número exacto do BMS.

**Riscos e mitigações**

| Risco | Mitigação |
| --- | --- |
| IA a alucinar números | Acesso só a consultas agregadas + fonte citada + teste de regressão de respostas |
| Privacidade dos dados de negócio | IA executa sobre agregados; sem envio de dados pessoais; opt-out por empresa |
| Previsões erradas a gerar desconfiança | Modelo explicável + intervalo de confiança + feedback do utilizador |

**Dependências**

- v2.1 (26 módulos) para cobertura de dados
- Telemetria/health score para contexto de uso

---

### 4.7 · v2.3 — Compliance fiscal · **Q2 2028** · ⬜

**Objectivo:** cumprir a facturação electrónica e as obrigações fiscais moçambicanas **sem quebrar a simplicidade** — o cliente instala e fica conforme.

**Épicos:**

#### E1 · Facturação electrónica certificada (AGT) ⬜
- [ ] Integração com os requisitos da Autoridade Tributária de Moçambique (assinatura/certificação/validação)
- [ ] Ambiente de homologação com dados fictícios
- [ ] Estratégia de transição (PDF actual + electrónico a conviver)

#### E2 · IVA 16% multi-taxa ⬜
- [ ] Taxas por linha: 16% geral, 0%/isenções, situações especiais
- [ ] Resumo fiscal por período

#### E3 · Retenções ⬜
- [ ] Retenções na fonte (IRPC/IVA) em compras e serviços
- [ ] Mapas de retenções para o contabilista

#### E4 · Integração bancária ⬜
- [ ] Importação de extractos (CSV/OFX)
- [ ] Conciliação automática por valor + referência (meta de matching ≥90%)

#### E5 · Exportação SAF-T ⬜
- [ ] Ficheiro SAF-T (MZ) por período fiscal
- [ ] Validação de schema antes do download

**Critérios de aceitação**

1. Factura de teste aceite/validada no ambiente de homologação da AGT.
2. Venda com linha isenta + linha a 16% produz resumo fiscal correcto.
3. Retenção à taxa aplicável calculada e exportada no mapa do contabilista.
4. Extracto bancário de teste concilia ≥90% das linhas automaticamente.
5. SAF-T de um trimestre completo passa validação de schema sem erros.

**Riscos e mitigações**

| Risco | Mitigação |
| --- | --- |
| Especificações da AGT tardias/mudantes | Fasear cedo no ano, módulo fiscal isolado (adaptador), contacto directo com a AGT |
| Erros fiscais com impacto legal | Dupla validação (schema + regras de negócio) e período de conviverência |
| Contabilistas fora do sistema | Exportações conhecidas (mapas padrão) + formação dirigida |

**Dependências**

- v2.1 (multi-taxa base) e v1.2 (PDF com NUIT)
- Parceria contabilística para validação dos mapas

---

### 4.8 · v3.0 — Ecossistema · **Q3–Q4 2028** · ⬜

**Objectivo:** abrir a plataforma: marketplace com receita partilhada, API pública v2 do BMS, novos idiomas e países, e canal de revenda — de produto a ecossistema lusófono.

**Épicos:**

#### E1 · Marketplace de módulos ⬜
- [ ] SDK/padrão de módulo de terceiros (manifesto, permissões, migrações)
- [ ] Revisão de segurança e processo de aprovação
- [ ] Billing conjunto: desenvolvedor recebe ≥60% da receita do módulo

#### E2 · API pública v2 do BMS ⬜
- [ ] OAuth2 (client credentials) + versionamento `/api/v2`
- [ ] Webhooks do BMS (venda/stock/cliente) com assinatura HMAC
- [ ] Sandbox público com dados demo

#### E3 · Multi-idioma (pt/en/fr) ⬜
- [ ] Cobertura ≥95% das strings em francês
- [ ] Onboarding e documentação em 3 idiomas

#### E4 · Multi-país (Moçambique · Angola · Brasil) ⬜
- [ ] Moedas: MTn · Kwanza (AOA) · Real (BRL) com formatação por locale
- [ ] Réguas fiscais por país (MZ 16% · AO 14% · BR modelo simplificado com parceiro contabilístico)
- [ ] Instâncias regionais com latência adequada

#### E5 · Programa white-label reseller ⬜
- [ ] Sub-contas de revenda com marca própria
- [ ] Emissão de licenças em lote e relatório de comissões
- [ ] Formação e certificação de parceiros

**Critérios de aceitação**

1. ≥10 módulos de terceiros publicados no marketplace com parceria de receita activa.
2. Integração de terceiros autenticada via OAuth2 contra a sandbox, com webhook assinado recebido em teste.
3. França: interface e wizard completos em francês (audit de strings ≥95%).
4. Uma empresa piloto em Angola factura em Kwanza com IVA de 14% correcto.
5. Primeiro reseller emite 10 licenças em lote com a própria marca.

**Riscos e mitigações**

| Risco | Mitigação |
| --- | --- |
| Qualidade/segurança dos módulos de terceiros | Revisão obrigatória + sandbox + kill switch por módulo |
| Complexidade fiscal multi-país | Um país por vez, com parceiro local; réguas fiscais isoladas por adaptador |
| Canal reseller a canibalizar vendas directas | Regras de território/preço claras e relatório de comissões transparente |

**Dependências**

- API keys/webhooks v1.1 ✅ e white-label v1.3
- Marketplace depende da API v2 do BMS (E2 antes do E1 na prática)

---

## 5. 🛡️ Infra-estrutura e segurança transversal

### 5.1 · Backups 3-2-1 e recuperação de desastre

| Regra | Implementação |
| --- | --- |
| **3-2-1** | 3 cópias dos dados, 2 suportes diferentes, 1 fora do local principal |
| Plataforma | Dump diário da BD + export do storage; retenção: 30 diários + 12 mensais |
| BMS (cliente) | Guias por BD já documentadas ✅ (`docs/05`): SQLite `.backup` · Supabase snapshots · MySQL `mysqldump` |
| **DR** | RPO ≤ 15 min · RTO ≤ 4h; runbook de restauro **testado todos os trimestres** |

### 5.2 · Gestão de segredos

- Segredos só em `.env` (nunca versionado); exemplos em `.env.example`.
- Rotação: `AUTH_SECRET`/`JWT_SECRET` anuais ou após incidente; `whsec_` por webhook (regeneração imediata); `sk_live_` regenerável na plataforma ✅.
- Chaves nunca logadas na íntegra (máscara `CARSAI-••••-••••-XXXX` já implementada ✅).

### 5.3 · Testes de intrusão e hardening

- Pen-test externo **anual** (a partir de v1.3) + checklist OWASP ASVS L1 em cada release MAJOR.
- Rate limits: BMS global 300/15min e auth 20/15min ✅; plataforma: limites em `/api/activate` e `/api/telemetry` por IP + licença.
- Headers de segurança: helmet no BMS ✅; CSP progressiva na plataforma.

### 5.4 · Isolamento multi-tenant

- Toda a query filtra por `companyId` (app-level) — regra de revisão de código.
- Migração para PostgreSQL com **RLS** quando a plataforma escalar (v1.3+).
- Auditoria com actor, entidade e detalhes em todas as mutações ✅.

### 5.5 · Conformidade de dados

- **Minimização:** recolher só o necessário (NUIT, contacto); heartbeats sem dados de clientes finais.
- **Eliminação:** soft-delete + purga definitiva a pedido (SLA 30 dias).
- **Região:** dados de empresas moçambicas preferencialmente em servidores com latência <100 ms desde Maputo.
- **DPA** (acordo de tratamento de dados) para clientes Empresariais a partir de v1.3.

---

## 6. 📊 KPIs de negócio e metas

> Metas plausíveis para o mercado moçambicano, assumindo ARPU de ~3 000–3 500 MTn/mês (mistura dos planos Básico 1 500 · Profissional 3 500 · Empresarial 7 500 MTn).

| KPI | Meta 2026 | Meta 2027 | Meta 2028 | Como medir |
| --- | ---: | ---: | ---: | --- |
| **MRR** | ≥ 60 000 MTn | ≥ 240 000 MTn | ≥ 700 000 MTn (stretch 1 000 000) | Dashboard de billing |
| Empresas activas pagantes | 20 | 70 | 200 | BD da plataforma |
| Instâncias activas (24h) | 30 | 100 | 300 | Telemetria |
| Churn mensal | < 5% | < 4% | < 3% | Cancelamentos ÷ activas |
| NPS | > 40 | > 50 | > 60 | Inquérito trimestral |
| Uptime da plataforma | 99,5% | 99,9% | 99,9% | Monitor externo + status page |
| Custo de infra por instância/mês | < 300 MTn | < 200 MTn | < 150 MTn | Custos ÷ instâncias activas |
| ARPU (MTn/mês) | ~3 000 | ~3 400 | ~3 500 | MRR ÷ empresas activas |
| Tempo médio de instalação BMS | < 15 min | < 10 min | < 8 min | Telemetria (criação → 1º heartbeat) |
| Activação a 30 dias (instalação → uso real) | > 70% | > 80% | > 85% | Telemetria + vendas |

---

## 7. 🗓️ Cronograma trimestral 2026–2028

| Trimestre | Fase | Tema | Plataforma (`carsaibms-admin`) | BMS (`carsaibms`) | Marco de saída |
| :---: | :---: | --- | --- | --- | --- |
| **Q4 2026** | v1.1 | Fundação SaaS | Telemetria ✅ · Facturação ✅ · Webhooks ✅ · Emails · 2FA · Exportações · Heartbeat rico | Heartbeat de 6h ✅ | Factura de Outubro emitida e paga em MTn |
| **Q1 2027** | v1.2 | Self-service & Pagamentos | Portal do cliente · M-Pesa/e-Mola/cartão API · PDF com NUIT · Dunning · Notificações | Dark mode · ajustes para o portal | 1ª renovação 100% self-service |
| **Q2 2027** | v1.3 | Escala operacional | White-label · Multi-instância/failover · Alertas · Health score · SLO + status page | Suporte white-label/multi-instância | SLO 99,9% medido e publicado |
| **Q3 2027** | v2.0 | BMS 2.0 | Licenciamento para TS+PWA | Design system · POS offline · Android (Play Store) · Desktop assinado · TypeScript | APK assinado na Play Store |
| **Q4 2027** | v2.1 | Novos módulos | Matriz planos/módulos expandida (19 → 26) | RH & Folha · CRM · Multi-armazém · Activos · Frota · Agenda · RFQ | 1ª folha de salários processada |
| **Q1 2028** | v2.2 | BI & IA | BI base + telemetria enriquecida | Dashboards à carta · Relatórios agendados · Previsão de stock · Assistente IA pt | Cliente evita rutura de stock por previsão |
| **Q2 2028** | v2.3 | Compliance fiscal | Facturação electrónica AGT · retenções · SAF-T | IVA multi-taxa · conciliação bancária | Factura validada em homologação AGT |
| **Q3–Q4 2028** | v3.0 | Ecossistema | Marketplace · billing de terceiros · programa reseller | API pública v2 · francês · multi-país MZ/AO/BR | 10 módulos de terceiros publicados |

---

## 8. ⚠️ Riscos principais do produto

| # | Risco | Impacto | Probabilidade | Mitigação |
| :---: | --- | :---: | :---: | --- |
| R1 | Internet intermitente no interior do país | Alto | Alta | POS offline-first (v2.0), licenciamento offline, heartbeat tolerante ✅ |
| R2 | Instabilidade/latência das APIs móveis (M-Pesa/e-Mola) | Alto | Média | Abstracção de gateway + filas de reprocessamento + conciliação manual |
| R3 | Especificações da AGT tardias/mudantes | Alto | Média | Iniciar cedo (v2.3), módulo fiscal isolado em adaptador, contacto com a AGT |
| R4 | Concorrência (ERPs importados, planilhas, sistemas locais) | Médio | Alta | pt-MZ nativo, preço em MTn, M-Pesa/e-Mola, suporte local, TCO baixo |
| R5 | Abuso de licenças demo/chaves partilhadas | Médio | Média | Telemetria, limites por instância, revogação, auditoria `LICENSE_*` ✅ |
| R6 | Churn por baixa literacia digital | Médio | Alta | Wizard guiado, dados demo, templates de onboarding (v1.3), suporte próximo |
| R7 | Limites de concorrência do SQLite na plataforma | Médio | Média | Migração planeada para PostgreSQL + RLS (v1.3+) |
| R8 | Bus factor (equipa pequena) | Alto | Média | Worklog obrigatório, docs 01–07, roadmap público, governança clara |
| R9 | Depreciação/inflação do MTn vs. custos em USD | Médio | Média | Revisão anual de preços; custos de infra em MTn sempre que possível |
| R10 | Dependência de Vercel/GitHub/serviços gratuitos | Baixo | Baixa | Runbooks alternativos (VPS/Docker/PM2) já documentados ✅ |

---

## 9. 📖 Glossário

| Termo | Significado |
| --- | --- |
| **MRR** | *Monthly Recurring Revenue* — receita mensal recorrente das subscrições (planos MONTHLY; YEARLY mensalizada) |
| **ARPU** | Receita média por empresa activa (MRR ÷ empresas) |
| **Churn** | Percentagem de subscrições canceladas num mês |
| **Dunning** | Processo automático de cobrança de facturas vencidas: lembretes escalonados → suspensão |
| **Telemetria / heartbeat** | Sinal periódico (6h) que cada instância BMS envia à plataforma para provar vida e reportar uso |
| **White-label** | Versão com a marca própria do cliente (logo, cor, domínio) |
| **RFQ** | *Request For Quotation* — pedido de cotação a múltiplos fornecedores |
| **SAF-T** | *Standard Audit File for Tax* — ficheiro fiscal normalizado para as autoridades |
| **AGT** | Autoridade Tributária de Moçambique |
| **NUIT** | Número Único de Identificação Tributária |
| **INSS** | Instituto Nacional de Segurança Social (desconto na folha: 7% + 7%) |
| **IRPS / IRPC** | Imposto sobre o rendimento de pessoas singulares / colectivas |
| **TOTP / 2FA** | Autenticação de dois factores com código de tempo (30s) |
| **HMAC-SHA256** | Assinatura criptográfica dos webhooks (header `X-Carsai-Signature`) |
| **Idempotência** | Operação repetível sem efeitos duplicados (ex.: geração mensal de facturas) |
| **RLS** | *Row Level Security* — isolamento multi-tenant garantido pela base de dados |
| **3-2-1** | Estratégia de backups: 3 cópias, 2 suportes, 1 off-site |
| **RTO / RPO** | Tempo máximo de restauro / perda máxima de dados aceitável |
| **SLO** | *Service Level Objective* — alvo de disponibilidade (99,9%) |
| **PWA** | *Progressive Web App* — web app instalável com funcionamento offline |
| **Capacitor** | Runtime que empacota a web app em APK Android |
| **Electron** | Framework de aplicações desktop (Windows/Linux/macOS) |
| **POS** | *Point of Sale* — ponto de venda touch do BMS |
| **BMS** | *Business Management System* — o produto instalado nas empresas |
| **Gate 451/410** | Bloqueio da API do BMS antes (451) e depois (410) da instalação |
| **Marketplace** | Loja de módulos de terceiros com receita partilhada |
| **Health score** | Pontuação 0–100 da saúde de um cliente (uso, pagamentos, suporte) |
| **Failover** | Comutação para instância secundária quando a primária falha |
| **MTn** | Metical moçambicano (moeda) |

---

## 10. 🤝 Governança e como contribuir

### 10.1 · Papéis

| Papel | Quem | Responsabilidade |
| --- | --- | --- |
| **Maintainer** | `carsaimz` | Visão, roadmap, merges finais, relações comerciais |
| **Core team** | Orquestrador + agentes de sessão | Implementação por fases, revisão técnica, verificação E2E |
| **Contribuidores** | Comunidade | Issues, PRs, traduções, testes em campo |

### 10.2 · Processo trimestral

1. **Início do trimestre:** escolher os épicos da fase (este documento), estimar e abrir issues.
2. **Durante:** `worklog.md` obrigatório (append) + PRs pequenas + lint/tsc limpos.
3. **Fim:** demo do fluxo dourado, retro curta, `CHANGELOG.md` + tag da versão.

### 10.3 · Como contribuir

- [ ] Abre uma issue com o template (problema/proposta/módulo afectado)
- [ ] Fork + branch `feat/vX.Y-descricao` — nunca push directo em `main`
- [ ] Segue os 6 princípios da secção 1 (minimalista, modular, seguro, i18n, permissões)
- [ ] Português pré-Acordo em UI e docs; inglês em código e commits
- [ ] Testa o fluxo dourado (login → venda POS → relatório → heartbeat) antes do PR
- [ ] Acrescenta a tua secção ao `worklog.md` (append) com Stage Summary
- [ ] Nada de segredos ou chaves reais em commits

### 10.4 · Licenciamento

- **Código:** MIT nos dois repositórios públicos.
- **Marca, licenças comerciais e marketplace:** CarsaiDev.

---

> ## 🇲🇿 «Uma linha, uma solução.»
> **CarsaiDev — de Maputo para o mundo lusófono.** Este roadmap é um documento vivo: revê-se no fim de cada trimestre com dados da telemetria, do billing e do feedback dos clientes. *Cada linha de código tem de pagar o seu lugar — como cada venda no POS.*
