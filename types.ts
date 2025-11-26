export enum AccountType {
  CHECKING = 'CHECKING', // Conta Corrente
  CASH = 'CASH',         // Dinheiro
  INVESTMENT = 'INVESTMENT', // Investimentos
  CREDIT_CARD = 'CREDIT_CARD' // Cartão de Crédito
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER'
}

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number; // For credit cards, this is the current used limit (negative usually) or bill amount
  icon: string;
  // Specific to Credit Cards
  closingDay?: number;
  dueDay?: number;
  limit?: number;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string; // Tree structure
  budgetLimit?: number; // Teto de gastos
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  value: number;
  date: string; // ISO Date
  description: string;
  categoryId: string;
  accountId: string; // Origin account
  destinationAccountId?: string; // For transfers
  type: TransactionType;
  isPaid: boolean; // Status: Pago/Pendente
  isRecurring?: boolean;
  tags?: string[];
  installments?: {
    current: number;
    total: number;
  };
}

export interface RecurringTransaction {
  id: string;
  description: string;
  value: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  frequency: RecurrenceFrequency;
  nextDueDate: string; // ISO Date
  active: boolean;
  lastGeneratedDate?: string;
}

export interface GoalTransaction {
  id: string;
  date: string;
  amount: number;
}

export interface Goal {
  id: string;
  name: string; // "Cofre Virtual"
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon: string;
  history?: GoalTransaction[];
}

export interface DashboardData {
  realBalance: number;
  projectedBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'danger';
  date: string;
}

export interface NotificationPreferences {
  alertOverdue: boolean;   // Danger: Contas Atrasadas
  alertUpcoming: boolean;  // Warning: Contas a Vencer
  alertRecurring: boolean; // Info: Lançamentos Automáticos
}