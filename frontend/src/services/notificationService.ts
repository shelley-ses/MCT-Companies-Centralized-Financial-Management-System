import { billsService, getBillPaymentOptions, type BillItem } from './billsService'
import {
  lendingService,
  getMonthlyProgress,
  type LendingFacility,
} from './lendingService'
import { loanService, type LoanItem } from './loanService'
import { tenantService, type TenantLease } from './tenantService'
import { getLeaseFinancials } from './tenantScheduleService'
import { formatPHP } from '@/lib/format'
import { isCompanyMatch } from '@/utils/companyUtils'
import { isFilCapCompany, isJKPropertyCompany } from '@/config/companyFeatures'

export interface NotificationItemOut {
  notification_id: string
  notification_type: string
  title: string
  message: string
  company_id?: number | null
  reference_type?: string | null
  reference_id?: number | null
  is_read?: boolean
  created_at?: string | null
}

export interface NotificationCountResult {
  unread_count: number
}

export const NOTIFICATION_UPDATED_EVENT = 'mct:notifications-updated'

export function notifyNotificationsUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_UPDATED_EVENT))
  }
}

const ACCESS_TOKEN_KEY = 'mct_access_token'

function getAuthHeaders(userRole?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }
  if (userRole) {
    headers['X-User-Role'] = userRole
  }
  return headers
}

const OVERDUE_TYPES = new Set([
  'BILL_OVERDUE',
  'LENDING_OVERDUE',
  'LENDING_INSTALLMENT_OVERDUE',
  'LOAN_OVERDUE',
  'TENANT_OVERDUE',
])

const DUE_TODAY_TYPES = new Set([
  'BILL_DUE_TODAY',
  'LENDING_DUE_TODAY',
  'LOAN_DUE_TODAY',
  'TENANT_DUE_TODAY',
])

const DUE_SOON_TYPES = new Set([
  'BILL_DUE_TOMORROW',
  'BILL_DUE_SOON',
  'LENDING_DUE_TOMORROW',
  'LENDING_DUE_SOON',
  'LOAN_DUE_TOMORROW',
  'LOAN_DUE_SOON',
  'TENANT_DUE_TOMORROW',
  'TENANT_DUE_SOON',
  'PETTY_CASH_LOW_BALANCE',
])

function getUrgencyPriority(type: string): number {
  if (OVERDUE_TYPES.has(type)) return 0
  if (DUE_TODAY_TYPES.has(type)) return 1
  if (DUE_SOON_TYPES.has(type)) return 2
  return 3
}

function getLocalTodayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatReadableDate(isoStr: string): string {
  try {
    const clean = isoStr.split('T')[0]
    const d = new Date(`${clean}T00:00:00`)
    if (isNaN(d.getTime())) return isoStr
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    })
  } catch {
    return isoStr
  }
}

