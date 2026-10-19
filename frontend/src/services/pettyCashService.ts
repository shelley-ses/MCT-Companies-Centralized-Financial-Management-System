// Petty cash wallet (one per company). Top-ups move sales cash into the wallet;
// expenses paid with "Petty Cash" are deducted from it. The balance is computed
// by the backend, so there is no local fallback: when the backend is unreachable
// the calls throw and callers show the wallet as unavailable.

export const PETTY_CASH_METHOD = 'Petty Cash'

export const isPettyCashMethod = (method?: string | null): boolean =>
  (method || '').trim().toLowerCase() === PETTY_CASH_METHOD.toLowerCase()

export interface PettyCashSummary {
  companyId: number
  companyName: string
  balance: number
  totalTopUps: number
  totalSpent: number
  periodTopUps: number
  periodSpent: number
  lowBalanceThreshold: number
  isLow: boolean
}

export interface PettyCashLedgerEntry {
  id: string
  type: 'topup' | 'expense'
  recordId: number
  date: string
  description: string
  category?: string | null
  referenceNo?: string | null
  amountIn: number
  amountOut: number
  runningBalance: number
}

export interface NewPettyCashTopUpInput {
  company: string
  amount: number
  date: string
  referenceNo?: string
  description?: string
}

export interface PettyCashPeriod {
  startDate?: string | null
  endDate?: string | null
}

interface BackendSummary {
  company_id: number
  company_name: string
  balance: string | number
  total_topups: string | number
  total_spent: string | number
  period_topups: string | number
  period_spent: string | number
  low_balance_threshold: string | number
  is_low: boolean
}

interface BackendLedgerEntry {
  entry_id: string
  entry_type: 'topup' | 'expense'
  record_id: number
  entry_date: string
  description: string
  category?: string | null
  reference_no?: string | null
  amount_in: string | number
  amount_out: string | number
  running_balance: string | number
}

function backendHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? sessionStorage.getItem('mct_access_token') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function getBackendError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => ({}))
  return new Error(
    typeof body.detail === 'string' ? body.detail : `Petty cash request failed (${response.status}).`
  )
}

function mapSummary(data: BackendSummary): PettyCashSummary {
  return {
    companyId: data.company_id,
    companyName: data.company_name,
    balance: Number(data.balance),
    totalTopUps: Number(data.total_topups),
    totalSpent: Number(data.total_spent),
    periodTopUps: Number(data.period_topups),
    periodSpent: Number(data.period_spent),
    lowBalanceThreshold: Number(data.low_balance_threshold),
    isLow: data.is_low,
  }
}

function mapLedgerEntry(data: BackendLedgerEntry): PettyCashLedgerEntry {
  return {
    id: data.entry_id,
    type: data.entry_type,
    recordId: data.record_id,
    date: data.entry_date,
    description: data.description,
    category: data.category,
    referenceNo: data.reference_no,
    amountIn: Number(data.amount_in),
    amountOut: Number(data.amount_out),
    runningBalance: Number(data.running_balance),
  }
}

function buildQuery(params: Record<string, string | null | undefined>): string {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })
  const str = query.toString()
  return str ? `?${str}` : ''
}

export const pettyCashService = {
  async getSummary(company: string, period: PettyCashPeriod = {}): Promise<PettyCashSummary> {
    const query = buildQuery({
      company_name: company,
      start_date: period.startDate,
      end_date: period.endDate,
    })
    const response = await fetch(`/api/v1/petty-cash/summary${query}`, { headers: backendHeaders() })
    if (!response.ok) throw await getBackendError(response)
    return mapSummary(await response.json())
  },

  /** One summary per company with petty cash activity (used for "All Companies"). */
  async getAllSummaries(period: PettyCashPeriod = {}): Promise<PettyCashSummary[]> {
    const query = buildQuery({ start_date: period.startDate, end_date: period.endDate })
    const response = await fetch(`/api/v1/petty-cash/summaries${query}`, { headers: backendHeaders() })
    if (!response.ok) throw await getBackendError(response)
    return ((await response.json()) as BackendSummary[]).map(mapSummary)
  },

  async getLedger(company: string, period: PettyCashPeriod = {}): Promise<PettyCashLedgerEntry[]> {
    const query = buildQuery({
      company_name: company,
      start_date: period.startDate,
      end_date: period.endDate,
    })
    const response = await fetch(`/api/v1/petty-cash/ledger${query}`, { headers: backendHeaders() })
    if (!response.ok) throw await getBackendError(response)
    return ((await response.json()) as BackendLedgerEntry[]).map(mapLedgerEntry)
  },

  async createTopUp(input: NewPettyCashTopUpInput): Promise<void> {
    const response = await fetch('/api/v1/petty-cash/topups', {
      method: 'POST',
      headers: backendHeaders(),
      body: JSON.stringify({
        company: input.company,
        amount: input.amount,
        topup_date: input.date,
        reference_no: input.referenceNo || null,
        description: input.description || null,
      }),
    })
    if (!response.ok) throw await getBackendError(response)
  },

  async deleteTopUp(topUpId: number): Promise<void> {
    const response = await fetch(`/api/v1/petty-cash/topups/${topUpId}`, {
      method: 'DELETE',
      headers: backendHeaders(),
    })
    if (!response.ok) throw await getBackendError(response)
  },

  async updateThreshold(company: string, threshold: number): Promise<PettyCashSummary> {
    const response = await fetch(`/api/v1/petty-cash/wallet${buildQuery({ company_name: company })}`, {
      method: 'PUT',
      headers: backendHeaders(),
      body: JSON.stringify({ low_balance_threshold: threshold }),
    })
    if (!response.ok) throw await getBackendError(response)
    return mapSummary(await response.json())
  },
}
