import React, { useEffect, useState } from 'react';
import { Category, TransactionType } from '../types';
import { getCategories, getTransactions, updateCategoryBudget } from '../services/storageService';
import { AlertTriangle, ChevronLeft, ChevronRight, Calendar, Edit2, Check, X } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BudgetsView: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [spending, setSpending] = useState<{[key: string]: number}>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newLimit, setNewLimit] = useState('');

  // CORREÇÃO: Carregamento Assíncrono
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [cats, txs] = await Promise.all([
           getCategories(),
           getTransactions()
        ]);
        
        const safeCats = Array.isArray(cats) ? cats : [];
        const safeTxs = Array.isArray(txs) ? txs : [];

        setCategories(safeCats);

        // Calcula gastos
        const targetMonth = selectedDate.getMonth();
        const targetYear = selectedDate.getFullYear();
        const spendingMap: {[key: string]: number} = {};
        
        safeTxs.forEach(tx => {
           const txDate = new Date(tx.date);
           if (tx.type === TransactionType.EXPENSE && 
               txDate.getMonth() === targetMonth && 
               txDate.getFullYear() === targetYear) {
              spendingMap[tx.categoryId] = (spendingMap[tx.categoryId] || 0) + tx.value;
           }
        });
        setSpending(spendingMap);

      } catch (error) {
        console.error("Erro ao carregar orçamentos:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedDate]);

  const handleSaveLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory && newLimit) {
      await updateCategoryBudget(editingCategory.id, parseFloat(newLimit));
      // Update local state to show immediately
      const updatedCats = categories.map(c => 
        c.id === editingCategory.id ? { ...c, budgetLimit: parseFloat(newLimit) } : c
      );
      setCategories(updatedCats);
      setEditingCategory(null);
      setNewLimit('');
    }
  };

  const changeMonth = (amount: number) => {
    setSelectedDate(prev => amount > 0 ? addMonths(prev, amount) : subMonths(prev, Math.abs(amount)));
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Carregando orçamentos...</div>;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Orçamentos Mensais</h1>
           <p className="text-gray-500 text-sm">Defina limites e acompanhe seus gastos</p>
        </div>
        <div className="flex items-center bg-white p-1 rounded-xl shadow-sm border border-gray-200">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronLeft size={20} /></button>
            <div className="flex items-center px-4 font-bold text-gray-800 min-w-[140px] justify-center">
               <Calendar size={16} className="mr-2 text-brand-500" />
               <span className="capitalize">{format(selectedDate, 'MMMM yyyy', { locale: ptBR })}</span>
            </div>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(cat => {
           const limit = cat.budgetLimit || 0;
           const used = spending[cat.id] || 0;
           const percent = limit > 0 ? (used / limit) * 100 : 0;
           const isOver = used > limit && limit > 0;

           return (
              <div key={cat.id} className={`bg-white p-6 rounded-2xl shadow-sm border transition-all ${isOver ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                       <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: cat.color }}>
                          <span className="font-bold">{cat.name.charAt(0)}</span>
                       </div>
                       <div>
                          <h3 className="font-bold text-gray-800">{cat.name}</h3>
                          <p className="text-xs text-gray-500">{limit > 0 ? `${percent.toFixed(0)}% utilizado` : 'Sem limite definido'}</p>
                       </div>
                    </div>
                    <button onClick={() => { setEditingCategory(cat); setNewLimit(limit.toString()); }} className="text-gray-400 hover:text-brand-600 p-1"><Edit2 size={16} /></button>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                       <span className={isOver ? 'text-red-600' : 'text-gray-600'}>R$ {used.toLocaleString('pt-BR')}</span>
                       <span className="text-gray-400">Meta: R$ {limit.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                       <div className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : percent > 80 ? 'bg-yellow-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                    </div>
                    {isOver && <p className="text-xs text-red-500 flex items-center mt-1 font-bold animate-pulse"><AlertTriangle size={12} className="mr-1" />Orçamento excedido!</p>}
                 </div>
              </div>
           );
        })}
      </div>

      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingCategory(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg text-gray-800">Editar Limite: {editingCategory.name}</h3>
               <button onClick={() => setEditingCategory(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveLimit} className="space-y-4">
               <input type="number" step="0.01" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-gray-800 border border-gray-200 outline-none focus:ring-2 focus:ring-brand-500" placeholder="0,00" autoFocus />
               <button type="submit" className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl">Salvar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetsView;