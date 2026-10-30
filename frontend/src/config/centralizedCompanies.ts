export interface CentralizedCompany {
  id: string
  name: string
  code: string
  initials: string
  role: 'Finance Approver' | 'Finance Viewer'
  status: {
    type: 'pending' | 'open' | 'overdue' | 'closed' | 'suspended'
    label: string
    variant: 'amber' | 'emerald' | 'rose' | 'slate' | 'muted'
  }
  isPinned: boolean
  isRecent: boolean
  needsAttention: boolean
  systemCompanyName: string
  lastOpenedText?: string
}

export const CENTRALIZED_COMPANIES: CentralizedCompany[] = [
  {
    id: 'mhbc',
    name: 'MCTolentino Hospitality Business Corp.',
    code: 'MHBC',
    initials: 'MH',
    role: 'Finance Approver',
    status: {
      type: 'pending',
      label: '5 pending approvals',
      variant: 'amber',
    },
    isPinned: true,
    isRecent: true,
    needsAttention: true,
    systemCompanyName: 'MCT Hotel',
    lastOpenedText: 'last opened today, 9:14 AM',
  },
  {
    id: 'mkc',
    name: 'MYCity. Kitchen. Corp.',
    code: 'MKC',
    initials: 'MK',
    role: 'Finance Approver',
    status: {
      type: 'open',
      label: 'Oct 2026 · Open',
      variant: 'emerald',
    },
    isPinned: true,
    isRecent: true,
    needsAttention: false,
    systemCompanyName: 'MCT Kitchen',
    lastOpenedText: 'last opened yesterday, 4:30 PM',
  },
  {
    id: 'jpv',
    name: 'JK Property Ventures Corp.',
    code: 'JPV',
    initials: 'JP',
    role: 'Finance Approver',
    status: {
      type: 'overdue',
      label: 'Bank rec overdue',
      variant: 'rose',
    },
    isPinned: true,
    isRecent: true,
    needsAttention: true,
    systemCompanyName: 'JK Property and Ventures',
    lastOpenedText: 'last opened 2 days ago',
  },
  {
    id: 'muh',
    name: 'MedSys Uni Horizon Pharma Corp.',
    code: 'MUH',
    initials: 'MU',
    role: 'Finance Approver',
    status: {
      type: 'open',
      label: 'Oct 2026 · Open',
      variant: 'emerald',
    },
    isPinned: false,
    isRecent: false,
    needsAttention: false,
    systemCompanyName: 'MedSys Uni Horizon Pharma Corp.',
  },
  {
    id: 'sctc',
    name: 'Speedfire Construction & Trading Corp.',
    code: 'SCTC',
    initials: 'SC',
    role: 'Finance Approver',
    status: {
      type: 'pending',
      label: '2 pending approvals',
      variant: 'amber',
    },
    isPinned: false,
    isRecent: false,
    needsAttention: true,
    systemCompanyName: 'Speedbox',
  },
  {
    id: 'feat',
    name: 'Far East Asia Trading Corp.',
    code: 'FEAT',
    initials: 'FE',
    role: 'Finance Viewer',
    status: {
      type: 'open',
      label: 'Oct 2026 · Open',
      variant: 'emerald',
    },
    isPinned: false,
    isRecent: false,
    needsAttention: false,
    systemCompanyName: 'Far East Asia Trading Corp.',
  },
  {
    id: 'mtcf',
    name: 'MC. Tolentino College Foundation, Inc.',
    code: 'MTCF',
    initials: 'MC',
    role: 'Finance Approver',
    status: {
      type: 'open',
      label: 'Oct 2026 · Open',
      variant: 'emerald',
    },
    isPinned: false,
    isRecent: false,
    needsAttention: false,
    systemCompanyName: 'MC. Tolentino College Foundation, Inc.',
  },
  {
    id: 'bbmp',
    name: 'Bagong Bansa May Pagasa Movement, Inc.',
    code: 'BBMP',
    initials: 'BB',
    role: 'Finance Viewer',
    status: {
      type: 'closed',
      label: 'Sep 2026 · Closed',
      variant: 'slate',
    },
    isPinned: false,
    isRecent: false,
    needsAttention: false,
    systemCompanyName: 'Bagong Bansa May Pagasa Movement, Inc.',
  },
  {
    id: 'jgh',
    name: 'JK Global Headways Business Solutions Corp.',
    code: 'JGH',
    initials: 'JG',
    role: 'Finance Approver',
    status: {
      type: 'open',
      label: 'Oct 2026 · Open',
      variant: 'emerald',
    },
    isPinned: false,
    isRecent: false,
    needsAttention: false,
    systemCompanyName: 'JK Printing',
  },
  {
    id: 'bsst',
    name: 'Bookworld Systems Solutions & Technologies Corp.',
    code: 'BSST',
    initials: 'BW',
    role: 'Finance Approver',
    status: {
      type: 'pending',
      label: '1 pending approval',
      variant: 'amber',
    },
    isPinned: false,
    isRecent: false,
    needsAttention: true,
    systemCompanyName: 'Bookworld Systems Solutions & Technologies Corp.',
  },
  {
    id: 'fphc',
    name: 'Filcam Prime Holdings Corp.',
    code: 'FPHC',
    initials: 'FP',
    role: 'Finance Approver',
    status: {
      type: 'open',
      label: 'Oct 2026 · Open',
      variant: 'emerald',
    },
    isPinned: false,
    isRecent: false,
    needsAttention: false,
    systemCompanyName: 'FilCap Prime Holdings Corp.',
  },
  {
    id: 'gjpv',
    name: 'Golden Jupiter Property Ventures Corp.',
    code: 'GJPV',
    initials: 'GJ',
    role: 'Finance Viewer',
    status: {
      type: 'suspended',
      label: 'Suspended · contact admin',
      variant: 'muted',
    },
    isPinned: false,
    isRecent: false,
    needsAttention: false,
    systemCompanyName: 'Golden Jupiter Property Ventures Corp.',
  },
]

const PINNED_STORAGE_KEY = 'mct_centralized_pinned_companies'
const LAST_OPENED_STORAGE_KEY = 'mct_last_opened_company_info'

export function getStoredPinnedIds(): string[] {
  if (typeof window === 'undefined') return ['mhbc', 'mkc', 'jpv']
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY)
    if (!raw) return ['mhbc', 'mkc', 'jpv']
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : ['mhbc', 'mkc', 'jpv']
  } catch {
    return ['mhbc', 'mkc', 'jpv']
  }
}

export function saveStoredPinnedIds(ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(ids))
  } catch (e) {
    console.error('Failed to save pinned companies', e)
  }
}

export interface LastOpenedInfo {
  companyId: string
  companyName: string
  systemName: string
  timestamp: string
}

export function getLastOpenedCompany(): LastOpenedInfo {
  const fallback: LastOpenedInfo = {
    companyId: 'mhbc',
    companyName: 'MCTolentino Hospitality Business Corp.',
    systemName: 'MCT Hotel',
    timestamp: 'last opened today, 9:14 AM',
  }
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(LAST_OPENED_STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed.companyName ? parsed : fallback
  } catch {
    return fallback
  }
}

export function saveLastOpenedCompany(info: LastOpenedInfo): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LAST_OPENED_STORAGE_KEY, JSON.stringify(info))
  } catch (e) {
    console.error('Failed to save last opened company', e)
  }
}
