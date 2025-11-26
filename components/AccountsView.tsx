import React, { useEffect, useState } from 'react';
import { Account, AccountType } from '../types';
import { getAccounts } from '../services/storageService';
import { CreditCard, Wallet, Landmark, TrendingUp, Plus } from 'lucide-react';

const AccountsView: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const data = await getAccounts();
        // Garante que é um array antes de salvar
        if (Array.isArray(data)) {
          setAccounts(data);
        } else {
          setAccounts([]);
        }
      } catch (error) {
        console.error("Erro ao carregar contas:", error);
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    };
    loadAccounts();
  }, []);

  const getIcon = (type: AccountType) => {
    switch (type) {
      case AccountType.CREDIT_CARD: return <CreditCard className="text-orange-500" />;
      case AccountType.INVESTMENT: return <TrendingUp className="text-purple-500" />;
      case AccountType.CHECKING: return <Landmark className="text-blue-500" />;
      default: return <Wallet className="text-green-500" />;
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando carteiras...</div>;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Carteiras e Contas</h1>
        <button className="flex items-center space-x-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} />
          <span>Nova Conta</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* O sinal de interrogação ?.map evita o crash se accounts for null */}
        {accounts?.map(account => (
          <div key={account.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-brand-200 transition-all group">
             <div className="flex justify-between items-start mb-6">
               <div className="flex items-center space-x-3">
                 <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-brand-50 transition-colors">
                    {getIcon(account.type)}
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-800">{account.name}</h3>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{account.type.replace('_', ' ')}</p>
                 </div>
               </div>
            </div>

            <div className="space-y-1">
               <p className="text-sm text-gray-400">Saldo Atual</p>
               <p className={`text-2xl font-bold ${account.balance < 0 ? 'text-red-500' : 'text-gray-800'}`}>
                 R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
               </p>
            </div>

            {account.type === AccountType.CREDIT_CARD && (
              <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                 <div>
                    <p className="text-xs text-gray-400">Fechamento</p>
                    <p className="font-medium text-gray-700">Dia {account.closingDay}</p>
                 </div>
                 <div>
                    <p className="text-xs text-gray-400">Vencimento</p>
                    <p className="font-medium text-gray-700">Dia {account.dueDay}</p>
                 </div>
              </div>
            )}
          </div>
        ))}
        
        {(!accounts || accounts.length === 0) && (
           <p className="col-span-full text-center text-gray-400 py-10">Nenhuma conta encontrada. O banco de dados está conectando...</p>
        )}
      </div>
    </div>
  );
};

export default AccountsView;