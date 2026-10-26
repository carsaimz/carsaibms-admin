/**
 * Dicionários i18n — Facturação e Instâncias (telemetria).
 * Preenchido pelo agente 9-e. Só este ficheiro + billing-view.tsx e
 * instances-view.tsx podem ser alterados por esse agente.
 *
 * CONTRATO: exportar objetos RAIZ por idioma (mesmo formato de
 * CORE_LOCALES.pt / CORE_LOCALES.en em locales.ts). Os namespaces
 * deste ficheiro devem ser únicos e não colidir com o núcleo.
 *
 * Namespaces: billing (facturação) · instances (telemetria).
 * Os estados das facturas (OPEN/PAID/OVERDUE/CANCELLED) NÃO estão
 * aqui — reutilizam statuses.* do núcleo (locales.ts).
 *
 * CarsaiDev — Uma linha, uma solução. 🇲🇿
 */

const pt: Record<string, unknown> = {
  billing: {
    title: 'Facturação',
    description: 'Facturas de subscrição das empresas cliente',
    paymentMethods: {
      MPESA: 'M-Pesa',
      EMOLA: 'e-Mola',
      TRANSFER: 'Transferência',
      CASH: 'Numerário',
      CARD: 'Cartão',
    },
    kpis: {
      open: 'Em aberto',
      overdue: 'Em atraso',
      collected: 'Cobrado (total)',
      collectedHint: '{n} facturas pagas',
      collectRate: 'Taxa de cobrança',
      collectRateHint: '{paid} pagas de {total} emitidas',
    },
    filters: {
      status: 'Estado',
      searchPlaceholder: 'Nº da factura ou empresa…',
      allStatuses: 'Todos os estados',
    },
    actions: {
      newInvoice: 'Nova factura',
      generateMonth: 'Gerar facturas do mês',
      generate: 'Gerar facturas',
      createInvoice: 'Criar factura',
      markAsPaid: 'Marcar como paga',
      reopen: 'Reabrir',
      back: 'Voltar',
      confirmPayment: 'Confirmar pagamento',
    },
    table: {
      number: 'Nº',
      company: 'Empresa',
      plan: 'Plano',
      period: 'Período',
      amount: 'Valor',
      dueAt: 'Vencimento',
      status: 'Estado',
      payment: 'Pagamento',
      actions: 'Acções',
      rowAria: 'Acções para a factura {number}',
    },
    generateDialog: {
      title: 'Gerar facturas do mês',
      description:
        'Cria facturas para todas as empresas activas com plano mensal. Planos anuais só são facturados em Janeiro. Facturas já existentes para o mês são ignoradas.',
      month: 'Mês de referência',
    },
    createDialog: {
      title: 'Nova factura',
      description: 'Cria uma factura manual para uma empresa cliente.',
      company: 'Empresa',
      companyAria: 'Empresa da factura',
      companyPlaceholder: 'Escolher empresa…',
      noCompanies: 'Sem empresas registadas',
      amount: 'Valor (MTn)',
      periodStart: 'Início do período',
      periodEnd: 'Fim do período',
      dueAt: 'Vencimento',
      notes: 'Notas (opcional)',
      notesPlaceholder: 'Ex.: desconto negociado, referência do contrato…',
    },
    payDialog: {
      title: 'Marcar factura como paga',
      method: 'Método de pagamento',
    },
    confirm: {
      cancelTitle: 'Cancelar factura {number}?',
      cancelDescription:
        'A factura ficará no estado "Cancelada" e deixará de contar para os valores em aberto. Pode reabri-la mais tarde.',
      cancelConfirm: 'Cancelar factura',
      deleteTitle: 'Eliminar factura {number}?',
      deleteDescription: 'A factura será removida permanentemente. Esta acção não pode ser revertida.',
    },
    empty: {
      title: 'Ainda não existem facturas',
      description: 'Gere as facturas do mês para as empresas com planos activos.',
      filteredTitle: 'Nenhuma factura encontrada',
      filteredDescription: 'Ajuste os filtros de pesquisa para ver mais resultados.',
    },
    errors: {
      loadFail: 'Não foi possível carregar a facturação',
      loadInvoices: 'Erro ao carregar facturas',
      loadFallback: 'Erro ao carregar a facturação.',
    },
    toasts: {
      invalidMonth: 'Escolha um mês válido.',
      generated: '{created} facturas geradas, {skipped} já existentes',
      generateFail: 'Erro ao gerar facturas.',
      chooseCompany: 'Escolha a empresa.',
      invalidAmount: 'Indique um valor válido maior que zero.',
      missingDates: 'Preencha o período e a data de vencimento.',
      created: 'Factura {number} criada.',
      createFail: 'Erro ao criar a factura.',
      markedPaid: 'Factura {number} marcada como paga.',
      payFail: 'Erro ao marcar a factura como paga.',
      reopened: 'Factura {number} reaberta.',
      reopenFail: 'Erro ao reabrir a factura.',
      cancelled: 'Factura {number} cancelada.',
      cancelFail: 'Erro ao cancelar a factura.',
      deleted: 'Factura {number} eliminada.',
      deleteFail: 'Erro ao eliminar a factura.',
    },
  },
  instances: {
    title: 'Instâncias',
    description: 'Telemetria das instalações Carsai BMS em tempo real',
    status: {
      ONLINE: 'Online',
      DORMANT: 'Dormente',
      OFFLINE: 'Offline',
    },
    actions: {
      refresh: 'Actualizar',
      refreshAria: 'Actualizar dados',
    },
    kpis: {
      total: 'Total de instâncias',
      totalHint: 'Instalações conhecidas',
      active24h: 'Activas (24h)',
      activeHint: 'Heartbeat nas últimas 24 horas',
      dormant: 'Dormentes (1–7d)',
      dormantHint: 'Sem heartbeat há 1 a 7 dias',
      offline: 'Offline (>7d)',
      offlineHint: 'Sem heartbeat há mais de 7 dias',
    },
    filters: {
      searchPlaceholder: 'Instância, empresa ou versão…',
      company: 'Empresa',
      allCompanies: 'Todas as empresas',
    },
    table: {
      company: 'Empresa',
      instance: 'Instância',
      version: 'Versão',
      dbEngine: 'Motor BD',
      users: 'Utilizadores',
      firstSeen: 'Primeira conexão',
      lastSeen: 'Última conexão',
      status: 'Estado',
    },
    errors: {
      loadFail: 'Não foi possível carregar as instâncias',
      loadInstances: 'Erro ao carregar instâncias',
      loadFallback: 'Erro ao carregar as instâncias.',
    },
    empty: {
      title: 'Ainda não há instâncias registadas',
      description:
        'As instalações BMS aparecem aqui quando activam a licença e enviam o primeiro heartbeat.',
      filteredTitle: 'Nenhuma instância encontrada',
      filteredDescription: 'Ajuste os filtros de pesquisa para ver mais resultados.',
    },
  },
}

