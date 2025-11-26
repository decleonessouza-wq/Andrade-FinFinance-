import React, { useState, useEffect } from 'react';
import { Account, Category, Transaction, TransactionType, RecurrenceFrequency, RecurringTransaction } from '../types';
import { getAccounts, getCategories, suggestCategory, addTransaction, addRecurringTransaction, updateTransaction } from '../services/storageService';
import { X, Check, Calculator, Repeat, Calendar, Clock, Edit2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Transaction | null;
}

const TransactionForm: React.FC<Props> = ({ onClose, onSuccess, initialData }) => {
  const [type, setType] = useState<TransactionType>(initialData?.type || TransactionType.EXPENSE);
  const [value, setValue] = useState<string>(initialData?.value.toString() || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [accountId, setAccountId] = useState(initialData?.accountId || '');
  const [isPaid, setIsPaid] = useState(initialData ? initialData.isPaid : true);
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(RecurrenceFrequency.MONTHLY);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false); // Estado de carregamento ao salvar

  const isEditMode = !!initialData;

  // Carregamento Assíncrono dos Dados
  useEffect(() => {
    const loadData = async () => {
      const accs = await getAccounts();
      const cats = await getCategories();
      setAccounts(accs);
      setCategories(cats);

      // Define padrões se não for edição
      if (!initialData) {
         if (accs.length > 0) setAccountId(accs[0].id);
         // Categoria default depende do tipo (exemplo simplificado)
         const defaultCat = cats.find(c => type === TransactionType.EXPENSE ? c.id === '2' : c.id === '7'); 
         if (defaultCat) setCategoryId(defaultCat.id);
      }
    };
    loadData();
  }, [initialData, type]);

  // Sugestão de Categoria com IA (Simulado/Firebase)
  const handleDescriptionBlur = async () => {
    if (description && !initialData) {
      const suggestedId = await suggestCategory(description);
      if (suggestedId) setCategoryId(suggestedId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !value || !categoryId || !accountId) return;

    setLoading(true); // Bloqueia botão enquanto salva

    try {
      const numValue = parseFloat(value.replace(',', '.')); // Garante formato numérico

      if (isEditMode && initialData) {
        // ATUALIZAR
        const updatedTx: Transaction = {
          ...initialData,
          description,
          value: numValue,
          date,
          categoryId,
          accountId,
          type,
          isPaid
        };
        await updateTransaction(updatedTx);
      } else {
        // CRIAR NOVA
        if (isRecurring) {
           const newRec: RecurringTransaction = {
              id: crypto.randomUUID(),
              description,
              value: numValue,
              type,
              categoryId,
              accountId,
              frequency,
              nextDueDate: date,
              active: true
           };
           await addRecurringTransaction(newRec);
           alert('Recorrência criada com sucesso! A transação aparecerá no dia do vencimento.');
        } else {
           const newTx: Transaction = {
             id: crypto.randomUUID(),
             description,
             value: numValue,
             date,
             categoryId,
             accountId,
             type,
             isPaid,
             isRecurring: false
           };
           await addTransaction(newTx);
        }
      }

      onSuccess(); // Fecha e atualiza
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full md:h-auto md:rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col">
      <div className="bg-brand-600 p-6 flex justify-between items-center text-white shrink-0">
        <h2 className="text-xl font-bold">{isEditMode ? 'Editar Transação' : 'Nova Transação'}</h2>
        <button onClick={onClose} className="hover:bg-brand-700 p-2 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Toggle Tipo */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
               <button
                 type="button"
                 onClick={() => setType(TransactionType.EXPENSE)}
                 className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                    type === TransactionType.EXPENSE ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                 }`}
               >
                 Despesa
               </button>
               <button
                 type="button"
                 onClick={() => setType(TransactionType.INCOME)}
                 className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                    type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                 }`}
               >
                 Receita
               </button>
            </div>

            {/* Valor */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Valor</label>
              <div className="relative group">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-bold group-focus-within:text-brand-600 transition-colors">R$</span>
                 </div>
                 <input
                    type="number"
                    step="0.01"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-xl text-lg font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all placeholder-gray-300"
                    placeholder="0,00"
                    required
                 />
              </div>
            </div>

            {/* Descrição */}
            <div>
               <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Descrição</label>
               <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                     <Edit2 size={18} className="text-gray-400" />
                  </div>
                  <input
                     type="text"
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     onBlur={handleDescriptionBlur}
                     className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all"
                     placeholder="Ex: Mercado, Salário..."
                     required
                  />
               </div>
            </div>

            {/* Data e Status */}
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Data</label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar size={18} className="text-gray-400" />
                     </div>
                     <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all"
                        required
                     />
                  </div>
               </div>
               
               <div className="flex items-end">
                  <button
                     type="button"
                     onClick={() => setIsPaid(!isPaid)}
                     className={`w-full py-3 px-4 rounded-xl flex items-center justify-center space-x-2 border transition-all ${
                        isPaid 
                        ? 'bg-green-50 border-green-200 text-green-700' 
                        : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                     }`}
                  >
                     {isPaid ? <Check size={18} /> : <Clock size={18} />}
                     <span className="text-sm font-bold">{isPaid ? 'Pago' : 'Pendente'}</span>
                  </button>
               </div>
            </div>

            {/* Categoria e Conta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Categoria</label>
                  <select
                     value={categoryId}
                     onChange={(e) => setCategoryId(e.target.value)}
                     className="block w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all appearance-none cursor-pointer"
                     required
                  >
                     <option value="" disabled>Selecione...</option>
                     {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                     ))}
                  </select>
               </div>

               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Conta / Carteira</label>
                  <select
                     value={accountId}
                     onChange={(e) => setAccountId(e.target.value)}
                     className="block w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all appearance-none cursor-pointer"
                     required
                  >
                     <option value="" disabled>Selecione...</option>
                     {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                     ))}
                  </select>
               </div>
            </div>

            {/* Recorrência (Apenas na Criação) */}
            {!isEditMode && (
              <div className="pt-2">
                 <div className="flex items-center space-x-2 mb-2">
                    <input 
                       type="checkbox" 
                       id="recurring"
                       checked={isRecurring}
                       onChange={(e) => setIsRecurring(e.target.checked)}
                       className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                    />
                    <label htmlFor="recurring" className="text-sm text-gray-600 font-medium cursor-pointer select-none flex items-center">
                       <Repeat size={14} className="mr-1.5" />
                       Repetir lançamento
                    </label>
                 </div>

                 {isRecurring && (
                    <div className="flex items-center space-x-3 bg-brand-50 p-3 rounded-xl animate-fade-in-down">
                       <Calculator size={18} className="text-brand-500" />
                       <select 
                          value={frequency}
                          onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                          className="flex-1 bg-white border border-brand-200 text-brand-700 text-sm rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                       >
                          <option value={RecurrenceFrequency.DAILY}>Diariamente</option>
                          <option value={RecurrenceFrequency.WEEKLY}>Semanalmente</option>
                          <option value={RecurrenceFrequency.MONTHLY}>Mensalmente</option>
                          <option value={RecurrenceFrequency.YEARLY}>Anualmente</option>
                       </select>
                    </div>
                 )}
              </div>
            )}

            {/* Botão Salvar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check size={20} />
                  <span>{isEditMode ? 'Salvar Alterações' : 'Confirmar Lançamento'}</span>
                </>
              )}
            </button>
            
            <div className="h-4 sm:h-0"></div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TransactionForm;