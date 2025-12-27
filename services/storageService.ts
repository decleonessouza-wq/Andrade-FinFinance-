import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig'; // Importação do Auth adicionada
import { 
  Account, 
  AccountType, 
  Category, 
  Goal, 
  Transaction, 
  TransactionType, 
  RecurringTransaction, 
  RecurrenceFrequency, 
  AppNotification, 
  NotificationPreferences 
} from '../types';

// ==========================================
// HELPERS DE SEGURANÇA
// ==========================================
// Garante que temos um usuário logado antes de qualquer operação
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");
  return user.uid;
};

const convertDoc = <T>(docSnap: any): T => {
  return { id: docSnap.id, ...docSnap.data() } as T;
};

// ✅ Helper: valida ID "padrão Firestore" (auto-id costuma ter 20 chars)
const isFirestoreLikeId = (id?: string) => {
  return typeof id === 'string' && id.length === 20;
};

// ==========================================
// DADOS INICIAIS (SEED)
// ==========================================
const INITIAL_ACCOUNTS: Account[] = [
  { id: '1', name: 'Nubank (Conta)', type: AccountType.CHECKING, balance: 2500, icon: 'landmark' },
  { id: '2', name: 'Carteira Física', type: AccountType.CASH, balance: 150, icon: 'wallet' },
  { id: '3', name: 'Nubank (Cartão)', type: AccountType.CREDIT_CARD, balance: 1200, closingDay: 25, dueDay: 5, limit: 5000, icon: 'credit-card' },
  { id: '4', name: 'Reserva Emergência', type: AccountType.INVESTMENT, balance: 10000, icon: 'trending-up' },
];

const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Moradia', color: '#ef4444', icon: 'home' },
  { id: '2', name: 'Alimentação', color: '#f59e0b', icon: 'shopping-cart', budgetLimit: 1200 },
  { id: '3', name: 'Transporte', color: '#3b82f6', icon: 'car' },
  { id: '4', name: 'Lazer', color: '#8b5cf6', icon: 'party-popper' },
  { id: '5', name: 'Saúde', color: '#10b981', icon: 'heart-pulse' },
  { id: '6', name: 'Educação', color: '#6366f1', icon: 'graduation-cap' },
  { id: '7', name: 'Salário', color: '#10b981', icon: 'banknote' },
  { id: '8', name: 'Investimentos', color: '#8b5cf6', icon: 'trending-up' },
  { id: '9', name: 'Outros', color: '#9ca3af', icon: 'circle-dashed' }
];

// ==========================================
// INICIALIZAÇÃO E MIGRAÇÃO (POR USUÁRIO)
// ==========================================
export const initializeDataIfNeeded = async () => {
  try {
    // Tenta pegar o usuário. Se não estiver logado (ex: tela de login), apenas ignora.
    const user = auth.currentUser;
    if (!user) return;
    
    const userId = user.uid;

    // Verifica se ESTE usuário já tem categorias
    const catsQuery = query(collection(db, 'categories'), where("userId", "==", userId));
    const catsSnapshot = await getDocs(catsQuery);
    
    if (catsSnapshot.empty) {
      console.log("Inicializando Categorias para o novo usuário...");
      const batch = writeBatch(db);
      
      INITIAL_CATEGORIES.forEach(cat => {
        const newRef = doc(collection(db, 'categories'));
        // Salva com o ID do usuário para proteger o dado
        batch.set(newRef, { ...cat, id: newRef.id, userId });
      });
      await batch.commit();
    }

    // Verifica se ESTE usuário já tem contas
    const accsQuery = query(collection(db, 'accounts'), where("userId", "==", userId));
    const accsSnapshot = await getDocs(accsQuery);
    
    if (accsSnapshot.empty) {
      console.log("Inicializando Contas para o novo usuário...");
      const batch = writeBatch(db);
      
      INITIAL_ACCOUNTS.forEach(acc => {
        const newRef = doc(collection(db, 'accounts'));
        batch.set(newRef, { ...acc, id: newRef.id, userId });
      });
      await batch.commit();
    }
  } catch (error) {
    console.error("Erro ao inicializar dados:", error);
  }
};

// ==========================================
// TRANSAÇÕES (COM FILTRO DE USUÁRIO)
// ==========================================
export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const userId = getCurrentUserId();
    const q = query(collection(db, 'transactions'), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const txs = querySnapshot.docs.map(d => convertDoc<Transaction>(d));
    // Ordenar por data decrescente
    return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return [];
  }
};

