import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpCircle, Filter, Search, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Account, Category, Transaction, TransactionType } from '../types';
import { getTransactions, getAccounts, getCategories } from '../services/storageService';

interface IncomesViewProps {
  onEditTransaction: (tx: Transaction) => void;
}

type StatusFilter = 'all' | 'paid' | 'pending';

const IncomesView: React.FC<IncomesViewProps> = ({ onEditTransaction }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allTx, accs, cats] = await Promise.all([
          getTransactions(),
          getAccounts(),
          getCategories()
        ]);

        setTransactions(allTx || []);
        setAccounts(accs || []);
        setCategories(cats || []);
      } catch (error) {
        console.error('Erro ao carregar receitas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const accountMap = useMemo(
    () =>
      accounts.reduce<Record<string, Account>>((map, acc) => {
        map[acc.id] = acc;
        return map;
      }, {}),
    [accounts]
  );

  const categoryMap = useMemo(
    () =>
      categories.reduce<Record<string, Category>>((map, cat) => {
        map[cat.id] = cat;
        return map;
      }, {}),
    [categories]
  );

  const incomes = useMemo(
    () => transactions.filter((tx) => tx.type === TransactionType.INCOME),
    [transactions]
  );

  const now = new Date();

  const incomesThisMonth = useMemo(
    () =>
      incomes.filter((tx) => {
        const d = new Date(tx.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }),
    [incomes, now]
  );

  const filteredIncomes = useMemo(
    () =>
      incomesThisMonth.filter((tx) => {
        if (statusFilter === 'paid' && !tx.isPaid) return false;
        if (statusFilter === 'pending' && tx.isPaid) return false;

        if (search.trim()) {
          const s = search.toLowerCase();
          const cat = categoryMap[tx.categoryId];
          const acc = accountMap[tx.accountId];
          if (
            !tx.description.toLowerCase().includes(s) &&
            !(cat && cat.name.toLowerCase().includes(s)) &&
            !(acc && acc.name.toLowerCase().includes(s))
          ) {
            return false;
          }
        }

        return true;
      }),
    [incomesThisMonth, statusFilter, search, categoryMap, accountMap]
  );

  const totalMonth = incomesThisMonth.reduce((sum, tx) => sum + tx.value, 0);
  const totalPaid = incomesThisMonth
    .filter((tx) => tx.isPaid)
    .reduce((s, tx) => s + tx.value, 0);
  const totalPending = incomesThisMonth
    .filter((tx) => !tx.isPaid)
    .reduce((s, tx) => s + tx.value, 0);

  return (
    <div className="space-y-6 pb-24">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center space-x-2">
            <ArrowUpCircle className="text-emerald-500" size={26} />
            <span>Receitas</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Entradas organizadas por mês, com visão clara do que já entrou e do que ainda falta receber.
          </p>
        </div>
        <div className="text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-xl border border-emerald-100 shadow-sm flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>
            Mês atual:&nbsp;
            {format(now, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
            Total de receitas no mês
          </p>
          <p className="text-2xl font-bold text-gray-900">
            R$ {totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
            Já recebidas
          </p>
          <p className="text-2xl font-bold text-emerald-600">
            R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-yellow-100 shadow-sm">
          <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">
            Pendentes de receber
          </p>
          <p className="text-2xl font-bold text-yellow-600">
            R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1 flex items-center space-x-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por descrição, categoria ou conta..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="hidden md:inline text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Filtrar:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center space-x-1 ${
              statusFilter === 'all'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            <Filter size={14} />
            <span>Todos</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              statusFilter === 'paid'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            Recebidos
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              statusFilter === 'pending'
                ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            Pendentes
          </button>
        </div>
      </div>

      {/* Lista de receitas */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            Receitas do mês ({filteredIncomes.length})
          </span>
        </div>

        {loading ? (
          <div className="py-8 flex items-center justify-center text-gray-400 text-sm">
            Carregando receitas...
          </div>
        ) : filteredIncomes.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-gray-400 text-sm">
            <p>Nenhuma receita encontrada para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredIncomes.map((tx) => {
              const account = accountMap[tx.accountId];
              const category = categoryMap[tx.categoryId];

              return (
                <div
                  key={tx.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-sm font-bold">
                      <ArrowUpCircle size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {tx.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(tx.date), 'dd/MM/yyyy', { locale: ptBR })} •{' '}
                        {category ? category.name : 'Sem categoria'} •{' '}
                        {account ? account.name : 'Sem conta'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        tx.isPaid
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                      }`}
                    >
                      {tx.isPaid ? 'Recebida' : 'Pendente'}
                    </span>
                    <span className="font-bold text-emerald-600 text-sm">
                      + R${' '}
                      {tx.value.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEditTransaction(tx)}
                      className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomesView;
