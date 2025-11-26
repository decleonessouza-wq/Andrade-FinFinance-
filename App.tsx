import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import AccountsView from './components/AccountsView';
import BudgetsView from './components/BudgetsView';
import ReportsView from './components/ReportsView';
import GoalsView from './components/GoalsView';
import ExpensesView from './components/ExpensesView';
import IncomesView from './components/IncomesView';
import TransactionsView from './components/TransactionsView';
import NotificationSystem from './components/NotificationSystem';
import AiAssistant from './components/AiAssistant';
import AuthScreen from './components/AuthScreen';
import { Plus, LogOut, Menu } from 'lucide-react';
import { processRecurringTransactions, initializeDataIfNeeded } from './services/storageService';
import { Transaction } from './types';
import { auth } from './services/firebaseConfig';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await initializeDataIfNeeded();
        await processRecurringTransactions();
        setRefreshKey(prev => prev + 1);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => signOut(auth);

  const handleNewTransaction = () => {
    setTransactionToEdit(null);
    setIsFormOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setTransactionToEdit(tx);
    setIsFormOpen(true);
  };

  const renderView = () => {
    switch(currentView) {
      case 'dashboard': 
        return (
          <Dashboard 
            onEditTransaction={handleEditTransaction} 
            refreshKey={refreshKey} 
            onNavigate={setCurrentView} 
          />
        );
      case 'transactions': 
        return <TransactionsView onEditTransaction={handleEditTransaction} />;
      case 'incomes':
        return <IncomesView onEditTransaction={handleEditTransaction} />;
      case 'expenses': 
        return <ExpensesView onEditTransaction={handleEditTransaction} />;
      case 'accounts': 
        return <AccountsView />;
      case 'budgets': 
        return <BudgetsView />;
      case 'reports': 
        return <ReportsView />;
      case 'goals': 
        return <GoalsView />;
      default: 
        return (
          <Dashboard 
            onEditTransaction={handleEditTransaction} 
            refreshKey={refreshKey} 
            onNavigate={setCurrentView} 
          />
        );
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">
            Carregando suas informações financeiras...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    // Fundo verde claro
    <div className="flex bg-emerald-50 min-h-screen font-sans">
      {/* Sidebar Desktop */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        userEmail={user.email}
        userName={user.displayName}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 overflow-y-auto h-screen relative flex flex-col">
        {/* Header Mobile */}
        <div className="md:hidden bg-white/90 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-b border-emerald-100 shadow-sm shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 border border-emerald-100 rounded-lg text-emerald-600 hover:bg-emerald-50 active:scale-95 transition-all"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-xs text-gray-500">Bem-vindo(a)</p>
              <p className="text-sm font-semibold text-gray-800">
                {user.displayName || 'Usuário'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 text-xs font-semibold text-red-500 border border-red-100 px-3 py-1.5 rounded-xl hover:bg-red-50 active:scale-95 transition-all"
          >
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          {renderView()}
        </div>

        {/* Botão flutuante Nova Transação (mobile / geral) */}
        <button
          onClick={handleNewTransaction}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl shadow-emerald-400/40 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>

        {/* Sistema de notificações */}
        <NotificationSystem />

        {/* Assistente de IA flutuante */}
        <AiAssistant />

        {/* Modal de transação (novo/editar) */}
        {isFormOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-0">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsFormOpen(false)}
            />
            <div className="relative w-full max-w-2xl animate-scale-in">
              <TransactionForm
                onClose={() => setIsFormOpen(false)}
                onSuccess={() => {
                  setIsFormOpen(false);
                  setRefreshKey(old => old + 1);
                }}
                initialData={transactionToEdit}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