function diffDaysFromToday(targetDateStr: string, todayStr: string): number {
  const cleanTarget = targetDateStr.split('T')[0]
  const target = new Date(`${cleanTarget}T00:00:00`)
  const today = new Date(`${todayStr}T00:00:00`)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function buildBillClientNotifications(
  bills: BillItem[],
  companyFilter?: string
): NotificationItemOut[] {
  const items: NotificationItemOut[] = []
  const todayStr = getLocalTodayISO()
  const nowIso = new Date().toISOString()

  const scoped =
    companyFilter && companyFilter !== 'All Companies'
      ? bills.filter((b) => isCompanyMatch(b.company, companyFilter))
      : bills

  scoped.forEach((b) => {
    const billNumId = parseInt(String(b.id).replace(/\D/g, ''), 10) || 0
    const options = getBillPaymentOptions(b)
    const nextPayable = options.nextPayable
    const nextDue = nextPayable?.periodDate || b.nextPeriodDate || b.dueDate

    if (nextDue && b.status !== 'Paid') {
      const periodKey = nextPayable?.key || b.nextPeriodKey || nextDue
      const periodLabel = nextPayable?.label || b.nextPeriodLabel || formatReadableDate(nextDue)
      const remAmt =
        (nextPayable?.remainingAmount && nextPayable.remainingAmount > 0
          ? nextPayable.remainingAmount
          : nextPayable?.billedAmount && nextPayable.billedAmount > 0
            ? nextPayable.billedAmount
            : b.latestAmount && b.latestAmount > 0
              ? b.latestAmount
              : b.amount) || 0

      const amtStr = remAmt > 0 ? ` Amount due: ${formatPHP(remAmt)}.` : ''
      const isPartial = Boolean(nextPayable?.partiallyPaid || b.status === 'Partially Paid')
      const partialTag = isPartial ? ' (Partially Paid)' : ''
      const daysDiff = diffDaysFromToday(nextDue, todayStr)
      const reminderWindow = Math.max(b.reminderDaysBefore || 3, 7)
      const readableDue = formatReadableDate(nextDue)

      if (daysDiff < 0) {
        const overdueDays = Math.abs(daysDiff)
        items.push({
          notification_id: `BILL_OVERDUE-${billNumId}-${periodKey}`,
          notification_type: 'BILL_OVERDUE',
          title: `Overdue Bill${partialTag}: ${b.billerName}`,
          message: `${b.billerName} (${b.company}) for ${periodLabel} was due on ${readableDue} (${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue).${amtStr}`,
          reference_type: 'bill',
          reference_id: billNumId,
          is_read: false,
          created_at: nowIso,
        })
      } else if (daysDiff === 0) {
        items.push({
          notification_id: `BILL_DUE_TODAY-${billNumId}-${periodKey}`,
          notification_type: 'BILL_DUE_TODAY',
          title: `Bill Due Today${partialTag}: ${b.billerName}`,
          message: `${b.billerName} (${b.company}) for ${periodLabel} is due TODAY (${readableDue})!${amtStr}`,
          reference_type: 'bill',
          reference_id: billNumId,
          is_read: false,
          created_at: nowIso,
        })
      } else if (daysDiff === 1) {
        items.push({
          notification_id: `BILL_DUE_TOMORROW-${billNumId}-${periodKey}`,
          notification_type: 'BILL_DUE_TOMORROW',
          title: `Bill Due Tomorrow${partialTag}: ${b.billerName}`,
          message: `${b.billerName} (${b.company}) for ${periodLabel} is due tomorrow (${readableDue}).${amtStr}`,
          reference_type: 'bill',
          reference_id: billNumId,
          is_read: false,
          created_at: nowIso,
        })
      } else if (daysDiff > 1 && daysDiff <= reminderWindow) {
        items.push({
          notification_id: `BILL_DUE_SOON-${billNumId}-${periodKey}`,
          notification_type: 'BILL_DUE_SOON',
          title: `Bill Due in ${daysDiff} Days${partialTag}: ${b.billerName}`,
          message: `${b.billerName} (${b.company}) for ${periodLabel} is due on ${readableDue} (${daysDiff} days left).${amtStr}`,
          reference_type: 'bill',
          reference_id: billNumId,
          is_read: false,
          created_at: nowIso,
        })
      }
    }

    // Recent bill payments
    ;(b.payments || []).slice(0, 2).forEach((p) => {
      const payNumId = parseInt(String(p.id).replace(/\D/g, ''), 10) || p.id
      const matchingPeriod = (b.periods || []).find((per) => per.key === p.periodKey)
      const isPeriodPaid = matchingPeriod ? matchingPeriod.paid : true
      const ntype = isPeriodPaid ? 'BILL_PAID' : 'BILL_PARTIALLY_PAID'
      const pLabel = matchingPeriod?.label || p.periodKey || p.paymentDate
      items.push({
        notification_id: `${ntype}-${billNumId}-${payNumId}`,
        notification_type: ntype,
        title: isPeriodPaid
          ? `Bill Payment Recorded: ${b.billerName}`
          : `Partial Bill Payment: ${b.billerName}`,
        message: `Payment of ${formatPHP(p.amount)} recorded for ${b.billerName} (${b.company}) — ${pLabel} via ${p.paymentMethod}.`,
        reference_type: 'bill',
        reference_id: billNumId,
        is_read: false,
        created_at: p.createdAt || p.paymentDate,
      })
    })
  })

  return items
}

function buildLendingClientNotifications(
  facilities: LendingFacility[],
  companyFilter?: string
): NotificationItemOut[] {
  if (
    companyFilter &&
    companyFilter !== 'All Companies' &&
    !isFilCapCompany(companyFilter)
  ) {
    return []
  }

  const items: NotificationItemOut[] = []
  const todayStr = getLocalTodayISO()
  const nowIso = new Date().toISOString()

  facilities.forEach((f) => {
    const bid =
      f.borrower_id ??
      f.borrowerId ??
      (parseInt(String(f.id || f.loanId).replace(/\D/g, ''), 10) || 0)
    const bname = f.borrowerName || 'Borrower'
    const ref = f.borrowerRefNo || f.borrower_ref_no || f.loanRefNo || `BOR-${bid}`
    const rem = Number(f.remainingBalance || 0)
    const freq = f.paymentFrequency || 'Daily'
    const target = Number(f.installmentTarget || 0)
    const penalties = Number(f.totalPenalties || 0)
    const missedCount = Number(f.missedCyclesCount || 0)
    const compliance = f.complianceStatus || 'Compliant'
    const payments = f.dailyPayments || []

    if (rem > 0 && f.status !== 'Completed') {
      // 1. Maturity due date reminders
      if (f.dueDate) {
        const diffDays = diffDaysFromToday(f.dueDate, todayStr)
        const readableDue = formatReadableDate(f.dueDate)

        if (diffDays < 0) {
          const overdueDays = Math.abs(diffDays)
          items.push({
            notification_id: `LENDING_OVERDUE-${bid}`,
            notification_type: 'LENDING_OVERDUE',
            title: `Overdue Lending Facility: ${bname}`,
            message: `${bname} (${ref}) maturity due date was ${readableDue} (${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue). Remaining balance: ${formatPHP(rem)}.`,
            reference_type: 'lending',
            reference_id: bid,
            is_read: false,
            created_at: nowIso,
          })
        } else if (diffDays === 0) {
          items.push({
            notification_id: `LENDING_DUE_TODAY-maturity-${bid}-${todayStr}`,
            notification_type: 'LENDING_DUE_TODAY',
            title: `Lending Maturity Due Today: ${bname}`,
            message: `${bname} (${ref}) lending facility matures TODAY (${readableDue})! Remaining balance: ${formatPHP(rem)}.`,
            reference_type: 'lending',
            reference_id: bid,
            is_read: false,
            created_at: nowIso,
          })
        } else if (diffDays === 1) {
          items.push({
            notification_id: `LENDING_DUE_TOMORROW-maturity-${bid}-${f.dueDate.split('T')[0]}`,
            notification_type: 'LENDING_DUE_TOMORROW',
            title: `Lending Maturity Due Tomorrow: ${bname}`,
            message: `${bname} (${ref}) lending facility matures tomorrow (${readableDue}). Remaining balance: ${formatPHP(rem)}.`,
            reference_type: 'lending',
            reference_id: bid,
            is_read: false,
            created_at: nowIso,
          })
        } else if (diffDays > 1 && diffDays <= 7) {
          items.push({
            notification_id: `LENDING_DUE_SOON-maturity-${bid}-${f.dueDate.split('T')[0]}`,
            notification_type: 'LENDING_DUE_SOON',
            title: `Lending Maturity Due in ${diffDays} Days: ${bname}`,
            message: `${bname} (${ref}) lending facility matures on ${readableDue} (${diffDays} days left). Remaining balance: ${formatPHP(rem)}.`,
            reference_type: 'lending',
            reference_id: bid,
            is_read: false,
            created_at: nowIso,
          })
        }
      }

      // 2. Installment / Cycle due date reminders
      if (freq === 'Daily') {
        if (missedCount > 0) {
          const penStr = penalties > 0 ? ` Accrued penalties: ${formatPHP(penalties)}.` : ''
          items.push({
            notification_id: `LENDING_INSTALLMENT_OVERDUE-${bid}-${missedCount}`,
            notification_type: 'LENDING_INSTALLMENT_OVERDUE',
            title: `Missed Daily Installments (${missedCount}d): ${bname}`,
            message: `${bname} (${ref}) has ${missedCount} missed daily installment${missedCount !== 1 ? 's' : ''} (${compliance}). Daily target: ${formatPHP(target)}.${penStr}`,
            reference_type: 'lending',
            reference_id: bid,
            is_read: false,
            created_at: nowIso,
          })
        }

        const startClean = (f.dateBorrowed || '').split('T')[0]
        const dueClean = (f.dueDate || '').split('T')[0]
        if (
          startClean &&
          startClean <= todayStr &&
          (!dueClean || todayStr <= dueClean) &&
          target > 0
        ) {
          const paidToday = payments
            .filter(
              (r) =>
                (r.cycle_due_date || r.cycleDueDate || r.date || r.payment_date || '').split('T')[0] ===
                todayStr
            )
            .reduce((sum, r) => sum + Number(r.amount || 0), 0)

          if (paidToday < target) {
            const remToday = Math.min(rem, Math.max(0, target - paidToday))
            if (remToday > 0) {
              items.push({
                notification_id: `LENDING_DUE_TODAY-daily-${bid}-${todayStr}`,
                notification_type: 'LENDING_DUE_TODAY',
                title: `Daily Installment Due Today: ${bname}`,
                message: `${bname} (${ref}) has a daily lending installment of ${formatPHP(remToday)} due today (${formatReadableDate(todayStr)}).`,
                reference_type: 'lending',
                reference_id: bid,
                is_read: false,
                created_at: nowIso,
              })
            }
          }
        }
      } else {
        const progress = getMonthlyProgress(f)
        ;(progress.monthDetails || []).forEach((mInfo) => {
          const mRem = Number(mInfo.remaining || 0)
          if (mRem <= 0 || !mInfo.dueDate) return
          const cDiff = diffDaysFromToday(mInfo.dueDate, todayStr)
          const readableCycleDue = formatReadableDate(mInfo.dueDate)
          const mIdx = mInfo.month_index

          if (cDiff < 0) {
            const daysOv = Math.abs(cDiff)
            items.push({
              notification_id: `LENDING_INSTALLMENT_OVERDUE-${bid}-M${mIdx}`,
              notification_type: 'LENDING_INSTALLMENT_OVERDUE',
              title: `Overdue Monthly Installment (Month ${mIdx}): ${bname}`,
              message: `${bname} (${ref}) — Month ${mIdx} installment of ${formatPHP(mRem)} was due on ${readableCycleDue} (${daysOv} day${daysOv !== 1 ? 's' : ''} overdue).`,
              reference_type: 'lending',
              reference_id: bid,
              is_read: false,
              created_at: nowIso,
            })
          } else if (cDiff === 0) {
            items.push({
              notification_id: `LENDING_DUE_TODAY-${bid}-M${mIdx}`,
              notification_type: 'LENDING_DUE_TODAY',
              title: `Monthly Installment Due Today (Month ${mIdx}): ${bname}`,
              message: `${bname} (${ref}) — Month ${mIdx} installment of ${formatPHP(mRem)} is due TODAY (${readableCycleDue})!`,
              reference_type: 'lending',
              reference_id: bid,
              is_read: false,
              created_at: nowIso,
            })
          } else if (cDiff === 1) {
            items.push({
              notification_id: `LENDING_DUE_TOMORROW-${bid}-M${mIdx}`,
              notification_type: 'LENDING_DUE_TOMORROW',
              title: `Monthly Installment Due Tomorrow (Month ${mIdx}): ${bname}`,
              message: `${bname} (${ref}) — Month ${mIdx} installment of ${formatPHP(mRem)} is due tomorrow (${readableCycleDue}).`,
              reference_type: 'lending',
              reference_id: bid,
              is_read: false,
              created_at: nowIso,
            })
          } else if (cDiff > 1 && cDiff <= 7) {
            items.push({
              notification_id: `LENDING_DUE_SOON-${bid}-M${mIdx}`,
              notification_type: 'LENDING_DUE_SOON',
              title: `Monthly Installment Due in ${cDiff} Days: ${bname}`,
              message: `${bname} (${ref}) — Month ${mIdx} installment of ${formatPHP(mRem)} is due on ${readableCycleDue} (${cDiff} days left).`,
              reference_type: 'lending',
              reference_id: bid,
              is_read: false,
              created_at: nowIso,
            })
          }
        })
      }
    }

    // 3. Recent lending payments
    payments.slice(0, 2).forEach((r) => {
      const amtPaid = Number(r.amount || 0)
      if (amtPaid <= 0) return
      const txId = r.id
      const txRef = r.transactionRefNo || r.transaction_ref_no || `TX-${txId}`
      const penPaid = Number(r.penalty_portion ?? r.penalty ?? 0)
      const isSettled = rem <= 0
      const ntype = isSettled ? 'LENDING_FULLY_SETTLED' : 'LENDING_PAYMENT_RECEIVED'
      const penStr = penPaid > 0 ? ` (+${formatPHP(penPaid)} late fee)` : ''
      items.push({
        notification_id: `${ntype}-${bid}-${txId}`,
        notification_type: ntype,
        title: isSettled
          ? `Lending Facility Settled: ${bname}`
          : `Lending Payment Received: ${bname}`,
        message: `${bname} (${ref}) paid ${formatPHP(amtPaid)}${penStr} via ${r.method || 'Cash'} (${txRef}). Remaining balance: ${formatPHP(rem)}.`,
        reference_type: 'lending',
        reference_id: bid,
        is_read: false,
        created_at: r.timestamp || r.payment_date || r.date,
      })
    })
  })

  return items
}

function buildLoanClientNotifications(
  loans: LoanItem[],
  companyFilter?: string
): NotificationItemOut[] {
  const items: NotificationItemOut[] = []
  const todayStr = getLocalTodayISO()
  const nowIso = new Date().toISOString()

  const scoped =
    companyFilter && companyFilter !== 'All Companies'
      ? loans.filter(
          (l) =>
            isCompanyMatch(l.borrower, companyFilter) ||
            isCompanyMatch(l.lender, companyFilter)
        )
      : loans

  scoped.forEach((l) => {
    const lid = l.loanId || parseInt(String(l.id).replace(/\D/g, ''), 10) || 0
    const statusLow = (l.status || '').toLowerCase()
    if (statusLow.includes('reject') || statusLow.includes('disapprov')) return

    const principal = Number(l.amount || 0)
    const rate = Number(l.interestRate || 0)
    const totalPayable = principal + principal * (rate / 100)
    const totalPaid = Number(l.totalPaid || 0)
    const balance =
      l.outstandingBalance !== undefined
        ? Number(l.outstandingBalance)
        : Math.max(0, totalPayable - totalPaid)

    if (balance <= 0 || statusLow === 'paid' || statusLow === 'completed') return

    const ref = l.refNo || String(lid)
    const lenderName = l.lender || 'Corporate Treasury'

    if (l.dueDate) {
      const diffDays = diffDaysFromToday(l.dueDate, todayStr)
      const readableDue = formatReadableDate(l.dueDate)

      if (diffDays < 0) {
        const overdueDays = Math.abs(diffDays)
        items.push({
          notification_id: `LOAN_OVERDUE-borrower-${lid}`,
          notification_type: 'LOAN_OVERDUE',
          title: 'Overdue Loan Payment',
          message: `Loan for ${l.borrower} from ${lenderName} (Ref: ${ref}) is overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}. Outstanding balance: ${formatPHP(balance)}.`,
          reference_type: 'loan',
          reference_id: lid,
          is_read: false,
          created_at: nowIso,
        })
      } else if (diffDays === 0) {
        items.push({
          notification_id: `LOAN_DUE_TODAY-borrower-${lid}`,
          notification_type: 'LOAN_DUE_TODAY',
          title: 'Loan Payment Due Today',
          message: `Loan for ${l.borrower} from ${lenderName} (Ref: ${ref}) is due TODAY (${readableDue}). Outstanding balance: ${formatPHP(balance)}.`,
          reference_type: 'loan',
          reference_id: lid,
          is_read: false,
          created_at: nowIso,
        })
      } else if (diffDays === 1) {
        items.push({
          notification_id: `LOAN_DUE_TOMORROW-borrower-${lid}`,
          notification_type: 'LOAN_DUE_TOMORROW',
          title: 'Loan Payment Due Tomorrow',
          message: `Loan for ${l.borrower} from ${lenderName} (Ref: ${ref}) is due tomorrow (${readableDue}). Outstanding balance: ${formatPHP(balance)}.`,
          reference_type: 'loan',
          reference_id: lid,
          is_read: false,
          created_at: nowIso,
        })
      } else if (diffDays > 1 && diffDays <= 7) {
        items.push({
          notification_id: `LOAN_DUE_SOON-borrower-${lid}`,
          notification_type: 'LOAN_DUE_SOON',
          title: `Loan Payment Due Soon (${diffDays} Days)`,
          message: `Loan for ${l.borrower} from ${lenderName} (Ref: ${ref}) is due on ${readableDue} (${diffDays} days left). Outstanding balance: ${formatPHP(balance)}.`,
          reference_type: 'loan',
          reference_id: lid,
          is_read: false,
          created_at: nowIso,
        })
      }
    }
  })

  return items
}

function buildTenantClientNotifications(
  leases: TenantLease[],
  companyFilter?: string
): NotificationItemOut[] {
  if (
    companyFilter &&
    companyFilter !== 'All Companies' &&
    !isJKPropertyCompany(companyFilter)
  ) {
    return []
  }

  const items: NotificationItemOut[] = []
  const todayStr = getLocalTodayISO()
  const nowIso = new Date().toISOString()

  leases.forEach((lease) => {
    if (lease.status === 'Completed') return
    const lid = parseInt(String(lease.id).replace(/\D/g, ''), 10) || 0
    const fin = getLeaseFinancials(lease, todayStr)
    if (fin.remaining <= 0.005) return

    const nextDue = fin.nextPeriod?.dueDate || lease.dueDate
    const dueAmt = fin.nextPeriod?.remaining || fin.remaining

    if (nextDue) {
      const diffDays = diffDaysFromToday(nextDue, todayStr)
      const readableDue = formatReadableDate(nextDue)

      if (diffDays < 0) {
        const overdueDays = Math.abs(diffDays)
        items.push({
          notification_id: `TENANT_OVERDUE-${lid}-${nextDue}`,
          notification_type: 'TENANT_OVERDUE',
          title: `Overdue Tenant Rent: ${lease.tenantName}`,
          message: `${lease.tenantName} (${lease.unitName}) rent of ${formatPHP(dueAmt)} was due on ${readableDue} (${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue).`,
          reference_type: 'tenant',
          reference_id: lid,
          is_read: false,
          created_at: nowIso,
        })
      } else if (diffDays === 0) {
        items.push({
          notification_id: `TENANT_DUE_TODAY-${lid}-${nextDue}`,
          notification_type: 'TENANT_DUE_TODAY',
          title: `Tenant Rent Due Today: ${lease.tenantName}`,
          message: `${lease.tenantName} (${lease.unitName}) rent of ${formatPHP(dueAmt)} is due TODAY (${readableDue})!`,
          reference_type: 'tenant',
          reference_id: lid,
          is_read: false,
          created_at: nowIso,
        })
      } else if (diffDays === 1) {
        items.push({
          notification_id: `TENANT_DUE_TOMORROW-${lid}-${nextDue}`,
          notification_type: 'TENANT_DUE_TOMORROW',
          title: `Tenant Rent Due Tomorrow: ${lease.tenantName}`,
          message: `${lease.tenantName} (${lease.unitName}) rent of ${formatPHP(dueAmt)} is due tomorrow (${readableDue}).`,
          reference_type: 'tenant',
          reference_id: lid,
          is_read: false,
          created_at: nowIso,
        })
      } else if (diffDays > 1 && diffDays <= 7) {
        items.push({
          notification_id: `TENANT_DUE_SOON-${lid}-${nextDue}`,
          notification_type: 'TENANT_DUE_SOON',
          title: `Tenant Rent Due in ${diffDays} Days: ${lease.tenantName}`,
          message: `${lease.tenantName} (${lease.unitName}) rent of ${formatPHP(dueAmt)} is due on ${readableDue} (${diffDays} days left).`,
          reference_type: 'tenant',
          reference_id: lid,
          is_read: false,
          created_at: nowIso,
        })
      }
    }
  })

  return items
}

export const notificationService = {
  async getNotifications(options?: {
    companyId?: number
    companyName?: string
    userRole?: string
    notificationType?: string
    limit?: number
  }): Promise<NotificationItemOut[]> {
    const params = new URLSearchParams()
    if (options?.companyId) params.append('company_id', String(options.companyId))
    if (options?.companyName && options.companyName !== 'All Companies') {
      params.append('company_name', options.companyName)
    }
    if (options?.userRole) params.append('user_role', options.userRole)
    if (options?.notificationType) params.append('notification_type', options.notificationType)
    params.append('limit', String(options?.limit || 100))

    const url = `/api/v1/notifications?${params.toString()}`

    const [backendItems, billsList, lendingFacilities, loansList, tenantLeases] = await Promise.all([
      fetch(url, { headers: getAuthHeaders(options?.userRole) })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => (Array.isArray(data) ? (data as NotificationItemOut[]) : []))
        .catch(() => [] as NotificationItemOut[]),
      billsService.getBills().catch(() => [] as BillItem[]),
      lendingService.getFacilities().catch(() => lendingService.loadFromStorage()),
      loanService.getLoans().catch(() => [] as LoanItem[]),
      tenantService.listLeases().catch(() => [] as TenantLease[]),
    ])

    const clientBillItems = buildBillClientNotifications(billsList, options?.companyName)
    const clientLendingItems = buildLendingClientNotifications(
      lendingFacilities,
      options?.companyName
    )
    const clientLoanItems = buildLoanClientNotifications(loansList, options?.companyName)
    const clientTenantItems = buildTenantClientNotifications(tenantLeases, options?.companyName)

    // Merge and deduplicate by notification_id
    const merged: NotificationItemOut[] = []
    const seenIds = new Set<string>()

    for (const item of [
      ...backendItems,
      ...clientBillItems,
      ...clientLendingItems,
      ...clientLoanItems,
      ...clientTenantItems,
    ]) {
      if (!seenIds.has(item.notification_id)) {
        seenIds.add(item.notification_id)
        merged.push(item)
      }
    }

    const filtered = options?.notificationType
      ? merged.filter(
          (n) => n.notification_type.toUpperCase() === options.notificationType!.toUpperCase()
        )
      : merged

    filtered.sort((a, b) => {
      const pA = getUrgencyPriority(a.notification_type)
      const pB = getUrgencyPriority(b.notification_type)
      if (pA !== pB) return pA - pB
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0
      return tB - tA
    })

    return filtered.slice(0, options?.limit || 100)
  },

  async getUnreadCount(companyId?: number, companyName?: string, userRole?: string): Promise<number> {
    try {
      const items = await this.getNotifications({
        companyId,
        companyName,
        userRole,
        limit: 100,
      })
      return items.length
    } catch {
      return 0
    }
  },
}
