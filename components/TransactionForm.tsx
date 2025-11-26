import React, { useState, useEffect } from 'react';
import {
  Account,
  Category,
  Transaction,
  TransactionType,
  RecurrenceFrequency,
  RecurringTransaction
} from '../types';
import {
  getAccounts,
  getCategories,
  suggestCategory,
  addTransaction,
  addRecurringTransaction,
  updateTransaction,
  deleteTransaction
} from '../services/storageService';
import { X, Check, Calculator, Repeat, Calendar, Clock, Edit2, Trash2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Transaction | null;
}

const TransactionForm: React.FC<Props> = ({ onClose, onSuccess, initialData }) => {
  const [type, setType] = useState<TransactionType>(
    initialData?.type || TransactionType.EXPENSE
  );
  const [value, setValue] = useState<string>(initialData?.value.toString() || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().split('T')[0]
  );
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [accountId, setAccountId] = useState(initialData?.accountId || '');
  const [isPaid, setIsPaid] = useState(initialData ? initialData.isPaid : true);

  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    RecurrenceFrequency.MONTHLY
  );

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const isEditMode = !!initialData;

  // Carrega contas e categorias
  useEffect(() => {
    const loadData = async () => {
      const accs = await getAccounts();
      const cats = await getCategories();
      setAccounts(accs);
      setCategories(cats);

      // Se não estiver editando, define padrões
      if (!initialData) {
        if (accs.length > 0) setAccountId(accs[0].id);

        // Categoria padrão simples (ajuste se precisar)
        const defaultCat = cats.find((c) =>
          type === TransactionType.EXPENSE ? c.id === '2' : c.id === '7'
        );
        if (defaultCat) setCategoryId(defaultCat.id);
      }
    };
    loadData();
  }, [initialData, type]);

  // Sugestão de categoria quando sai do campo descrição
  const handleDescriptionBlur = async () => {
    if (description && !initialData) {
      const suggestedId = await suggestCategory(description);
      if (suggestedId) setCategoryId(suggestedId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !value || !categoryId || !accountId) return;

    setLoading(true);

    try {
      const numValue = parseFloat(value.replace(',', '.'));

      if (isEditMode && initialData) {
        // Atualizar transação existente
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
        // Nova transação
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
          alert(
            'Recorrência criada com sucesso! A transação aparecerá no dia do vencimento.'
          );
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

      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  // NOVO: excluir transação no modo edição
  const handleDelete = async () => {
    if (!initialData) return;

    const confirmar = window.confirm(
      'Tem certeza que deseja excluir este lançamento?'
    );
    if (!confirmar) return;

    setLoading(true);
    try {
      await deleteTransaction(initialData.id);
      onSuccess();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full md:h-auto md:rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col">
      {/* Cabeçalho */}
      <div className="bg-brand-600 p-6 flex justify-between items-center text-white shrink-0">
        <h2 className="text-xl font-bold">
          {isEditMode ? 'Editar Transação' : 'Nova Transação'}
        </h2>
        <button
          onClick={onClose}
          className="hover:bg-brand-700 p-2 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Tipo */}
          <div className="flex space-x-2 bg-gray-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setType(TransactionType.EXPENSE)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                type === TransactionType.EXPENSE
                  ? 'bg-red-500 text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.INCOME)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                type === TransactionType.INCOME
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              Receita
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Valor */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">
                Valor
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-semibold">
                  R$
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="block w-full pl-10 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all text-lg font-semibold text-gray-900"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">
                Descrição
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Edit2 size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all"
                  placeholder="Ex: Mercado, Salário..."
                  required
                />
              </div>
            </div>

            {/* Data + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">
                  Data
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setIsPaid((prev) => !prev)}
                  className={`w-full flex items-center justify-center px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                    isPaid
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  }`}
                >
                  <Clock size={16} className="mr-2" />
                  {isPaid ? 'Pago' : 'Pendente'}
                </button>
              </div>
            </div>

            {/* Categoria + Conta */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">
                  Categoria
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="block w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-gray-800"
                  required
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">
                  Conta / Carteira
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="block w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-gray-800"
                  required
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recorrência (somente criação) */}
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
                  <label
                    htmlFor="recurring"
                    className="text-sm text-gray-600 font-medium cursor-pointer select-none flex items-center"
                  >
                    <Repeat size={14} className="mr-1.5" />
                    Repetir lançamento
                  </label>
                </div>

                {isRecurring && (
                  <div className="flex items-center space-x-3 bg-brand-50 p-3 rounded-xl animate-fade-in-down">
                    <Calculator size={18} className="text-brand-500" />
                    <select
                      value={frequency}
                      onChange={(e) =>
                        setFrequency(e.target.value as RecurrenceFrequency)
                      }
                      className="flex-1 bg-white border border-brand-100 text-sm rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none"
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

            {/* Botão salvar */}
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

            {/* Botão excluir – apenas edição */}
            {isEditMode && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="w-full py-3 mt-3 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={18} />
                <span>Excluir lançamento</span>
              </button>
            )}

            <div className="h-4 sm:h-0" />
          </form>
        </div>
      </div>
    </div>
  );
};

export default TransactionForm;
