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
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "./firebaseConfig";
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
  NotificationPreferences,
} from "../types";

// ==========================================
// HELPERS DE SEGURANÇA
// ==========================================

// ✅ Remove campos undefined (Firestore não aceita undefined)
function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined) as any;
  }
  if (obj && typeof obj === "object") {
    const out: any = {};
    Object.entries(obj as any).forEach(([k, v]) => {
      if (v === undefined) return;
      out[k] = stripUndefined(v);
    });
    return out;
  }
  return obj;
}

const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");
  return user.uid;
};

const toNumber = (val: any, fallback = 0) => {
  const n = typeof val === "number" ? val : parseFloat(String(val ?? ""));
  return Number.isFinite(n) ? n : fallback;
};

const toStringSafe = (val: any, fallback = "") => {
  const s = String(val ?? fallback);
  return s;
};

const convertDoc = <T>(docSnap: any): T => {
  // garante que o id do documento prevaleça
  const data = docSnap.data ? docSnap.data() : {};
  return { ...data, id: docSnap.id } as T;
};

// ✅ Helper: valida ID "padrão Firestore" (auto-id costuma ter 20 chars)
// (obs: Firestore aceita outros ids, mas você já usa isso como regra interna do app)
const isFirestoreLikeId = (id?: string) => {
  return typeof id === "string" && id.length === 20;
};