const en: Record<string, unknown> = {
  billing: {
    title: 'Billing',
    description: 'Subscription invoices for customer companies',
    paymentMethods: {
      MPESA: 'M-Pesa',
      EMOLA: 'e-Mola',
      TRANSFER: 'Bank transfer',
      CASH: 'Cash',
      CARD: 'Card',
    },
    kpis: {
      open: 'Open',
      overdue: 'Overdue',
      collected: 'Collected (total)',
      collectedHint: '{n} invoices paid',
      collectRate: 'Collection rate',
      collectRateHint: '{paid} paid of {total} issued',
    },
    filters: {
      status: 'Status',
      searchPlaceholder: 'Invoice number or company…',
      allStatuses: 'All statuses',
    },
    actions: {
      newInvoice: 'New invoice',
      generateMonth: 'Generate invoices for the month',
      generate: 'Generate invoices',
      createInvoice: 'Create invoice',
      markAsPaid: 'Mark as paid',
      reopen: 'Reopen',
      back: 'Back',
      confirmPayment: 'Confirm payment',
    },
    table: {
      number: '#',
      company: 'Company',
      plan: 'Plan',
      period: 'Period',
      amount: 'Amount',
      dueAt: 'Due date',
      status: 'Status',
      payment: 'Payment',
      actions: 'Actions',
      rowAria: 'Actions for invoice {number}',
    },
    generateDialog: {
      title: 'Generate invoices for the month',
      description:
        'Creates invoices for all active companies on monthly plans. Yearly plans are only billed in January. Invoices that already exist for the month are skipped.',
      month: 'Reference month',
    },
    createDialog: {
      title: 'New invoice',
      description: 'Creates a manual invoice for a customer company.',
      company: 'Company',
      companyAria: 'Invoice company',
      companyPlaceholder: 'Choose a company…',
      noCompanies: 'No companies registered',
      amount: 'Amount (MTn)',
      periodStart: 'Period start',
      periodEnd: 'Period end',
      dueAt: 'Due date',
      notes: 'Notes (optional)',
      notesPlaceholder: 'E.g.: negotiated discount, contract reference…',
    },
    payDialog: {
      title: 'Mark invoice as paid',
      method: 'Payment method',
    },
    confirm: {
      cancelTitle: 'Cancel invoice {number}?',
      cancelDescription:
        'The invoice will be set to "Cancelled" and will no longer count towards open amounts. You can reopen it later.',
      cancelConfirm: 'Cancel invoice',
      deleteTitle: 'Delete invoice {number}?',
      deleteDescription: 'The invoice will be permanently removed. This action cannot be undone.',
    },
    empty: {
      title: 'No invoices yet',
      description: 'Generate the monthly invoices for companies with active plans.',
      filteredTitle: 'No invoices found',
      filteredDescription: 'Adjust the search filters to see more results.',
    },
    errors: {
      loadFail: 'Could not load billing',
      loadInvoices: 'Error loading invoices',
      loadFallback: 'Error loading billing.',
    },
    toasts: {
      invalidMonth: 'Choose a valid month.',
      generated: '{created} invoices generated, {skipped} already existing',
      generateFail: 'Could not generate invoices.',
      chooseCompany: 'Choose the company.',
      invalidAmount: 'Enter a valid amount greater than zero.',
      missingDates: 'Fill in the period and the due date.',
      created: 'Invoice {number} created.',
      createFail: 'Could not create the invoice.',
      markedPaid: 'Invoice {number} marked as paid.',
      payFail: 'Could not mark the invoice as paid.',
      reopened: 'Invoice {number} reopened.',
      reopenFail: 'Could not reopen the invoice.',
      cancelled: 'Invoice {number} cancelled.',
      cancelFail: 'Could not cancel the invoice.',
      deleted: 'Invoice {number} deleted.',
      deleteFail: 'Could not delete the invoice.',
    },
  },
  instances: {
    title: 'Instances',
    description: 'Real-time telemetry from Carsai BMS installations',
    status: {
      ONLINE: 'Online',
      DORMANT: 'Dormant',
      OFFLINE: 'Offline',
    },
    actions: {
      refresh: 'Refresh',
      refreshAria: 'Refresh data',
    },
    kpis: {
      total: 'Total instances',
      totalHint: 'Known installations',
      active24h: 'Active (24h)',
      activeHint: 'Heartbeat in the last 24 hours',
      dormant: 'Dormant (1–7d)',
      dormantHint: 'No heartbeat for 1 to 7 days',
      offline: 'Offline (>7d)',
      offlineHint: 'No heartbeat for more than 7 days',
    },
    filters: {
      searchPlaceholder: 'Instance, company or version…',
      company: 'Company',
      allCompanies: 'All companies',
    },
    table: {
      company: 'Company',
      instance: 'Instance',
      version: 'Version',
      dbEngine: 'DB engine',
      users: 'Users',
      firstSeen: 'First seen',
      lastSeen: 'Last seen',
      status: 'Status',
    },
    errors: {
      loadFail: 'Could not load instances',
      loadInstances: 'Error loading instances',
      loadFallback: 'Error loading instances.',
    },
    empty: {
      title: 'No instances registered yet',
      description:
        'BMS installations appear here once they activate their license and send their first heartbeat.',
      filteredTitle: 'No instances found',
      filteredDescription: 'Adjust the search filters to see more results.',
    },
  },
}

export const billingPt = pt
export const billingEn = en