export const addTransaction = async (transaction: Transaction) => {
  try {
    const userId = getCurrentUserId();
    // Adiciona o userId ao objeto antes de salvar
    await setDoc(doc(db, 'transactions', transaction.id), { ...transaction, userId });
    
    // Atualizar saldo da conta se a transação estiver paga
    if (transaction.isPaid) {
      const accountRef = doc(db, 'accounts', transaction.accountId);
      const accountSnap = await getDoc(accountRef);
      
      if (accountSnap.exists()) {
        const account = accountSnap.data() as Account;
        let newBalance = account.balance;

        if (transaction.type === TransactionType.INCOME) {
          newBalance += transaction.value;
        } else if (transaction.type === TransactionType.EXPENSE) {
          // Lógica de cartão de crédito vs conta normal
          if (account.type === AccountType.CREDIT_CARD) {
             newBalance += transaction.value; 
          } else {
             newBalance -= transaction.value;
          }
        }
        await updateDoc(accountRef, { balance: newBalance });
      }
    }
  } catch (error) {
    console.error("Erro ao adicionar transação:", error);
    throw error;
  }
};

export const updateTransaction = async (updatedTx: Transaction) => {
  try {
    const userId = getCurrentUserId();
    // Mantém o userId na atualização
    await setDoc(doc(db, 'transactions', updatedTx.id), { ...updatedTx, userId });
  } catch (error) {
    console.error("Erro ao atualizar transação:", error);
    throw error;
  }
};

export const deleteTransaction = async (id: string) => {
  try {
    // Busca a transação antes de deletar para estornar o saldo
    const txRef = doc(db, 'transactions', id);
    const txSnap = await getDoc(txRef);
    
    if (txSnap.exists()) {
      const tx = txSnap.data() as Transaction;
      
      if (tx.isPaid) {
        const accountRef = doc(db, 'accounts', tx.accountId);
        const accountSnap = await getDoc(accountRef);
        
        if (accountSnap.exists()) {
           const account = accountSnap.data() as Account;
           let newBalance = account.balance;
           
           // Lógica inversa para estorno
           if (tx.type === TransactionType.INCOME) {
             newBalance -= tx.value;
           } else if (tx.type === TransactionType.EXPENSE) {
             if (account.type === AccountType.CREDIT_CARD) {
                newBalance -= tx.value;
             } else {
                newBalance += tx.value;
             }
           }
           await updateDoc(accountRef, { balance: newBalance });
        }
      }
    }
    await deleteDoc(txRef);
  } catch (error) {
    console.error("Erro ao deletar transação:", error);
    throw error;
  }
};

export const addRecurringTransaction = async (recurring: RecurringTransaction) => {
  const userId = getCurrentUserId();
  await setDoc(doc(db, 'recurring_transactions', recurring.id), { ...recurring, userId });
};

