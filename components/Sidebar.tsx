import React from 'react';
import { 
  LayoutDashboard,
  PieChart,
  Wallet,
  Target,
  CreditCard,
  BarChart3,
  TrendingDown,
  LogOut,
  X,
  ArrowUpCircle,
} from 'lucide-react';

import { auth } from '../services/firebaseConfig';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  userEmail?: string | null;
  userName?: string | null;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setCurrentView, 
  userEmail, 
  userName, 
  isMobileOpen, 
  onMobileClose 
}) => {
  
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
    { id: 'transactions', label: 'Extrato', icon: <Wallet size={20} /> },
    { id: 'incomes', label: 'Receitas', icon: <ArrowUpCircle size={20} /> },
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

  const handleNavigation = (id: string) => {
    setCurrentView(id);
    onMobileClose();
  };

  const NavLinks = () => (
    <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => handleNavigation(item.id)}
          className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
            currentView === item.id 
              ? 'bg-emerald-50 text-emerald-700 font-bold shadow-sm' 
              : 'text-gray-500 hover:bg-gray-50 font-medium'
          }`}
        >
          <div className={currentView === item.id ? 'text-emerald-600' : 'text-gray-400'}>
            {item.icon}
          </div>
          <span className="text-sm">{item.label}</span>
        </button>
      ))}
    </nav>
  );

  const UserProfile = () => (
    <div className="p-4 border-t border-gray-100 mt-auto">
       <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-gray-700 truncate block max-w-[110px]">
                {userName || 'Usuário'}
              </span>
              <span className="text-[10px] text-gray-400 truncate block max-w-[110px]">
                {userEmail || 'Online'}
              </span>
            </div>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 p-2 hover:bg-white rounded-lg transition-all" title="Sair">
            <LogOut size={18} />
          </button>
       </div>
    </div>
  );

  return (
    <>
      {/* SIDEBAR DESKTOP */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0 z-20">
        <div className="p-6 flex items-center space-x-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
          <div>
            <h1 className="text-lg font-bold text-gray-800">Andrade Finance</h1>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded w-fit">Premium</p>
          </div>
        </div>
        <NavLinks />
        <UserProfile />
      </div>

      {/* BACKDROP MOBILE */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onMobileClose}
        />
      )}

      {/* DRAWER MOBILE */}
      <div className={`fixed top-0 left-0 bottom-0 w-72 bg-white z-50 transform transition-transform duration-300 ease-out md:hidden shadow-2xl flex flex-col ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-5 flex items-center justify-between border-b border-gray-100">
           <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
              <span className="font-bold text-gray-800 text-lg">Menu</span>
           </div>
           <button onClick={onMobileClose} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:text-gray-900">
              <X size={20} />
           </button>
        </div>

        <NavLinks />
        <UserProfile />
      </div>
    </>
  );
};

export default Sidebar;
