import type { TransactionCategory } from '@/services/dashboardService'

export const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  GCash: '#007DFE',    // GCash vibrant blue
  Maya: '#059669',     // Maya vibrant green
  PayMongo: '#6366F1', // PayMongo indigo
  Panda: '#EC4899',    // Foodpanda pink
  'In-house': '#F59E0B', // In-house warm amber
}

export const CATEGORY_LIST: TransactionCategory[] = [
  'GCash',
  'Maya',
  'PayMongo',
  'Panda',
  'In-house',
]