// ==========================================
// CONTAS (COM FILTRO DE USUÁRIO)
// ==========================================
export const getAccounts = async (): Promise<Account[]> => {
  try {
    const userId = getCurrentUserId();
    const q = query(collection(db, 'accounts'), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const accounts = querySnapshot.docs.map(d => convertDoc<Account>(d));
    return accounts; // Retorna vazio se não tiver contas (o seed irá criar)
  } catch (error) {
    return [];
  }
};

// ✅ Agora cria com ID do Firestore quando precisar (evita erro de permissions)
export const addAccount = async (account: Account) => {
  const userId = getCurrentUserId();

  // Se vier com ID "não Firestore" (ex: uuid 36 chars), geramos um ID Firestore (20 chars)
  const shouldGenerateId = !isFirestoreLikeId(account.id);

  if (shouldGenerateId) {
    const newRef = doc(collection(db, 'accounts'));
    const payload = { ...account, id: newRef.id, userId };
    await setDoc(newRef, payload);
    return;
  }

  // Se o ID já for compatível, salva no ID informado
  await setDoc(doc(db, 'accounts', account.id), { ...account, id: account.id, userId });
};

// ✅ Upsert seguro: se não existir, cria com ID Firestore; se existir, atualiza normalmente
export const updateAccount = async (account: Account) => {
  const userId = getCurrentUserId();

  try {
    const hasGoodId = isFirestoreLikeId(account.id);

    if (hasGoodId) {
      const accRef = doc(db, 'accounts', account.id);
      const snap = await getDoc(accRef);

      if (snap.exists()) {
        // Atualiza mantendo mesmo ID
        await setDoc(accRef, { ...account, id: account.id, userId });
        return;
      }

      // Se não existe ainda, cria com esse id (já compatível)
      await setDoc(accRef, { ...account, id: account.id, userId });
      return;
    }

    // Se o ID não for compatível (uuid, acc_...), cria com ID Firestore
    const newRef = doc(collection(db, 'accounts'));
    await setDoc(newRef, { ...account, id: newRef.id, userId });
  } catch (error) {
    console.error("Erro ao salvar conta:", error);
    throw error;
  }
};

// ADICIONE ESTA FUNÇÃO NOVA:
export const deleteAccount = async (id: string) => {
  try {
    // Nota: Em um app real, verificaríamos se há transações vinculadas antes de deletar
    await deleteDoc(doc(db, 'accounts', id));
  } catch (error) {
    console.error("Erro ao deletar conta:", error);
    throw error;
  }
};

// ==========================================
// CATEGORIAS (COM FILTRO DE USUÁRIO)
// ==========================================
export const getCategories = async (): Promise<Category[]> => {
  try {
    const userId = getCurrentUserId();
    const q = query(collection(db, 'categories'), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => convertDoc<Category>(d));
  } catch (error) {
    return [];
  }
};

export const saveCategory = async (category: Category) => {
  const userId = getCurrentUserId();
  await setDoc(doc(db, 'categories', category.id), { ...category, userId });
};

export const updateCategoryBudget = async (categoryId: string, limit: number) => {
  const catRef = doc(db, 'categories', categoryId);
  await updateDoc(catRef, { budgetLimit: limit });
};

export const suggestCategory = async (description: string): Promise<string> => {
  const lowerDesc = description.toLowerCase();
  const categories = await getCategories();
  
  if (lowerDesc.includes('uber') || lowerDesc.includes('99') || lowerDesc.includes('posto') || lowerDesc.includes('gasolina')) 
    return categories.find(c => c.name === 'Transporte')?.id || '';
  
  if (lowerDesc.includes('ifood') || lowerDesc.includes('mercado') || lowerDesc.includes('padaria') || lowerDesc.includes('restaurante')) 
    return categories.find(c => c.name === 'Alimentação')?.id || '';
  
  if (lowerDesc.includes('netflix') || lowerDesc.includes('spotify') || lowerDesc.includes('cinema')) 
    return categories.find(c => c.name === 'Lazer')?.id || '';
    
  if (lowerDesc.includes('farmacia') || lowerDesc.includes('médico') || lowerDesc.includes('exame')) 
    return categories.find(c => c.name === 'Saúde')?.id || '';

  return categories[0]?.id || ''; 
};

// ==========================================
// METAS (COM FILTRO DE USUÁRIO)
// ==========================================
export const getGoals = async (): Promise<Goal[]> => {
  try {
    const userId = getCurrentUserId();
    const q = query(collection(db, 'goals'), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => convertDoc<Goal>(d));
  } catch (error) {
    return [];
  }
};

export const addGoal = async (goal: Goal) => {
  const userId = getCurrentUserId();
  await setDoc(doc(db, 'goals', goal.id), { ...goal, userId });
};

export const updateGoalBalance = async (goalId: string, amount: number) => {
  const goalRef = doc(db, 'goals', goalId);
  const goalSnap = await getDoc(goalRef);
  
  if (goalSnap.exists()) {
    const goal = goalSnap.data() as Goal;
    const current = goal.currentAmount || 0;
    
    const newHistory = goal.history || [];
    newHistory.push({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      amount: amount
    });

    await updateDoc(goalRef, { 
      currentAmount: current + amount,
      history: newHistory
    });
  }
};

// ==========================================
// LÓGICA DE NEGÓCIO E RELATÓRIOS
// (Usa as funções get... que já filtram por usuário)
// ==========================================

export const calculateBalances = async () => {
  const accounts = await getAccounts();
  const transactions = await getTransactions();
  
  const totalBalance = accounts.reduce((acc, curr) => {
     return curr.type !== AccountType.CREDIT_CARD ? acc + curr.balance : acc;
  }, 0);

  const creditCardBill = accounts.reduce((acc, curr) => {
     return curr.type === AccountType.CREDIT_CARD ? acc + curr.balance : acc;
  }, 0);

  const now = new Date();
  const monthTxs = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const income = monthTxs.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.value, 0);
  const expense = monthTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.value, 0);

  return {
    realBalance: totalBalance,
    projectedBalance: totalBalance - creditCardBill, 
    monthlyIncome: income,
    monthlyExpense: expense
  };
};

export const getMonthlyHistory = async (months: number = 6) => {
  const txs = await getTransactions();
  const history = new Map<string, { income: number, expense: number }>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
    history.set(key, { income: 0, expense: 0 });
  }

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1); 

  txs.forEach(tx => {
     if (!tx.isPaid) return;
     const d = new Date(tx.date);
     
     if (d >= startDate) {
        const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
        if (history.has(key)) {
            const entry = history.get(key)!;
            if (tx.type === TransactionType.INCOME) entry.income += tx.value;
            if (tx.type === TransactionType.EXPENSE) entry.expense += tx.value;
        }
     }
  });

  return Array.from(history.entries()).map(([name, data]) => ({
    name, 
    income: data.income,
    expense: data.expense
  }));
};

