import React from 'react';
import { LayoutDashboard, PieChart, Wallet, Target, CreditCard, BarChart3, TrendingDown, LogOut } from 'lucide-react';
import { auth } from '../services/firebaseConfig';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  userEmail?: string | null;
  userName?: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, userEmail, userName }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
    { id: 'transactions', label: 'Extrato', icon: <Wallet size={20} /> },
    { id: 'expenses', label: 'Despesas', icon: <TrendingDown size={20} /> },
    { id: 'budgets', label: 'Orçamentos', icon: <PieChart size={20} /> },
    { id: 'reports', label: 'Relatórios', icon: <BarChart3 size={20} /> },
    { id: 'goals', label: 'Metas', icon: <Target size={20} /> },
    { id: 'accounts', label: 'Carteiras', icon: <CreditCard size={20} /> },
  ];

  const handleLogout = () => {
    if (window.confirm('Deseja realmente sair?')) {
      auth.signOut();
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
        <div className="p-6 flex items-center space-x-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
          <div>
            <h1 className="text-lg font-bold text-gray-800">Andrade Finance</h1>
            <p className="text-[10px] font-medium text-emerald-600 uppercase">Control</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                currentView === item.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <div className={currentView === item.id ? 'text-emerald-600' : 'text-gray-400'}>{item.icon}</div>
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Profile Dinâmico */}
        <div className="p-4 border-t border-gray-100">
           <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {userName ? userName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-gray-700 truncate block max-w-[100px]">
                    {userName || 'Usuário'}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate block max-w-[100px]">
                    {userEmail || 'Online'}
                  </span>
                </div>
              </div>
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 p-1">
                <LogOut size={16} />
              </button>
           </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-6 py-3 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {menuItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`flex flex-col items-center space-y-1 ${currentView === item.id ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            {React.cloneElement(item.icon as React.ReactElement<any>, { size: 24 })}
          </button>
        ))}
      </div>
    </>
  );
};

export default Sidebar;