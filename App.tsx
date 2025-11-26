import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import AccountsView from './components/AccountsView';
import BudgetsView from './components/BudgetsView';
import ReportsView from './components/ReportsView';
import GoalsView from './components/GoalsView';
import ExpensesView from './components/ExpensesView';
import TransactionsView from './components/TransactionsView';
import NotificationSystem from './components/NotificationSystem';
import AiAssistant from './components/AiAssistant';
import AuthScreen from './components/AuthScreen';
import { Plus, LogOut } from 'lucide-react';
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

  // Monitoramento de Login
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

  // ROTEADOR (AQUI ESTAVA O PROBLEMA)
  const renderView = () => {
    switch(currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            onEditTransaction={handleEditTransaction} 
            refreshKey={refreshKey} 
            onNavigate={setCurrentView} // <--- ESSA É A LINHA MÁGICA QUE FALTAVA!
          />
        );
      
      case 'transactions':
        return <TransactionsView onEditTransaction={handleEditTransaction} />;
      
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

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!user) return <AuthScreen />;

  return (
    <div className="flex bg-gray-50 min-h-screen font-sans">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        userEmail={user.email}
        userName={user.displayName}
      />
      
      <main className="flex-1 overflow-y-auto h-screen relative">
        {/* Mobile Header */}
        <div className="md:hidden bg-white px-4 py-3 sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 shadow-sm">
           <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
              <span className="font-bold text-gray-800 text-lg">Andrade Finance</span>
           </div>
           <button onClick={handleLogout} className="text-red-500 p-2"><LogOut size={20} /></button>
        </div>

        <div className="p-4 md:p-10 lg:p-12 pb-24 md:pb-12 min-h-full">
           <div className="max-w-7xl mx-auto">
             {renderView()}
           </div>
        </div>

        <footer className="w-full py-6 bg-white border-t border-gray-200 mt-auto hidden md:block">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-xs text-gray-400 font-medium">
              Andrade Finance - Controle Financeiro Familiar - By Decleones Andrade @2025. v.1
            </p>
          </div>
        </footer>
      </main>

      <button onClick={handleNewTransaction} className="fixed bottom-24 md:bottom-10 right-5 md:right-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-4 shadow-[0_4px_14px_0_rgba(5,150,105,0.39)] hover:shadow-[0_6px_20px_rgba(5,150,105,0.23)] hover:scale-105 transition-all duration-300 z-40 group">
        <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      <div className="fixed top-4 right-4 z-50 pointer-events-none w-full max-w-sm">
        <NotificationSystem />
      </div>

      <AiAssistant />

      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          <div className="relative w-full max-w-2xl animate-scale-in">
             <TransactionForm 
                onClose={() => setIsFormOpen(false)} 
                onSuccess={() => { setIsFormOpen(false); setRefreshKey(old => old + 1); }} 
                initialData={transactionToEdit}
             />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;