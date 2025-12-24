// 财务记录相关的类型定义

export interface Transaction {
  id: string
  userId: string
  amount: number
  type: TransactionType
  category: string
  description?: string
  date: Date
  createdAt: Date
  updatedAt: Date
}

export type TransactionType = 'INCOME' | 'EXPENSE'

export interface CreateTransactionData {
  amount: number
  type: TransactionType
  category: string
  description?: string
  date: Date
}

export interface UpdateTransactionData {
  amount?: number
  type?: TransactionType
  category?: string
  description?: string
  date?: Date
}

export interface TransactionFilters {
  startDate?: Date
  endDate?: Date
  type?: TransactionType
  category?: string
  limit?: number
  offset?: number
}

export interface TransactionStats {
  totalIncome: number
  totalExpense: number
  balance: number
  transactionCount: number
}

export interface MonthlyStats extends TransactionStats {
  year: number
  month: number
}

export interface CategoryStats {
  category: string
  type: TransactionType
  total: number
  count: number
  percentage: number
}

export interface BalanceHistory {
  date: Date
  balance: number
}

export interface TransactionValidationResult {
  isValid: boolean
  errors: string[]
}

export interface PaginatedTransactions {
  transactions: Transaction[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

// 预定义的交易分类
export const INCOME_CATEGORIES = [
  '工资收入',
  '奖金',
  '投资收益',
  '兼职收入',
  '礼金',
  '其他收入'
] as const

export const EXPENSE_CATEGORIES = [
  '餐饮',
  '交通',
  '购物',
  '娱乐',
  '医疗',
  '教育',
  '房租',
  '水电费',
  '通讯费',
  '保险',
  '其他支出'
] as const

export type IncomeCategory = typeof INCOME_CATEGORIES[number]
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

// 图表数据相关类型
export interface PieChartData {
  labels: string[]
  data: number[]
  colors: string[]
  total: number
}

export interface BarChartData {
  labels: string[]
  incomeData: number[]
  expenseData: number[]
  balanceData: number[]
}

export interface LineChartData {
  labels: string[]
  balanceData: number[]
  cumulativeIncomeData: number[]
  cumulativeExpenseData: number[]
}

export interface DashboardSummary {
  currentBalance: number
  monthlyIncome: number
  monthlyExpense: number
  monthlyTransactionCount: number
  topIncomeCategory: { category: string; amount: number } | null
  topExpenseCategory: { category: string; amount: number } | null
  recentTransactionTrend: 'up' | 'down' | 'stable'
  comparedToLastMonth: {
    incomeChange: number // 百分比
    expenseChange: number // 百分比
    balanceChange: number // 绝对值
  }
}

// 高级搜索参数类型
export interface AdvancedSearchParams {
  keyword?: string
  categories?: string[]
  types?: TransactionType[]
  amountRange?: { min?: number; max?: number }
  dateRange?: { start?: Date; end?: Date }
  sortBy?: 'date' | 'amount' | 'category'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// 用户分类列表类型
export interface UserCategories {
  incomeCategories: string[]
  expenseCategories: string[]
}