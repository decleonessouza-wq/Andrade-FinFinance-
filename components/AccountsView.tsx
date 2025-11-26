import React, { useEffect, useState } from 'react';
import { Account, AccountType } from '../types';
import { getAccounts, updateAccount, deleteAccount } from '../services/storageService';
import { CreditCard, Wallet, Landmark, TrendingUp, Plus, X, Save, Trash2, AlertCircle } from 'lucide-react';

const AccountsView: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado do Modal (Conta Selecionada)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await getAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Ao clicar no Cartão: Abre o Modal com os dados
  const handleCardClick = (acc: Account) => {
    setSelectedAccount(acc);
    setEditName(acc.name);
    setEditBalance(acc.balance.toString());
  };

  // Salvar Edição
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAccount) {
      await updateAccount({
        ...selectedAccount,
        name: editName,
        balance: parseFloat(editBalance)
      });
      setSelectedAccount(null);
      loadAccounts();
    }
  };

  // Excluir Conta
  const handleDelete = async () => {
    if (selectedAccount && window.confirm(`Tem certeza que deseja excluir a conta "${selectedAccount.name}"?`)) {
      await deleteAccount(selectedAccount.id);
      setSelectedAccount(null);
      loadAccounts();
    }
  };

  const getIcon = (type: AccountType) => {
    switch (type) {
      case AccountType.CREDIT_CARD: return <CreditCard className="text-white" />;
      case AccountType.INVESTMENT: return <TrendingUp className="text-white" />;
      case AccountType.CHECKING: return <Landmark className="text-white" />;
      default: return <Wallet className="text-white" />;
    }
  };

  const getBgColor = (type: AccountType) => {
    switch (type) {
      case AccountType.CREDIT_CARD: return 'bg-orange-500';
      case AccountType.INVESTMENT: return 'bg-purple-600';
      case AccountType.CHECKING: return 'bg-blue-600';
      default: return 'bg-emerald-500';
    }
  };

  if (loading) return <div className="p-8 text-center text-emerald-600 font-medium">Carregando carteiras...</div>;

  return (
    <div className="space-y-6 animate-fade-in-up pb-24">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Minhas Carteiras</h1>
           <p className="text-sm text-gray-500">Toque em uma conta para editar</p>
        </div>
        <button className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 transition-all">
          <Plus size={18} />
          <span>Adicionar</span>
        </button>
      </div>

      {/* Grid de Cartões */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(account => (
          <div 
            key={account.id} 
            onClick={() => handleCardClick(account)} // CLIQUE NO CARD INTEIRO
            className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 hover:border-emerald-400 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer relative overflow-hidden"
          >
             {/* Indicador visual de clique */}
             <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500 text-xs font-bold">
                Editar
             </div>

             <div className="flex justify-between items-start mb-6 relative z-10">
               <div className="flex items-center space-x-4">
                 <div className={`p-3.5 rounded-2xl shadow-md ${getBgColor(account.type)}`}>
                    {getIcon(account.type)}
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900 text-lg">{account.name}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{account.type.replace('_', ' ')}</p>
                 </div>
               </div>
            </div>

            <div className="space-y-1 relative z-10">
               <p className="text-xs font-bold text-gray-400 uppercase">Saldo Atual</p>
               <p className={`text-3xl font-bold ${account.balance < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                 R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
               </p>
            </div>

            {/* Detalhes extras para cartão de crédito */}
            {account.type === AccountType.CREDIT_CARD && (
              <div className="mt-6 pt-4 border-t border-gray-50 grid grid-cols-2 gap-4 relative z-10">
                 <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Fechamento</p>
                    <p className="font-bold text-gray-700 text-sm">Dia {account.closingDay}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Vencimento</p>
                    <p className="font-bold text-gray-700 text-sm">Dia {account.dueDay}</p>
                 </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ================= MODAL DE EDIÇÃO/EXCLUSÃO ================= */}
      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-scale-in border border-gray-200">
              
              {/* Header Modal */}
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                 <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl ${getBgColor(selectedAccount.type)}`}>
                       {React.cloneElement(getIcon(selectedAccount.type) as React.ReactElement, { size: 18 })}
                    </div>
                    <h3 className="font-bold text-xl text-gray-900">Editar Conta</h3>
                 </div>
                 <button onClick={() => setSelectedAccount(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={24} className="text-gray-500" />
                 </button>
              </div>
              
              <form onSubmit={handleSave} className="space-y-5">
                 {/* Campo Nome */}
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Nome da Conta</label>
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    />
                 </div>
                 
                 {/* Campo Saldo */}
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Saldo Atual</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">R$</span>
                       <input 
                         type="number" 
                         step="0.01" 
                         value={editBalance} 
                         onChange={e => setEditBalance(e.target.value)} 
                         className="w-full pl-12 p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                       />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 ml-1 flex items-center">
                       <AlertCircle size={10} className="mr-1" />
                       Ajustar este valor altera seu saldo total.
                    </p>
                 </div>

                 {/* Botões de Ação */}
                 <div className="flex gap-3 pt-2">
                    <button 
                       type="button"
                       onClick={handleDelete}
                       className="flex-1 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-all flex items-center justify-center space-x-2 group"
                    >
                       <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                       <span>Excluir</span>
                    </button>

                    <button 
                       type="submit" 
                       className="flex-[2] py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center space-x-2"
                    >
                       <Save size={20} />
                       <span>Salvar Alterações</span>
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AccountsView;