export const getExpensesByCategory = async (months: number = 6) => {
  const txs = await getTransactions();
  const cats = await getCategories();
  const data: {[key: string]: number} = {};

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);

  txs.forEach(tx => {
    const d = new Date(tx.date);
    if (tx.type === TransactionType.EXPENSE && tx.isPaid && d >= startDate) {
       data[tx.categoryId] = (data[tx.categoryId] || 0) + tx.value;
    }
  });

  return Object.entries(data)
    .map(([id, value]) => ({
      name: cats.find(c => c.id === id)?.name || 'Outros',
      value,
      color: cats.find(c => c.id === id)?.color || '#9ca3af'
    }))
    .sort((a, b) => b.value - a.value);
};

// ==========================================
// ROTINAS AUTOMÁTICAS E NOTIFICAÇÕES
// ==========================================

export const processRecurringTransactions = async () => {
  try {
    // Busca usuário (se não tiver, lança erro e sai do try)
    const userId = getCurrentUserId();
    
    // Busca apenas recorrências ATIVAS deste usuário
    const q = query(collection(db, 'recurring_transactions'), 
      where("userId", "==", userId), 
      where("active", "==", true)
    );
    const snapshot = await getDocs(q);
    
    const today = new Date();
    
    snapshot.forEach(async (docSnap) => {
      const rec = docSnap.data() as RecurringTransaction;
      let nextDate = new Date(rec.nextDueDate);
      
      if (nextDate <= today) {
        const newTx: Transaction = {
          id: crypto.randomUUID(),
          description: rec.description,
          value: rec.value,
          type: rec.type,
          categoryId: rec.categoryId,
          accountId: rec.accountId,
          date: nextDate.toISOString(),
          isPaid: false, 
          isRecurring: true
        };
        
        // addTransaction já adiciona o userId
        await addTransaction(newTx);
        
        // Calcula próxima data
        const nextDueDate = new Date(nextDate);
        if (rec.frequency === RecurrenceFrequency.DAILY) nextDueDate.setDate(nextDueDate.getDate() + 1);
        if (rec.frequency === RecurrenceFrequency.WEEKLY) nextDueDate.setDate(nextDueDate.getDate() + 7);
        if (rec.frequency === RecurrenceFrequency.MONTHLY) nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        if (rec.frequency === RecurrenceFrequency.YEARLY) nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        
        await updateDoc(doc(db, 'recurring_transactions', rec.id), {
          nextDueDate: nextDueDate.toISOString(),
          lastGeneratedDate: new Date().toISOString()
        });
      }
    });
  } catch (e) {
    // Silencioso se não tiver usuário logado
  }
};

export const checkUpcomingAlerts = async (): Promise<AppNotification[]> => {
  // getTransactions já filtra pelo usuário, então não precisamos filtrar aqui de novo
  const transactions = await getTransactions();
  const alerts: AppNotification[] = [];
  const today = new Date();
  
  today.setHours(0, 0, 0, 0);

  transactions.forEach(tx => {
     if (tx.isPaid) return;
     if (tx.type !== TransactionType.EXPENSE) return;

     const dueDate = new Date(tx.date);
     dueDate.setHours(0, 0, 0, 0);
     
     const diffTime = dueDate.getTime() - today.getTime();
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

     if (diffDays < 0) {
        alerts.push({
           id: `overdue-${tx.id}`,
           title: 'Conta Atrasada!',
           message: `A conta "${tx.description}" venceu há ${Math.abs(diffDays)} dias.`,
           type: 'danger',
           date: new Date().toISOString()
        });
     }
     else if (diffDays === 0) {
        alerts.push({
           id: `today-${tx.id}`,
           title: 'Vence Hoje',
           message: `A conta "${tx.description}" vence hoje.`,
           type: 'warning',
           date: new Date().toISOString()
        });
     }
     else if (diffDays <= 3) {
        alerts.push({
           id: `soon-${tx.id}`,
           title: 'Vence em Breve',
           message: `"${tx.description}" vence em ${diffDays} dias.`,
           type: 'info',
           date: new Date().toISOString()
        });
     }
  });

  return alerts;
};

// Preferências continuam locais para cada dispositivo (localStorage)
export const getNotificationPreferences = (): NotificationPreferences => {
  const saved = localStorage.getItem('fin_notif_prefs');
  return saved ? JSON.parse(saved) : { alertOverdue: true, alertUpcoming: true, alertRecurring: true };
};

export const saveNotificationPreferences = (prefs: NotificationPreferences) => {
  localStorage.setItem('fin_notif_prefs', JSON.stringify(prefs));
};
