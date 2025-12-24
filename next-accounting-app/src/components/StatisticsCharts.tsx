'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardSummary, CategoryStats, MonthlyStats } from '@/lib/types/transaction'

interface StatisticsChartsProps {
  summary: DashboardSummary
  categoryStats: CategoryStats[]
  monthlyStats: MonthlyStats[]
  loading?: boolean
}

export default function StatisticsCharts({
  summary,
  categoryStats,
  monthlyStats,
  loading = false
}: StatisticsChartsProps) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    })
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="py-8">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 当前余额 */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-600 font-medium">💰 当前余额</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${summary.currentBalance >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
              {formatCurrency(summary.currentBalance)}
            </div>
            {summary.comparedToLastMonth.balanceChange !== 0 && (
              <p className={`text-sm mt-2 flex items-center ${
                summary.comparedToLastMonth.balanceChange > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <span className="mr-1">
                  {summary.comparedToLastMonth.balanceChange > 0 ? '📈' : '📉'}
                </span>
                较上月 {summary.comparedToLastMonth.balanceChange > 0 ? '+' : ''}
                {formatCurrency(summary.comparedToLastMonth.balanceChange)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 本月收入 */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-green-600 font-medium">💵 本月收入</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(summary.monthlyIncome)}
            </div>
            {summary.comparedToLastMonth.incomeChange !== 0 && (
              <p className={`text-sm mt-2 flex items-center ${
                summary.comparedToLastMonth.incomeChange > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <span className="mr-1">
                  {summary.comparedToLastMonth.incomeChange > 0 ? '📈' : '📉'}
                </span>
                较上月 {formatPercentage(summary.comparedToLastMonth.incomeChange)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 本月支出 */}
        <Card className="bg-gradient-to-br from-red-50 to-rose-100 border-red-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-red-600 font-medium">💸 本月支出</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {formatCurrency(summary.monthlyExpense)}
            </div>
            {summary.comparedToLastMonth.expenseChange !== 0 && (
              <p className={`text-sm mt-2 flex items-center ${
                summary.comparedToLastMonth.expenseChange > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                <span className="mr-1">
                  {summary.comparedToLastMonth.expenseChange > 0 ? '📈' : '📉'}
                </span>
                较上月 {formatPercentage(summary.comparedToLastMonth.expenseChange)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 本月记录数 */}
        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-600 font-medium">📊 本月记录数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {summary.monthlyTransactionCount}
            </div>
            <p className="text-sm text-purple-500 mt-2 flex items-center">
              <span className="mr-1">📝</span>
              笔交易记录
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 分类统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 收入分类 */}
        <Card className="bg-white/60 backdrop-blur-sm border-white/30 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <span className="mr-2">💰</span>
              收入分类统计
            </CardTitle>
            <CardDescription>本月各类收入占比</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryStats
                .filter(stat => stat.type === 'INCOME')
                .sort((a, b) => b.total - a.total)
                .slice(0, 5)
                .map((stat, index) => (
                  <div key={stat.category} className="flex items-center justify-between p-3 bg-green-50/50 rounded-lg hover:bg-green-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-r from-green-${400 + index * 100} to-green-${500 + index * 100}`}></div>
                      <span className="text-sm font-medium text-gray-800">{stat.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(stat.total)}
                      </div>
                      <div className="text-xs text-green-500">
                        {stat.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              {categoryStats.filter(stat => stat.type === 'INCOME').length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">💰</span>
                  </div>
                  <p className="text-gray-500">暂无收入记录</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 支出分类 */}
        <Card className="bg-white/60 backdrop-blur-sm border-white/30 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <span className="mr-2">💸</span>
              支出分类统计
            </CardTitle>
            <CardDescription>本月各类支出占比</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryStats
                .filter(stat => stat.type === 'EXPENSE')
                .sort((a, b) => b.total - a.total)
                .slice(0, 5)
                .map((stat, index) => (
                  <div key={stat.category} className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg hover:bg-red-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-r from-red-${400 + index * 100} to-red-${500 + index * 100}`}></div>
                      <span className="text-sm font-medium text-gray-800">{stat.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-red-600">
                        {formatCurrency(stat.total)}
                      </div>
                      <div className="text-xs text-red-500">
                        {stat.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              {categoryStats.filter(stat => stat.type === 'EXPENSE').length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">💸</span>
                  </div>
                  <p className="text-gray-500">暂无支出记录</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 月度趋势 */}
      <Card className="bg-white/60 backdrop-blur-sm border-white/30 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center text-indigo-600">
            <span className="mr-2">📈</span>
            月度趋势
          </CardTitle>
          <CardDescription>最近几个月的收支情况</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyStats.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">暂无月度数据</h3>
                <p className="text-gray-500">继续记录您的财务数据，我们将为您生成精美的趋势图表</p>
              </div>
            ) : (
              <div className="space-y-3">
                {monthlyStats.slice(-6).map((stat) => (
                  <div key={`${stat.year}-${stat.month}`} className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl hover:from-indigo-100 hover:to-purple-100 transition-all duration-200">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-semibold text-gray-800 flex items-center">
                        <span className="mr-2">📅</span>
                        {stat.year}年{stat.month}月
                      </div>
                      <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                        stat.balance >= 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {stat.balance >= 0 ? '盈余' : '亏损'}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-green-600 font-semibold">
                          {formatCurrency(stat.totalIncome)}
                        </div>
                        <div className="text-green-500 text-xs">收入</div>
                      </div>
                      <div className="text-center">
                        <div className="text-red-600 font-semibold">
                          {formatCurrency(stat.totalExpense)}
                        </div>
                        <div className="text-red-500 text-xs">支出</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-semibold ${
                          stat.balance >= 0 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(stat.balance)}
                        </div>
                        <div className="text-gray-500 text-xs">结余</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 热门分类 */}
      {(summary.topIncomeCategory || summary.topExpenseCategory) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {summary.topIncomeCategory && (
            <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-green-600 flex items-center">
                  <span className="mr-2">🏆</span>
                  最大收入来源
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="text-xl font-semibold text-gray-800 mb-2">{summary.topIncomeCategory.category}</div>
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(summary.topIncomeCategory.amount)}
                  </div>
                  <div className="text-sm text-green-500 mt-2">本月最大收入项目</div>
                </div>
              </CardContent>
            </Card>
          )}

          {summary.topExpenseCategory && (
            <Card className="bg-gradient-to-br from-red-50 to-rose-100 border-red-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center">
                  <span className="mr-2">⚠️</span>
                  最大支出项目
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💸</span>
                  </div>
                  <div className="text-xl font-semibold text-gray-800 mb-2">{summary.topExpenseCategory.category}</div>
                  <div className="text-3xl font-bold text-red-600">
                    {formatCurrency(summary.topExpenseCategory.amount)}
                  </div>
                  <div className="text-sm text-red-500 mt-2">本月最大支出项目</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}