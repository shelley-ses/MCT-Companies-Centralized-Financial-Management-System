// The paid part of a sale or expense, in one place (spec 0013, AC-10).
// The Sales page "Deposit" tab, the Expense page "Withdraw" tab and the Transaction page cash
// ledger tab all use these, so a record's paid amount is the same on every page.

import type { SalesItem } from '@/services/salesService'
import type { ExpenseItem } from '@/services/expenseService'
import { normalizeParticularStatus, parseParticulars } from '@/utils/particularsUtils'

/** Money actually received for a sale: the total of its paid particulars. */
export function getPaidDepositForSale(sale: SalesItem): number {
  const items = parseParticulars(sale.particulars, sale.items, sale.deposit)
  if (items.length > 0) {
    const fallback = normalizeParticularStatus(sale.status, 'Paid')
    return items.reduce((sum, it) => {
      const st = normalizeParticularStatus(it.status, fallback)
      return st === 'Paid' ? sum + (Number(it.total) || 0) : sum
    }, 0)
  }
  return normalizeParticularStatus(sale.status, 'Paid') === 'Paid' ? sale.deposit || 0 : 0
}

/** Money actually paid out for an expense: paid particulars, or the repayments made so far. */
export function getPaidDisbursementForExpense(exp: ExpenseItem): number {
  const items = parseParticulars(exp.particulars, exp.items, exp.withdrawal)
  if (items.length > 0) {
    const fallback = normalizeParticularStatus(exp.status, 'Paid')
    const paidFromItems = items.reduce((sum, it) => {
      const st = normalizeParticularStatus(it.status, fallback)
      return st === 'Paid' ? sum + (Number(it.total) || 0) : sum
    }, 0)
    if (exp.totalPaid && exp.totalPaid > paidFromItems) return exp.totalPaid
    return paidFromItems
  }
  if (exp.totalPaid && exp.totalPaid > 0) return exp.totalPaid
  return normalizeParticularStatus(exp.status, 'Paid') === 'Paid' ? exp.withdrawal || 0 : 0
}