const assertOwner = async (col: string, id: string, userId: string) => {
  const ref = doc(db, col, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Documento não encontrado.");
  const data = snap.data() as any;
  if (data?.userId !== userId) throw new Error("Acesso negado (owner mismatch).");
  return { ref, data };
};

const ensureId = (id?: string) => {
  if (id && String(id).trim()) return String(id);
  // fallback (crypto pode não existir em alguns ambientes)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = typeof crypto !== "undefined" ? crypto : null;
  return c?.randomUUID ? c.randomUUID() : `id_${Date.now()}`;
};

// ==========================================
// DADOS INICIAIS (SEED)
// ==========================================
const INITIAL_ACCOUNTS: Account[] = [
  { id: "1", name: "Nubank (Conta)", type: AccountType.CHECKING, balance: 2500, icon: "landmark" },
  { id: "2", name: "Carteira Física", type: AccountType.CASH, balance: 150, icon: "wallet" },
  {
    id: "3",
    name: "Nubank (Cartão)",
    type: AccountType.CREDIT_CARD,
    balance: 1200,
    closingDay: 25,
    dueDay: 5,
    limit: 5000,
    icon: "credit-card",
  },
  { id: "4", name: "Reserva Emergência", type: AccountType.INVESTMENT, balance: 10000, icon: "trending-up" },
];

const INITIAL_CATEGORIES: Category[] = [
  { id: "1", name: "Moradia", color: "#ef4444", icon: "home" },
  { id: "2", name: "Alimentação", color: "#f59e0b", icon: "shopping-cart", budgetLimit: 1200 },
  { id: "3", name: "Transporte", color: "#3b82f6", icon: "car" },
  { id: "4", name: "Lazer", color: "#8b5cf6", icon: "party-popper" },
  { id: "5", name: "Saúde", color: "#10b981", icon: "heart-pulse" },
  { id: "6", name: "Educação", color: "#6366f1", icon: "graduation-cap" },
  { id: "7", name: "Salário", color: "#10b981", icon: "banknote" },
  { id: "8", name: "Investimentos", color: "#8b5cf6", icon: "trending-up" },
  { id: "9", name: "Outros", color: "#9ca3af", icon: "circle-dashed" },
];

// ==========================================
// INICIALIZAÇÃO E MIGRAÇÃO (POR USUÁRIO)
// ==========================================
export const initializeDataIfNeeded = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const userId = user.uid;

    // CATEGORIAS
    const catsQuery = query(collection(db, "categories"), where("userId", "==", userId));
    const catsSnapshot = await getDocs(catsQuery);

    if (catsSnapshot.empty) {
      console.log("Inicializando Categorias para o novo usuário...");
      const batch = writeBatch(db);

      INITIAL_CATEGORIES.forEach((cat) => {
        const newRef = doc(collection(db, "categories"));
        batch.set(newRef, stripUndefined({ ...cat, id: newRef.id, userId }));
      });

      await batch.commit();
    }

    // CONTAS
    const accsQuery = query(collection(db, "accounts"), where("userId", "==", userId));
    const accsSnapshot = await getDocs(accsQuery);

    if (accsSnapshot.empty) {
      console.log("Inicializando Contas para o novo usuário...");
      const batch = writeBatch(db);

      INITIAL_ACCOUNTS.forEach((acc) => {
        const newRef = doc(collection(db, "accounts"));
        batch.set(
          newRef,
          stripUndefined({
            ...acc,
            id: newRef.id,
            userId,
            balance: toNumber((acc as any).balance, 0),
          })
        );
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
    const q = query(collection(db, "transactions"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    const txs = querySnapshot.docs.map((d) => {
      const t = convertDoc<Transaction>(d) as any;
      // normaliza
      return {
        ...t,
        id: t.id,
        description: toStringSafe(t.description),
        value: toNumber(t.value, 0),
        date: toStringSafe(t.date),
        isPaid: Boolean(t.isPaid),
      } as Transaction;
    });

    return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return [];
  }
};

export const addTransaction = async (transaction: Transaction) => {
  try {
    const userId = getCurrentUserId();

    const txId = ensureId(transaction.id);
    const payload: any = stripUndefined({
      ...transaction,
      id: txId,
      userId,
      value: toNumber((transaction as any).value, 0),
      date: toStringSafe((transaction as any).date, new Date().toISOString()),
      isPaid: Boolean((transaction as any).isPaid),
    });

    await setDoc(doc(db, "transactions", txId), payload);

    // Atualizar saldo da conta se a transação estiver paga
    if (payload.isPaid) {
      // checa owner da conta antes de mexer
      const { ref: accountRef, data: accData } = await assertOwner("accounts", payload.accountId, userId);
      const account = accData as Account;

      let newBalance = toNumber((account as any).balance, 0);

      if (payload.type === TransactionType.INCOME) {
        newBalance += payload.value;
      } else if (payload.type === TransactionType.EXPENSE) {
        // Cartão: sua lógica atual soma para representar fatura (ok)
        if (account.type === AccountType.CREDIT_CARD) newBalance += payload.value;
        else newBalance -= payload.value;
      }

      await updateDoc(accountRef, stripUndefined({ balance: newBalance }));
    }
  } catch (error) {
    console.error("Erro ao adicionar transação:", error);
    throw error;
  }
};

export const updateTransaction = async (updatedTx: Transaction) => {
  try {
    const userId = getCurrentUserId();

    // garante que a transação pertence ao user (rules friendly)
    await assertOwner("transactions", updatedTx.id, userId);

    const payload = stripUndefined({
      ...updatedTx,
      userId,
      value: toNumber((updatedTx as any).value, 0),
      date: toStringSafe((updatedTx as any).date),
      isPaid: Boolean((updatedTx as any).isPaid),
    });

    await setDoc(doc(db, "transactions", updatedTx.id), payload);
  } catch (error) {
    console.error("Erro ao atualizar transação:", error);
    throw error;
  }
};

export const deleteTransaction = async (id: string) => {
  try {
    const userId = getCurrentUserId();

    // Busca e garante owner
    const { ref: txRef, data: txData } = await assertOwner("transactions", id, userId);
    const tx = txData as any;

    if (tx?.isPaid) {
      const { ref: accountRef, data: accData } = await assertOwner("accounts", tx.accountId, userId);
      const account = accData as Account;

      let newBalance = toNumber((account as any).balance, 0);
      const value = toNumber(tx.value, 0);

      // Estorno (lógica inversa)
      if (tx.type === TransactionType.INCOME) {
        newBalance -= value;
      } else if (tx.type === TransactionType.EXPENSE) {
        if (account.type === AccountType.CREDIT_CARD) newBalance -= value;
        else newBalance += value;
      }

      await updateDoc(accountRef, stripUndefined({ balance: newBalance }));
    }

    await deleteDoc(txRef);
  } catch (error) {
    console.error("Erro ao deletar transação:", error);
    throw error;
  }
};

export const addRecurringTransaction = async (recurring: RecurringTransaction) => {
  const userId = getCurrentUserId();
  const recId = ensureId(recurring.id);

  await setDoc(
    doc(db, "recurring_transactions", recId),
    stripUndefined({ ...recurring, id: recId, userId })
  );
};

// ==========================================
// CONTAS (COM FILTRO DE USUÁRIO)
// ==========================================
export const getAccounts = async (): Promise<Account[]> => {
  try {
    const userId = getCurrentUserId();
    const q = query(collection(db, "accounts"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((d) => {
      const a = convertDoc<Account>(d) as any;
      return {
        ...a,
        id: a.id,
        name: toStringSafe(a.name),
        balance: toNumber(a.balance, 0),
        closingDay: a.closingDay != null ? toNumber(a.closingDay, 0) : undefined,
        dueDay: a.dueDay != null ? toNumber(a.dueDay, 0) : undefined,
        limit: a.limit != null ? toNumber(a.limit, 0) : undefined,
      } as Account;
    });
  } catch (error) {
    return [];
  }
};

export const addAccount = async (account: Account) => {
  const userId = getCurrentUserId();

  const shouldGenerateId = !isFirestoreLikeId(account.id);

  if (shouldGenerateId) {
    const newRef = doc(collection(db, "accounts"));

    const payload = stripUndefined({
      ...account,
      id: newRef.id,
      userId,
      balance: toNumber((account as any).balance, 0),
      // ⚠️ se for conta que não é cartão, esses campos podem vir undefined e serão removidos
      closingDay: (account as any).closingDay,
      dueDay: (account as any).dueDay,
      limit: (account as any).limit,
    });

    await setDoc(newRef, payload);
    return;
  }

  await setDoc(
    doc(db, "accounts", account.id),
    stripUndefined({
      ...account,
      id: account.id,
      userId,
      balance: toNumber((account as any).balance, 0),
      closingDay: (account as any).closingDay,
      dueDay: (account as any).dueDay,
      limit: (account as any).limit,
    })
  );
};

export const updateAccount = async (account: Account) => {
  const userId = getCurrentUserId();

  try {
    const hasGoodId = isFirestoreLikeId(account.id);

    if (hasGoodId) {
      const accRef = doc(db, "accounts", account.id);
      const snap = await getDoc(accRef);

      // se existe e é de outro user => bloqueia
      if (snap.exists()) {
        const data = snap.data() as any;
        if (data?.userId && data.userId !== userId) {
          throw new Error("Acesso negado (owner mismatch).");
        }
      }

      // ✅ merge evita apagar campos antigos
      await setDoc(
        accRef,
        stripUndefined({
          ...account,
          id: account.id,
          userId,
          balance: toNumber((account as any).balance, 0),
          closingDay: (account as any).closingDay,
          dueDay: (account as any).dueDay,
          limit: (account as any).limit,
        }),
        { merge: true }
      );
      return;
    }

    const newRef = doc(collection(db, "accounts"));
    await setDoc(
      newRef,
      stripUndefined({
        ...account,
        id: newRef.id,
        userId,
        balance: toNumber((account as any).balance, 0),
        closingDay: (account as any).closingDay,
        dueDay: (account as any).dueDay,
        limit: (account as any).limit,
      })
    );
  } catch (error) {
    console.error("Erro ao salvar conta:", error);
    throw error;
  }
};

export const deleteAccount = async (id: string) => {
  try {
    const userId = getCurrentUserId();
    const { ref } = await assertOwner("accounts", id, userId);
    await deleteDoc(ref);
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
    const q = query(collection(db, "categories"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((d) => convertDoc<Category>(d));
  } catch (error) {
    return [];
  }
};

export const saveCategory = async (category: Category) => {
  const userId = getCurrentUserId();
  const catId = ensureId(category.id);

  await setDoc(
    doc(db, "categories", catId),
    stripUndefined({ ...category, id: catId, userId })
  );
};

export const updateCategoryBudget = async (categoryId: string, limit: number) => {
  const userId = getCurrentUserId();
  const { ref } = await assertOwner("categories", categoryId, userId);
  await updateDoc(ref, stripUndefined({ budgetLimit: toNumber(limit, 0) }));
};

export const suggestCategory = async (description: string): Promise<string> => {
  const lowerDesc = (description || "").toLowerCase();
  const categories = await getCategories();

  if (
    lowerDesc.includes("uber") ||
    lowerDesc.includes("99") ||
    lowerDesc.includes("posto") ||
    lowerDesc.includes("gasolina")
  )
    return categories.find((c) => c.name === "Transporte")?.id || "";

  if (
    lowerDesc.includes("ifood") ||
    lowerDesc.includes("mercado") ||
    lowerDesc.includes("padaria") ||
    lowerDesc.includes("restaurante")
  )
    return categories.find((c) => c.name === "Alimentação")?.id || "";

  if (
    lowerDesc.includes("netflix") ||
    lowerDesc.includes("spotify") ||
    lowerDesc.includes("cinema")
  )
    return categories.find((c) => c.name === "Lazer")?.id || "";

  if (lowerDesc.includes("farmacia") || lowerDesc.includes("médico") || lowerDesc.includes("exame"))
    return categories.find((c) => c.name === "Saúde")?.id || "";

  return categories[0]?.id || "";
};

// ==========================================
// METAS (COM FILTRO DE USUÁRIO)
// ==========================================
export const getGoals = async (): Promise<Goal[]> => {
  try {
    const userId = getCurrentUserId();
    const q = query(collection(db, "goals"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((d) => convertDoc<Goal>(d));
  } catch (error) {
    return [];
  }
};

export const addGoal = async (goal: Goal) => {
  const userId = getCurrentUserId();
  const goalId = ensureId(goal.id);
  await setDoc(doc(db, "goals", goalId), stripUndefined({ ...goal, id: goalId, userId }));
};

export const updateGoalBalance = async (goalId: string, amount: number) => {
  const userId = getCurrentUserId();
  const { ref, data } = await assertOwner("goals", goalId, userId);

  const goal = data as any;
  const current = toNumber(goal.currentAmount, 0);
  const add = toNumber(amount, 0);

  const history = Array.isArray(goal.history) ? [...goal.history] : [];
  const entryId =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (typeof crypto !== "undefined" && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `h_${Date.now()}`;

  history.push({
    id: entryId,
    date: new Date().toISOString(),
    amount: add,
  });

  await updateDoc(
    ref,
    stripUndefined({
      currentAmount: current + add,
      history,
    })
  );
};

// ==========================================
// LÓGICA DE NEGÓCIO E RELATÓRIOS
// ==========================================
export const calculateBalances = async () => {
  const accounts = await getAccounts();
  const transactions = await getTransactions();

  const totalBalance = accounts.reduce((acc, curr) => {
    const bal = toNumber((curr as any).balance, 0);
    return curr.type !== AccountType.CREDIT_CARD ? acc + bal : acc;
  }, 0);

  // “fatura” do cartão (se você guarda como positivo, ok)
  const creditCardBill = accounts.reduce((acc, curr) => {
    const bal = toNumber((curr as any).balance, 0);
    return curr.type === AccountType.CREDIT_CARD ? acc + bal : acc;
  }, 0);

  const now = new Date();
  const monthTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const income = monthTxs
    .filter((t) => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + toNumber((t as any).value, 0), 0);

  const expense = monthTxs
    .filter((t) => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + toNumber((t as any).value, 0), 0);

  return {
    realBalance: toNumber(totalBalance, 0),
    projectedBalance: toNumber(totalBalance - creditCardBill, 0),
    monthlyIncome: toNumber(income, 0),
    monthlyExpense: toNumber(expense, 0),
  };
};

export const getMonthlyHistory = async (months: number = 6) => {
  const txs = await getTransactions();
  const history = new Map<string, { income: number; expense: number }>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
    history.set(key, { income: 0, expense: 0 });
  }

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);

  txs.forEach((tx) => {
    if (!tx.isPaid) return;
    const d = new Date(tx.date);
    if (d >= startDate) {
      const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
      if (history.has(key)) {
        const entry = history.get(key)!;
        const v = toNumber((tx as any).value, 0);
        if (tx.type === TransactionType.INCOME) entry.income += v;
        if (tx.type === TransactionType.EXPENSE) entry.expense += v;
      }
    }
  });

  return Array.from(history.entries()).map(([name, data]) => ({
    name,
    income: toNumber(data.income, 0),
    expense: toNumber(data.expense, 0),
  }));
};

export const getExpensesByCategory = async (months: number = 6) => {
  const txs = await getTransactions();
  const cats = await getCategories();
  const data: { [key: string]: number } = {};

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);

  txs.forEach((tx) => {
    const d = new Date(tx.date);
    if (tx.type === TransactionType.EXPENSE && tx.isPaid && d >= startDate) {
      const v = toNumber((tx as any).value, 0);
      data[tx.categoryId] = (data[tx.categoryId] || 0) + v;
    }
  });

  return Object.entries(data)
    .map(([id, value]) => {
      const cat = cats.find((c) => c.id === id);
      return {
        name: cat?.name || "Outros",
        value: toNumber(value, 0),
        color: cat?.color || "#9ca3af",
      };
    })
    .sort((a, b) => b.value - a.value);
};

// ==========================================
// ROTINAS AUTOMÁTICAS E NOTIFICAÇÕES
// ==========================================
export const processRecurringTransactions = async () => {
  try {
    const userId = getCurrentUserId();

    const qRec = query(
      collection(db, "recurring_transactions"),
      where("userId", "==", userId),
      where("active", "==", true)
    );
    const snapshot = await getDocs(qRec);

    const today = new Date();

    // ✅ NÃO usar forEach(async ...) (não aguarda)
    for (const docSnap of snapshot.docs) {
      const rec = docSnap.data() as any as RecurringTransaction;
      const nextDate = new Date(toStringSafe((rec as any).nextDueDate));

      if (!Number.isFinite(nextDate.getTime())) continue;

      if (nextDate <= today) {
        const newTx: Transaction = {
          id: ensureId(undefined),
          description: toStringSafe((rec as any).description),
          value: toNumber((rec as any).value, 0),
          type: (rec as any).type,
          categoryId: (rec as any).categoryId,
          accountId: (rec as any).accountId,
          date: nextDate.toISOString(),
          isPaid: false,
          isRecurring: true,
        };

        await addTransaction(newTx);

        const nextDueDate = new Date(nextDate);
        if (rec.frequency === RecurrenceFrequency.DAILY) nextDueDate.setDate(nextDueDate.getDate() + 1);
        if (rec.frequency === RecurrenceFrequency.WEEKLY) nextDueDate.setDate(nextDueDate.getDate() + 7);
        if (rec.frequency === RecurrenceFrequency.MONTHLY) nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        if (rec.frequency === RecurrenceFrequency.YEARLY) nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);

        // garanta que update bate nas rules (doc pertence ao user)
        await assertOwner("recurring_transactions", docSnap.id, userId);

        await updateDoc(
          doc(db, "recurring_transactions", docSnap.id),
          stripUndefined({
            nextDueDate: nextDueDate.toISOString(),
            lastGeneratedDate: new Date().toISOString(),
          })
        );
      }
    }
  } catch {
    // silencioso se não tiver usuário
  }
};

export const checkUpcomingAlerts = async (): Promise<AppNotification[]> => {
  const transactions = await getTransactions();
  const alerts: AppNotification[] = [];
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  transactions.forEach((tx) => {
    if (tx.isPaid) return;
    if (tx.type !== TransactionType.EXPENSE) return;

    const dueDate = new Date(tx.date);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      alerts.push({
        id: `overdue-${tx.id}`,
        title: "Conta Atrasada!",
        message: `A conta "${tx.description}" venceu há ${Math.abs(diffDays)} dias.`,
        type: "danger",
        date: new Date().toISOString(),
      });
    } else if (diffDays === 0) {
      alerts.push({
        id: `today-${tx.id}`,
        title: "Vence Hoje",
        message: `A conta "${tx.description}" vence hoje.`,
        type: "warning",
        date: new Date().toISOString(),
      });
    } else if (diffDays <= 3) {
      alerts.push({
        id: `soon-${tx.id}`,
        title: "Vence em Breve",
        message: `"${tx.description}" vence em ${diffDays} dias.`,
        type: "info",
        date: new Date().toISOString(),
      });
    }
  });

  return alerts;
};

// Preferências continuam locais por dispositivo (pode virar Firestore depois se quiser)
export const getNotificationPreferences = (): NotificationPreferences => {
  const saved = localStorage.getItem("fin_notif_prefs");
  return saved
    ? JSON.parse(saved)
    : { alertOverdue: true, alertUpcoming: true, alertRecurring: true };
};

export const saveNotificationPreferences = (prefs: NotificationPreferences) => {
  localStorage.setItem("fin_notif_prefs", JSON.stringify(prefs));
};
