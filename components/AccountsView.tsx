import React, { useEffect, useState } from 'react';
import { Account, AccountType } from '../types';
import { getAccounts, updateAccount, deleteAccount } from '../services/storageService';
import { auth } from '../services/firebaseConfig';
import {
  CreditCard,
  Wallet,
  Landmark,
  TrendingUp,
  Plus,
  X,
  Save,
  Trash2,
  AlertCircle
} from 'lucide-react';

const AccountsView: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado do Modal (Conta Selecionada)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');

  // ✅ Estado do Modal (Nova Conta)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('0');
  const [newType, setNewType] = useState<AccountType>(AccountType.CASH);

  // Para cartão
  const [newClosingDay, setNewClosingDay] = useState('25');
  const [newDueDay, setNewDueDay] = useState('5');

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await getAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
    } finally {
      setLoading(false);
    }
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
      try {
        await updateAccount({
          ...selectedAccount,
          name: editName,
          balance: parseFloat(editBalance)
        });
        setSelectedAccount(null);
        loadAccounts();
      } catch (err) {
        console.error('Erro ao salvar conta:', err);
        alert('Não foi possível salvar. Verifique permissões no Firebase.');
      }
    }
  };

  // Excluir Conta
  const handleDelete = async () => {
    if (
      selectedAccount &&
      window.confirm(`Tem certeza que deseja excluir a conta "${selectedAccount.name}"?`)
    ) {
      try {
        await deleteAccount(selectedAccount.id);
        setSelectedAccount(null);
        loadAccounts();
      } catch (err) {
        console.error('Erro ao excluir conta:', err);
        alert('Não foi possível excluir. Verifique permissões no Firebase.');
      }
    }
  };

  // ✅ Abrir modal de criação
  const handleOpenCreate = () => {
    setNewName('');
    setNewBalance('0');
    setNewType(AccountType.CASH);
    setNewClosingDay('25');
    setNewDueDay('5');
    setIsCreateOpen(true);
  };

  // ✅ Criar nova conta (com userId para passar nas rules)
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert('Você precisa estar logado para criar uma carteira.');
      return;
    }

    const name = newName.trim();
    const balance = parseFloat(newBalance);

    if (!name) {
      alert('Informe o nome da carteira.');
      return;
    }

    if (Number.isNaN(balance)) {
      alert('Informe um saldo válido.');
      return;
    }

    const id =
      typeof crypto !== 'undefined' && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : `acc_${Date.now()}`;

    const baseAccount: any = {
      id,
      name,
      type: newType,
      balance,
      userId: user.uid
    };

    const createdAccount: any =
      newType === AccountType.CREDIT_CARD
        ? {
            ...baseAccount,
            closingDay: Math.min(31, Math.max(1, parseInt(newClosingDay || '25', 10))),
            dueDay: Math.min(31, Math.max(1, parseInt(newDueDay || '5', 10)))
          }
        : baseAccount;

    try {
      // Mantive updateAccount como você já está usando (setDoc)
      await updateAccount(createdAccount as Account);
      setIsCreateOpen(false);
      loadAccounts();
    } catch (err) {
      console.error('Erro ao salvar carteira:', err);
      alert('Não foi possível salvar. Verifique permissões no Firebase (rules).');
    }
  };

  // ✅ Agora o ícone recebe size e className (remove cloneElement e corrige TS)
  const getIcon = (type: AccountType, size: number = 24, className: string = 'text-white') => {
    switch (type) {
      case AccountType.CREDIT_CARD:
        return <CreditCard size={size} className={className} />;
      case AccountType.INVESTMENT:
        return <TrendingUp size={size} className={className} />;
      case AccountType.CHECKING:
        return <Landmark size={size} className={className} />;
      default:
        return <Wallet size={size} className={className} />;
    }
  };

  const getBgColor = (type: AccountType) => {
    switch (type) {
      case AccountType.CREDIT_CARD:
        return 'bg-orange-500';
      case AccountType.INVESTMENT:
        return 'bg-purple-600';
      case AccountType.CHECKING:
        return 'bg-blue-600';
      default:
        return 'bg-emerald-500';
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-emerald-600 font-medium">
        Carregando carteiras...
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in-up pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Carteiras</h1>
          <p className="text-sm text-gray-500">Toque em uma conta para editar</p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 transition-all"
          aria-label="Adicionar nova carteira"
          title="Adicionar nova carteira"
        >
          <Plus size={18} />
          <span>Adicionar</span>
        </button>
      </div>

      {/* Grid de Cartões */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <div
            key={account.id}
            onClick={() => handleCardClick(account)}
            className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 hover:border-emerald-400 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer relative overflow-hidden"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleCardClick(account);
            }}
            aria-label={`Abrir edição da conta ${account.name}`}
            title={`Editar ${account.name}`}
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500 text-xs font-bold">
              Editar
            </div>

            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center space-x-4">
                <div className={`p-3.5 rounded-2xl shadow-md ${getBgColor(account.type)}`}>
                  {getIcon(account.type, 24, 'text-white')}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{account.name}</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {account.type.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1 relative z-10">
              <p className="text-xs font-bold text-gray-400 uppercase">Saldo Atual</p>
              <p
                className={`text-3xl font-bold ${
                  account.balance < 0 ? 'text-red-600' : 'text-gray-800'
                }`}
              >
                R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

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

      {/* ================= MODAL DE CRIAÇÃO ================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-scale-in border border-gray-200">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-600">
                  <Wallet size={18} className="text-white" />
                </div>
                <h3 className="font-bold text-xl text-gray-900">Nova Carteira</h3>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Fechar modal de criação"
                title="Fechar"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-5">
              <div>
                <label
                  htmlFor="newAccountName"
                  className="block text-xs font-bold text-gray-500 mb-1.5 ml-1"
                >
                  Nome da Carteira
                </label>
                <input
                  id="newAccountName"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Nubank, Carteira Física..."
                  aria-label="Nome da carteira"
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="newAccountType"
                  className="block text-xs font-bold text-gray-500 mb-1.5 ml-1"
                >
                  Tipo
                </label>
                <select
                  id="newAccountType"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as AccountType)}
                  aria-label="Tipo da carteira"
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                >
                  <option value={AccountType.CASH}>CASH</option>
                  <option value={AccountType.CHECKING}>CHECKING</option>
                  <option value={AccountType.CREDIT_CARD}>CREDIT CARD</option>
                  <option value={AccountType.INVESTMENT}>INVESTMENT</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="newAccountBalance"
                  className="block text-xs font-bold text-gray-500 mb-1.5 ml-1"
                >
                  Saldo Inicial
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">
                    R$
                  </span>
                  <input
                    id="newAccountBalance"
                    type="number"
                    step="0.01"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    aria-label="Saldo inicial"
                    className="w-full pl-12 p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 ml-1 flex items-center">
                  <AlertCircle size={10} className="mr-1" />
                  Você pode ajustar depois a qualquer momento.
                </p>
              </div>

              {newType === AccountType.CREDIT_CARD && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="newClosingDay"
                      className="block text-xs font-bold text-gray-500 mb-1.5 ml-1"
                    >
                      Fechamento
                    </label>
                    <input
                      id="newClosingDay"
                      type="number"
                      min={1}
                      max={31}
                      value={newClosingDay}
                      onChange={(e) => setNewClosingDay(e.target.value)}
                      aria-label="Dia de fechamento"
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="newDueDay"
                      className="block text-xs font-bold text-gray-500 mb-1.5 ml-1"
                    >
                      Vencimento
                    </label>
                    <input
                      id="newDueDay"
                      type="number"
                      min={1}
                      max={31}
                      value={newDueDay}
                      onChange={(e) => setNewDueDay(e.target.value)}
                      aria-label="Dia de vencimento"
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center space-x-2"
                aria-label="Salvar carteira"
                title="Salvar carteira"
              >
                <Save size={20} />
                <span>Salvar Carteira</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DE EDIÇÃO/EXCLUSÃO ================= */}
      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-scale-in border border-gray-200">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${getBgColor(selectedAccount.type)}`}>
                  {getIcon(selectedAccount.type, 18, 'text-white')}
                </div>
                <h3 className="font-bold text-xl text-gray-900">Editar Conta</h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAccount(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Fechar modal de edição"
                title="Fechar"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label
                  htmlFor="editAccountName"
                  className="block text-xs font-bold text-gray-500 mb-1.5 ml-1"
                >
                  Nome da Conta
                </label>
                <input
                  id="editAccountName"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome da conta"
                  aria-label="Nome da conta"
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="editAccountBalance"
                  className="block text-xs font-bold text-gray-500 mb-1.5 ml-1"
                >
                  Saldo Atual
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">
                    R$
                  </span>
                  <input
                    id="editAccountBalance"
                    type="number"
                    step="0.01"
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    aria-label="Saldo atual"
                    className="w-full pl-12 p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 ml-1 flex items-center">
                  <AlertCircle size={10} className="mr-1" />
                  Ajustar este valor altera seu saldo total.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-all flex items-center justify-center space-x-2 group"
                  aria-label="Excluir conta"
                  title="Excluir conta"
                >
                  <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                  <span>Excluir</span>
                </button>

                <button
                  type="submit"
                  className="flex-[2] py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center space-x-2"
                  aria-label="Salvar alterações"
                  title="Salvar alterações"
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
