import React, { useEffect, useState } from 'react';
import { Goal } from '../types';
import { getGoals, addGoal, updateGoalBalance } from '../services/storageService';
import { Target, Trophy, Car, Plane, Home, Shield, Plus, X, Calendar, ArrowRight, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const GoalsView: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoalHistory, setSelectedGoalHistory] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  
  // New Goal Form State
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [newGoalIcon, setNewGoalIcon] = useState('target');
  
  // Deposit State
  const [depositAmount, setDepositAmount] = useState<{[key: string]: string}>({});

  // CORREÇÃO: Carregamento Assíncrono Seguro
  useEffect(() => {
    const loadGoals = async () => {
      try {
        const data = await getGoals();
        setGoals(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erro ao carregar metas:", error);
        setGoals([]);
      } finally {
        setLoading(false);
      }
    };
    loadGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      name: newGoalName,
      targetAmount: parseFloat(newGoalTarget),
      currentAmount: 0,
      deadline: newGoalDeadline,
      icon: newGoalIcon
    };

    await addGoal(newGoal);
    setGoals([...goals, newGoal]);
    setIsModalOpen(false);
    setNewGoalName(''); setNewGoalTarget(''); setNewGoalDeadline('');
  };

  const handleDeposit = async (goalId: string) => {
    const amount = parseFloat(depositAmount[goalId]);
    if (amount > 0) {
      await updateGoalBalance(goalId, amount);
      
      const updatedGoals = goals.map(g => {
        if (g.id === goalId) {
           const newHistory = g.history ? [...g.history] : [];
           newHistory.push({ id: crypto.randomUUID(), date: new Date().toISOString(), amount });
           return { ...g, currentAmount: g.currentAmount + amount, history: newHistory };
        }
        return g;
      });
      
      setGoals(updatedGoals);
      setDepositAmount({ ...depositAmount, [goalId]: '' });
    }
  };

  const icons: {[key: string]: React.ReactNode} = {
    target: <Target />, trophy: <Trophy />, car: <Car />, plane: <Plane />, home: <Home />, shield: <Shield />
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Carregando metas...</div>;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Metas Financeiras</h1>
           <p className="text-gray-500 text-sm">Visualize e alcance seus sonhos</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-brand-200 transition-all"
        >
          <Plus size={18} />
          <span>Nova Meta</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map(goal => {
           const percent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
           return (
             <div key={goal.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:border-brand-200 transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-4 relative z-10">
                   <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center text-xl shadow-sm">
                         {icons[goal.icon] || <Target />}
                      </div>
                      <div>
                         <h3 className="font-bold text-gray-800 text-lg">{goal.name}</h3>
                         {goal.deadline && (
                            <p className="text-xs text-gray-400 flex items-center mt-0.5">
                               <Calendar size={12} className="mr-1" />
                               {format(new Date(goal.deadline), 'dd/MM/yyyy')}
                            </p>
                         )}
                      </div>
                   </div>
                   <button onClick={() => setSelectedGoalHistory(goal)} className="text-gray-300 hover:text-brand-600 transition-colors">
                      <History size={20} />
                   </button>
                </div>

                <div className="space-y-2 relative z-10">
                   <div className="flex justify-between items-end">
                      <span className="text-2xl font-bold text-brand-600">R$ {goal.currentAmount.toLocaleString('pt-BR')}</span>
                      <span className="text-xs font-medium text-gray-400 mb-1">de R$ {goal.targetAmount.toLocaleString('pt-BR')}</span>
                   </div>
                   <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                      <div className="bg-brand-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(percent, 100)}%` }}></div>
                   </div>
                   <p className="text-right text-xs font-bold text-brand-600">{percent.toFixed(1)}%</p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-50 flex space-x-2">
                   <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span>
                      <input 
                         type="number" 
                         value={depositAmount[goal.id] || ''}
                         onChange={(e) => setDepositAmount({...depositAmount, [goal.id]: e.target.value})}
                         className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-lg text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-brand-200"
                         placeholder="Aportar..."
                      />
                   </div>
                   <button 
                      onClick={() => handleDeposit(goal.id)}
                      className="bg-gray-900 text-white p-2 rounded-lg hover:bg-black transition-colors"
                   >
                      <ArrowRight size={18} />
                   </button>
                </div>
             </div>
           );
        })}
        {goals.length === 0 && <p className="col-span-2 text-center text-gray-400 py-10">Nenhuma meta cadastrada ainda.</p>}
      </div>

      {/* Modais de Nova Meta e Histórico (Mantidos simples para brevidade) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
           <div className="relative bg-white rounded-3xl p-6 w-full max-w-md animate-scale-in">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-xl text-gray-900">Nova Meta</h3>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} /></button>
              </div>
              <form onSubmit={handleCreateGoal} className="space-y-4">
                 <input required type="text" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-brand-500" placeholder="Nome da Meta" />
                 <input required type="number" value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-brand-500" placeholder="Valor Alvo (R$)" />
                 <input type="date" value={newGoalDeadline} onChange={e => setNewGoalDeadline(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-brand-500" />
                 <button type="submit" className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg">Criar Meta</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default GoalsView;