import * as React from 'react'
import { Download, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatPHP } from '@/lib/format'
import {
  loanService,
  type CompanyLoanGroup,
  type CompanyOption,
} from '@/services/loanService'

const PAGE_SIZE = 20
const CATEGORIES = ['Rent', 'Electricity', 'Water Bill', 'Internet', 'Operating Supplies']

export const CompanyLoansPage: React.FC = () => {
  const [groups, setGroups] = React.useState<CompanyLoanGroup[]>([])
  const [companies, setCompanies] = React.useState<CompanyOption[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filters, setFilters] = React.useState({
    borrowerId: '', category: '', paymentStatus: '', date: '',
  })
  const [selectedGroup, setSelectedGroup] = React.useState<CompanyLoanGroup | null>(null)
  const [repaymentTimeline, setRepaymentTimeline] = React.useState<Array<{
    refNo: string
    paymentDate: string
    amount: number
    remainingBalance: number
    reference: string
  }>>([])

  const loadGroups = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await loanService.getCompanyLoans({
        borrowerId: filters.borrowerId ? Number(filters.borrowerId) : undefined,
        category: filters.category || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        startDate: filters.date || undefined,
        endDate: filters.date || undefined,
        offset: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      })
      setGroups(result.items)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load company loans.')
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  React.useEffect(() => { loanService.getCompanies().then(setCompanies) }, [])
  React.useEffect(() => { void loadGroups() }, [loadGroups])

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setPage(0)
    setFilters((current) => ({ ...current, [key]: value }))
  }
  const clearFilters = () => {
    setPage(0)
    setFilters({ borrowerId: '', category: '', paymentStatus: '', date: '' })
  }
  const exportGroups = async () => {
    try {
      await loanService.exportCompanyLoans({
        borrowerId: filters.borrowerId ? Number(filters.borrowerId) : undefined,
        category: filters.category || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        startDate: filters.date || undefined,
        endDate: filters.date || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export company loans.')
    }
  }
  const openGroupDetails = async (group: CompanyLoanGroup) => {
    setSelectedGroup(group)
    setRepaymentTimeline([])
    if (group.key === 'preview-mct-hotel-mct-kitchen-rent') {
      setRepaymentTimeline([
        {
          refNo: 'DEMO-RENT-001',
          paymentDate: '2026-08-15',
          amount: 5000,
          remainingBalance: 25000,
          reference: 'Bank transfer',
        },
        {
          refNo: 'DEMO-RENT-002',
          paymentDate: '2026-09-10',
          amount: 3000,
          remainingBalance: 12000,
          reference: 'Check 10042',
        },
        {
          refNo: 'DEMO-RENT-001',
          paymentDate: '2026-10-05',
          amount: 5000,
          remainingBalance: 20000,
          reference: 'Bank transfer',
        },
      ])
      return
    }
    try {
      const statements = await Promise.all(
        group.loans.map(async (loan) => ({
          loan,
          statement: await loanService.getCompanyLoanStatement(loan.loanId || 0),
        }))
      )
      setRepaymentTimeline(
        statements
          .flatMap(({ loan, statement }) =>
            (statement.repayments || []).map((repayment: any) => ({
              refNo: loan.refNo,
              paymentDate: repayment.payment_date,
              amount: Number(repayment.amount || 0),
              remainingBalance: Number(repayment.remaining_balance || 0),
              reference: repayment.reference_no || repayment.notes || '—',
            }))
          )
          .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the repayment timeline.')
    }
  }


  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Company Loans</h1>
          <p className="text-sm text-slate-500">Approved loans grouped by borrower, lender, and category.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => void exportGroups()}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex min-w-max items-center gap-3 overflow-x-auto pb-1">
          <select className="h-10 rounded-md border px-3 text-sm" value={filters.borrowerId} onChange={(e) => updateFilter('borrowerId', e.target.value)}>
            <option value="">All borrowers</option>
            {companies.map((company) => <option key={company.company_id} value={company.company_id}>{company.company_name}</option>)}
          </select>
          <select className="h-10 rounded-md border px-3 text-sm" value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
          <select className="h-10 rounded-md border px-3 text-sm" value={filters.paymentStatus} onChange={(e) => updateFilter('paymentStatus', e.target.value)}>
            <option value="">All payment statuses</option><option>Unpaid</option><option>Partially Paid</option><option>Fully Paid</option><option>Overdue</option>
          </select>
          <Input className="w-40" type="date" value={filters.date} onChange={(e) => updateFilter('date', e.target.value)} />
          <Button variant="outline" onClick={clearFilters}><X className="mr-2 h-4 w-4" />Clear filters</Button>
        </div>
      </Card>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <Card className="overflow-x-auto">
        {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading company loans...</div> : groups.length === 0 ? <div className="p-8 text-center text-sm text-slate-500"><Search className="mx-auto mb-2 h-5 w-5" />No approved loans match these filters.</div> : (
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Borrower Company', 'Lender Company', 'Category', 'Total Loan Amount', 'Total Paid', 'Outstanding Balance', 'Int. Rate', 'Status'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
            <tbody>{groups.map((group) => <tr key={group.key} className="cursor-pointer border-b last:border-0 hover:bg-slate-50" onClick={() => void openGroupDetails(group)}>
              <td className="px-4 py-3 font-medium">{group.borrower}</td><td className="px-4 py-3">{group.lender}</td><td className="px-4 py-3">{group.category}</td><td className="px-4 py-3">{formatPHP(group.totalLoanAmount)}</td><td className="px-4 py-3">{formatPHP(group.totalPaid)}</td><td className="px-4 py-3">{formatPHP(group.outstandingBalance)}</td><td className="px-4 py-3">{group.interestDisplay}</td><td className="px-4 py-3">{group.paymentStatus}</td>
            </tr>)}</tbody>
          </table>
        )}
      </Card>
      <div className="flex items-center justify-between text-sm text-slate-500"><span>{total} loan group{total === 1 ? '' : 's'}</span><div className="flex gap-2"><Button variant="outline" disabled={page === 0 || loading} onClick={() => setPage((current) => current - 1)}>Previous</Button><Button variant="outline" disabled={(page + 1) * PAGE_SIZE >= total || loading} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>

      <Dialog open={Boolean(selectedGroup)} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <DialogContent className="max-w-5xl"><DialogHeader><DialogTitle>Company Loan Details</DialogTitle></DialogHeader>
          {selectedGroup && <div className="space-y-5 text-sm">
            <div className="grid gap-3 md:grid-cols-4"><div><b>Borrower</b><p>{selectedGroup.borrower}</p></div><div><b>Lender</b><p>{selectedGroup.lender}</p></div><div><b>Category</b><p>{selectedGroup.category}</p></div><div><b>Status</b><p>{selectedGroup.paymentStatus}</p></div><div><b>Total loan amount</b><p>{formatPHP(selectedGroup.totalLoanAmount)}</p></div><div><b>Total paid</b><p>{formatPHP(selectedGroup.totalPaid)}</p></div><div><b>Outstanding balance</b><p>{formatPHP(selectedGroup.outstandingBalance)}</p></div><div><b>Interest</b><p>{selectedGroup.interestDisplay}</p></div></div>
            <h3 className="font-semibold">Repayment timeline</h3>
            {repaymentTimeline.length > 0 ? <div className="divide-y rounded border">{repaymentTimeline.map((repayment, index) => <div key={`${repayment.refNo}-${repayment.paymentDate}-${index}`} className="grid gap-2 p-3 md:grid-cols-5"><span>{repayment.refNo}</span><span>{repayment.paymentDate}</span><span>{formatPHP(repayment.amount)}</span><span>Balance: {formatPHP(repayment.remainingBalance)}</span><span>{repayment.reference}</span></div>)}</div> : <p className="text-slate-500">No repayments recorded for this group.</p>}
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
