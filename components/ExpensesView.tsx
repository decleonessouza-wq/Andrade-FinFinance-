import React, { useEffect, useState } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { getTransactions, getCategories } from '../services/storageService';
import { 
  ArrowDownCircle, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  AlertCircle, 
  DollarSign,
  Activity
} from 'lucide-react';
import { format, addMonths, subMonths, isSameMonth, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface ExpensesViewProps {
  onEditTransaction: (tx: Transaction) => void;
}

const ExpensesView: React.FC<ExpensesViewProps> = ({ onEditTransaction }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Dados Processados
  const [filteredExpenses, setFilteredExpenses] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Estatísticas
  const [totalExpense, setTotalExpense] = useState(0);
  const [dailyAverage, setDailyAverage] = useState(0);
  const [topCategory, setTopCategory] = useState<{name: string, value: number} | null>(null);
  
  const [loading, setLoading] = useState(true);

  // 1. Carregamento Inicial Seguro
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [txData, catData] = await Promise.all([getTransactions(), getCategories()]);
        setTransactions(Array.isArray(txData) ? txData : []);
        setCategories(Array.isArray(catData) ? catData : []);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. Processamento de Dados (Filtros e Cálculos)
  useEffect(() => {
    // Filtra apenas DESPESAS do mês selecionado
    const expenses = transactions.filter(tx => 
       tx.type === TransactionType.EXPENSE && 
       isSameMonth(new Date(tx.date), selectedDate)
    );
    
    // Ordena por valor (maiores gastos primeiro) para análise
    expenses.sort((a, b) => b.value - a.value);
    setFilteredExpenses(expenses);

    // Cálculo Total
    const total = expenses.reduce((acc, curr) => acc + curr.value, 0);
    setTotalExpense(total);

    // Cálculo Média Diária (Considerando dias passados ou total do mês)
    const daysInMonth = getDaysInMonth(selectedDate);
    const today = new Date();
    const isCurrentMonth = isSameMonth(selectedDate, today);
    const daysPassed = isCurrentMonth ? today.getDate() : daysInMonth;
    setDailyAverage(daysPassed > 0 ? total / daysPassed : 0);

    // Agrupamento por Categoria para Gráfico e Top Category
    const categoryTotals: {[key: string]: number} = {};
    expenses.forEach(tx => {
       categoryTotals[tx.categoryId] = (categoryTotals[tx.categoryId] || 0) + tx.value;
    });

    const data = Object.entries(categoryTotals).map(([id, value]) => ({
       name: categories.find(c => c.id === id)?.name || 'Outros',
       value,
       color: categories.find(c => c.id === id)?.color || '#9ca3af'
    })).sort((a, b) => b.value - a.value);

    setChartData(data);
    setTopCategory(data.length > 0 ? { name: data[0].name, value: data[0].value } : null);

  }, [selectedDate, transactions, categories]);

  const changeMonth = (amount: number) => setSelectedDate(prev => amount > 0 ? addMonths(prev, amount) : subMonths(prev, Math.abs(amount)));
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Outros';
  const getCategoryColor = (id: string) => categories.find(c => c.id === id)?.color || '#cbd5e1';

  if (loading) return <div className="p-10 text-center text-gray-400">Carregando análise...</div>;

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      
      {/* Cabeçalho com Navegação de Mês */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
         <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-2xl text-red-600 shadow-sm">
               <ArrowDownCircle size={28} />
            </div>
            <div>
               <h1 className="text-xl font-bold text-gray-900">Análise de Despesas</h1>
               <p className="text-gray-500 text-xs">Onde seu dinheiro está indo?</p>
            </div>
         </div>

         <div className="flex items-center bg-gray-50 p-1.5 rounded-xl border border-gray-200">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-600 transition-all"><ChevronLeft size={20} /></button>
            <div className="flex items-center px-6 font-bold text-gray-800 min-w-[160px] justify-center uppercase tracking-wide text-sm">
               <Calendar size={16} className="mr-2 text-red-500" />
               <span>{format(selectedDate, 'MMMM yyyy', { locale: ptBR })}</span>
            </div>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-600 transition-all"><ChevronRight size={20} /></button>
         </div>
      </div>

      {/* Cards de KPI (Indicadores) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {/* Total Gasto */}
         <div className="bg-gradient-to-br from-red-500 to-red-700 p-6 rounded-3xl shadow-lg shadow-red-100 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10"><DollarSign size={80} /></div>
            <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-1">Total do Mês</p>
            <h2 className="text-3xl font-bold">R$ {totalExpense.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
            <div className="mt-4 text-xs bg-white/20 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
               Saídas Confirmadas
            </div>
         </div>

         {/* Média Diária */}
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center group hover:border-red-200 transition-colors">
            <div className="flex items-center space-x-2 mb-2">
               <Activity size={18} className="text-orange-500" />
               <p className="text-gray-500 text-xs font-bold uppercase">Média Diária</p>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">R$ {dailyAverage.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
            <p className="text-xs text-gray-400 mt-1">gasto por dia este mês</p>
         </div>

         {/* Maior Vilão (Categoria) */}
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center group hover:border-red-200 transition-colors">
            <div className="flex items-center space-x-2 mb-2">
               <AlertCircle size={18} className="text-red-500" />
               <p className="text-gray-500 text-xs font-bold uppercase">Maior Gasto</p>
            </div>
            {topCategory ? (
               <>
                  <h2 className="text-xl font-bold text-gray-800 truncate">{topCategory.name}</h2>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                     <div className="bg-red-500 h-full" style={{width: `${Math.min((topCategory.value / totalExpense) * 100, 100)}%`}}></div>
                  </div>
                  <p className="text-xs text-red-500 mt-1 font-medium">{((topCategory.value / totalExpense) * 100).toFixed(1)}% do total</p>
               </>
            ) : (
               <p className="text-gray-400 text-sm">Sem dados suficientes</p>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Gráfico de Pizza (Destaque Visual) */}
         <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[350px]">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-6 w-full text-left flex items-center border-b pb-2">
               <PieChartIcon size={16} className="mr-2 text-gray-600"/> Distribuição por Categoria
            </h3>
            
            {chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                     <Pie 
                        data={chartData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={70} 
                        outerRadius={100} 
                        paddingAngle={4} 
                        dataKey="value"
                        cornerRadius={6}
                     >
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                     </Pie>
                     <RechartsTooltip 
                        formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`} 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                     />
                     <Legend iconSize={10} iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{fontSize: '11px', paddingTop: '20px'}} />
                  </PieChart>
               </ResponsiveContainer>
            ) : (
               <div className="text-gray-300 flex flex-col items-center py-10">
                  <PieChartIcon size={64} strokeWidth={1} className="mb-4 opacity-20" />
                  <p className="font-medium">Nenhuma despesa registrada</p>
               </div>
            )}
         </div>

         {/* Lista de Maiores Despesas (Ranking) */}
         <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
               <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide flex items-center">
                  <TrendingUp size={16} className="mr-2 text-red-500" />
                  Detalhamento de Gastos
               </h3>
               <span className="text-xs text-gray-400 font-medium">{filteredExpenses.length} lançamentos</span>
            </div>
            
            <div className="divide-y divide-gray-50 overflow-y-auto max-h-[500px] custom-scrollbar">
               {filteredExpenses.map((tx) => (
                  <div key={tx.id} onClick={() => onEditTransaction(tx)} className="p-4 hover:bg-red-50/30 transition-colors cursor-pointer flex items-center justify-between group">
                     <div className="flex items-center space-x-4">
                        <div 
                           className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-sm"
                           style={{ backgroundColor: getCategoryColor(tx.categoryId) }}
                        >
                           {getCategoryName(tx.categoryId).charAt(0)}
                        </div>
                        <div>
                           <p className="font-bold text-gray-800 group-hover:text-red-600 transition-colors">{tx.description}</p>
                           <div className="flex items-center text-xs text-gray-500 mt-0.5">
                              <span className="font-medium mr-2">{getCategoryName(tx.categoryId)}</span>
                              <span className="w-1 h-1 bg-gray-300 rounded-full mr-2"></span>
                              <span>{format(new Date(tx.date), 'dd/MM/yyyy')}</span>
                           </div>
                        </div>
                     </div>
                     
                     <div className="text-right">
                        <p className="font-bold text-red-600 text-base">- R$ {tx.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                        {/* Barra de progresso visual relativa ao total */}
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-2 ml-auto overflow-hidden">
                           <div 
                              className="h-full bg-red-200 group-hover:bg-red-400 transition-colors" 
                              style={{ width: `${Math.max((tx.value / totalExpense) * 100, 5)}%` }} 
                           />
                        </div>
                     </div>
                  </div>
               ))}
               
               {filteredExpenses.length === 0 && (
                  <div className="p-10 text-center flex flex-col items-center justify-center h-64 text-gray-400">
                     <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <DollarSign size={24} className="text-gray-300" />
                     </div>
                     <p>Nenhuma despesa encontrada neste mês.</p>
                     <p className="text-xs mt-2">Mude o mês ou adicione uma nova despesa.</p>
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default ExpensesView;