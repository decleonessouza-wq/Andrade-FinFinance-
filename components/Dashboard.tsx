import React, { useEffect, useState } from 'react';
import { calculateBalances, getTransactions } from '../services/storageService';
import { Transaction, DashboardData } from '../types';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Activity,
  CalendarDays,
  Edit2,
  TrendingDown,
  Info,
  Wallet
} from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProps {
  onEditTransaction: (tx: Transaction) => void;
  onNavigate: (view: string) => void;
  refreshKey?: number;
}

// Tooltip ajustado (não quebra <p>)
const InfoTooltip = ({ text, dark = false }: { text: string; dark?: boolean }) => (
  <span className="group/info relative ml-1.5 inline-flex items-center justify-center z-20">
    <Info
      size={14}
      className={`${
        dark ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-brand-500'
      } cursor-help transition-colors`}
    />
    <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-48 sm:w-56 bg-gray-900/95 backdrop-blur-sm text-white text-xs font-medium rounded-xl py-2.5 px-3.5 opacity-0 group-hover/info:opacity-100 transition-all duration-200 pointer-events-none shadow-xl text-center leading-relaxed translate-y-1 group-hover:translate-y-0 border border-white/10">
      {text}
      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900/95" />
    </div>
  </span>
);

const Dashboard: React.FC<DashboardProps> = ({ onEditTransaction, onNavigate, refreshKey }) => {
  const [balanceData, setBalanceData] = useState<DashboardData>({
    realBalance: 0,
    projectedBalance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Fluxo do mês (receitas - despesas)
  const monthlyFlow =
    (balanceData?.monthlyIncome || 0) - (balanceData?.monthlyExpense || 0);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [balances, allTransactions] = await Promise.all([
          calculateBalances().catch(() => ({
            realBalance: 0,
            projectedBalance: 0,
            monthlyIncome: 0,
            monthlyExpense: 0
          })),
          getTransactions().catch(() => [])
        ]);

        setBalanceData(
          balances || { realBalance: 0, projectedBalance: 0, monthlyIncome: 0, monthlyExpense: 0 }
        );

        if (Array.isArray(allTransactions)) {
          setRecentTransactions(allTransactions.slice(0, 5));
        } else {
          setRecentTransactions([]);
        }
      } catch (error) {
        console.error('Erro no dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [refreshKey]);

  const chartData = [
    { name: 'S1', val: 400 },
    { name: 'S2', val: 300 },
    { name: 'S3', val: 550 },
    { name: 'S4', val: 480 }
  ];

  return (
    <div className="space-y-8 animate-fade-in-up pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Visão Geral
          </h1>
          <p className="text-gray-500 mt-1 flex items-center text-sm">
            <CalendarDays size={16} className="mr-2 text-brand-500" />
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => onNavigate('reports')}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm hover:shadow-md flex items-center transform hover:scale-105 active:scale-95"
          >
            <Activity size={16} className="mr-2 text-brand-600" />
            Relatório
          </button>
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Saldo Atual = soma das carteiras (sem cartão) */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-6 text-white shadow-2xl shadow-brand-900/30 relative overflow-hidden group border border-brand-500/30 transform hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <WalletIconSVG size={80} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                <Wallet size={20} className="text-white" />
              </div>
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-100 px-2 py-1 rounded-md border border-emerald-500/30">
                Principal
              </span>
            </div>
            <p className="text-brand-100 text-sm font-medium mb-1 flex items-center">
              Saldo Atual
              <InfoTooltip text="Soma dos saldos de todas as carteiras (sem cartão de crédito)." dark />
            </p>
            <h2 className="text-3xl font-bold tracking-tight mb-3 drop-shadow-sm">
              R${' '}
              {balanceData?.realBalance?.toLocaleString('pt-BR', {
                minimumFractionDigits: 2
              }) || '0,00'}
            </h2>

            {/* Chip do fluxo do mês */}
            <div
              className={`inline-flex items-center text-xs px-3 py-1.5 rounded-lg backdrop-blur-md border ${
                monthlyFlow >= 0
                  ? 'bg-emerald-500/15 text-emerald-50 border-emerald-300/40'
                  : 'bg-red-500/15 text-red-50 border-red-300/40'
              }`}
            >
              <TrendingUp size={14} className="mr-1.5" />
              <span>
                Fluxo do mês:{' '}
                {monthlyFlow >= 0 ? '+' : '-'} R{'$ '}
                {Math.abs(monthlyFlow).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Saldo projetado = realBalance - faturas cartão */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 border-t-4 border-t-purple-500 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <CreditCardIconSVG size={20} />
            </div>
          </div>
          <p className="text-gray-500 text-sm font-medium mb-1 flex items-center">
            Saldo Projetado
            <InfoTooltip text="Saldo das carteiras subtraindo as faturas de cartão de crédito em aberto." />
          </p>
          <h2
            className={`text-2xl font-bold tracking-tight mb-2 ${
              balanceData?.projectedBalance < 0 ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            R${' '}
            {balanceData?.projectedBalance?.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            }) || '0,00'}
          </h2>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '75%' }} />
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">Considerando faturas</p>
        </div>

        {/* Card 3: Receitas */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 border-t-4 border-t-emerald-500 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <ArrowUpCircle size={20} />
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
              Mês Atual
            </span>
          </div>
          <p className="text-gray-500 text-sm font-medium mb-1">Receitas</p>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            R${' '}
            {balanceData?.monthlyIncome?.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            }) || '0,00'}
          </h2>
          <div className="h-10 mt-2 -ml-2 opacity-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <Bar dataKey="val" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Despesas */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 border-t-4 border-t-red-500 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <ArrowDownCircle size={20} />
            </div>
          </div>
          <p className="text-gray-500 text-sm font-medium mb-1">Despesas</p>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            R${' '}
            {balanceData?.monthlyExpense?.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            }) || '0,00'}
          </h2>
          <div className="mt-3 flex items-center space-x-2">
            <span className="flex items-center text-xs font-bold text-red-700 bg-red-50 px-2 py-1 rounded-md border border-red-100">
              <AlertCircle size={12} className="mr-1" />
              Saídas
            </span>
          </div>
        </div>
      </div>

      {/* Transações + Acesso rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transações recentes */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-gray-900">Transações Recentes</h3>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-brand-600 text-sm font-bold hover:text-brand-700 transition-colors hover:underline"
            >
              Ver todas
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-gray-400 py-4">Carregando transações...</p>
            ) : recentTransactions.length === 0 ? (
              <p className="text-center text-gray-400 py-4 italic">
                Nenhuma transação recente.
              </p>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="group flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md hover:border-brand-100 transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm ${
                        tx.type === 'INCOME'
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {tx.type === 'INCOME' ? (
                        <TrendingUp size={20} />
                      ) : (
                        <TrendingDown size={20} />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{tx.description}</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5 flex items-center">
                        <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600 mr-2">
                          {format(new Date(tx.date), 'dd MMM')}
                        </span>
                        {tx.isPaid ? 'Pago' : 'Pendente'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`font-bold ${
                        tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {tx.type === 'INCOME' ? '+' : '-'} R${' '}
                      {tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTransaction(tx);
                      }}
                      className="p-2 text-gray-300 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Acesso rápido */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg p-6 h-fit">
          <h3 className="font-bold text-lg text-gray-900 mb-6">Acesso Rápido</h3>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate('transactions')}
              className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl hover:shadow-md hover:-translate-y-1 transition-all text-left group"
            >
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 text-emerald-500 group-hover:scale-110 transition-transform">
                <ArrowUpCircle size={20} />
              </div>
              <span className="text-sm font-bold text-emerald-800">Nova Receita</span>
            </button>
            <button
              onClick={() => onNavigate('expenses')}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl hover:shadow-md hover:-translate-y-1 transition-all text-left group"
            >
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 text-red-500 group-hover:scale-110 transition-transform">
                <ArrowDownCircle size={20} />
              </div>
              <span className="text-sm font-bold text-red-800">Nova Despesa</span>
            </button>
          </div>

          <button
            onClick={() => onNavigate('transactions')}
            className="w-full mt-6 py-3.5 px-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black hover:shadow-lg transition-all flex items-center justify-center text-sm group shadow-md"
          >
            <span>Ver Extrato Completo</span>
            <ChevronRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Ícones SVG auxiliares
function WalletIconSVG(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function CreditCardIconSVG(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

export default Dashboard;
