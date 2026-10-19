import type { TransactionCategory } from '@/services/dashboardService'

export const CATEGORY_COLORS: Record<string, string> = {
  'Petty Cash': '#F59E0B',      // Amber
  'Rendered Fee': '#3B82F6',    // Blue
  'BBMP Foundation': '#8B5CF6', // Purple
  'HDMF': '#10B981',            // Emerald
  'Philhealth': '#06B6D4',      // Cyan
  'Electricity': '#EF4444',     // Red
  'BIR': '#F97316',             // Orange
  'Payroll': '#6366F1',         // Indigo
  'SSS': '#14B8A6',             // Teal
  'Hotel Supplies': '#EC4899',  // Pink
  'Revolving Funds': '#84CC16', // Lime
}

export const CATEGORY_LIST: TransactionCategory[] = [
  'Petty Cash',
  'Rendered Fee',
  'BBMP Foundation',
  'HDMF',
  'Philhealth',
  'Electricity',
  'BIR',
  'Payroll',
  'SSS',
  'Hotel Supplies',
  'Revolving Funds',
]
