import { 
  CreateTransactionData, 
  UpdateTransactionData, 
  TransactionValidationResult,
  TransactionType,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES
} from '../types/transaction'

/**
 * 验证交易金额
 */
export function validateAmount(amount: number): TransactionValidationResult {
  const errors: string[] = []
  
  if (amount === undefined || amount === null) {
    errors.push('金额不能为空')
  } else {
    if (amount <= 0) {
      errors.push('金额必须大于0')
    }
    if (amount > 999999999.99) {
      errors.push('金额不能超过999,999,999.99')
    }
    // 检查小数位数不超过2位
    if (Number(amount.toFixed(2)) !== amount) {
      errors.push('金额最多只能有2位小数')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 验证交易类型
 */
export function validateTransactionType(type: TransactionType): TransactionValidationResult {
  const errors: string[] = []
  
  if (!type) {
    errors.push('交易类型不能为空')
  } else if (type !== 'INCOME' && type !== 'EXPENSE') {
    errors.push('交易类型必须是INCOME或EXPENSE')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}/**
 *
 验证交易分类
 */
export function validateCategory(category: string, type: TransactionType): TransactionValidationResult {
  const errors: string[] = []
  
  if (!category) {
    errors.push('分类不能为空')
  } else {
    const validCategories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    const isValidCategory = (validCategories as readonly string[]).includes(category)
    if (!isValidCategory) {
      errors.push(`无效的${type === 'INCOME' ? '收入' : '支出'}分类`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 验证交易描述
 */
export function validateDescription(description?: string): TransactionValidationResult {
  const errors: string[] = []
  
  if (description && description.length > 500) {
    errors.push('描述不能超过500个字符')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 验证交易日期
 */
export function validateTransactionDate(date: Date): TransactionValidationResult {
  const errors: string[] = []
  
  if (!date) {
    errors.push('交易日期不能为空')
  } else {
    const now = new Date()
    const oneYearAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate())
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
    
    if (date < oneYearAgo) {
      errors.push('交易日期不能早于10年前')
    }
    if (date > oneYearFromNow) {
      errors.push('交易日期不能晚于1年后')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}/**
 * 验
证创建交易数据
 */
export function validateCreateTransactionData(data: CreateTransactionData): TransactionValidationResult {
  const allErrors: string[] = []
  
  // 验证金额
  const amountValidation = validateAmount(data.amount)
  allErrors.push(...amountValidation.errors)
  
  // 验证交易类型
  const typeValidation = validateTransactionType(data.type)
  allErrors.push(...typeValidation.errors)
  
  // 验证分类（只有在类型有效时才验证）
  if (typeValidation.isValid) {
    const categoryValidation = validateCategory(data.category, data.type)
    allErrors.push(...categoryValidation.errors)
  }
  
  // 验证描述
  const descriptionValidation = validateDescription(data.description)
  allErrors.push(...descriptionValidation.errors)
  
  // 验证日期
  const dateValidation = validateTransactionDate(data.date)
  allErrors.push(...dateValidation.errors)
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  }
}

/**
 * 验证更新交易数据
 */
export function validateUpdateTransactionData(data: UpdateTransactionData): TransactionValidationResult {
  const allErrors: string[] = []
  
  // 验证金额（如果提供）
  if (data.amount !== undefined) {
    const amountValidation = validateAmount(data.amount)
    allErrors.push(...amountValidation.errors)
  }
  
  // 验证交易类型（如果提供）
  if (data.type !== undefined) {
    const typeValidation = validateTransactionType(data.type)
    allErrors.push(...typeValidation.errors)
  }
  
  // 验证分类（如果提供且类型有效）
  if (data.category !== undefined && data.type !== undefined) {
    const categoryValidation = validateCategory(data.category, data.type)
    allErrors.push(...categoryValidation.errors)
  }
  
  // 验证描述（如果提供）
  if (data.description !== undefined) {
    const descriptionValidation = validateDescription(data.description)
    allErrors.push(...descriptionValidation.errors)
  }
  
  // 验证日期（如果提供）
  if (data.date !== undefined) {
    const dateValidation = validateTransactionDate(data.date)
    allErrors.push(...dateValidation.errors)
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  }
}