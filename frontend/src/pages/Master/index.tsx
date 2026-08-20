import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import logo from '../../assets/logo.svg';
import logoWhite from '../../assets/logoWhite.svg';
import {
  Key,
  Sun,
  Moon,
  LogOut,
  Menu,
  Brain,
  ShieldAlert,
  UploadCloud,
  Activity
} from 'lucide-react';

// Subcomponents
import { MasterIntegrations } from './components/MasterIntegrations';
import { MasterAI } from './components/MasterAI';
import { MasterOnboarding } from './components/MasterOnboarding';
import { MasterStatus } from './components/MasterStatus';

export const Master: React.FC = () => {
  const { user, logout, isDarkMode, toggleTheme } = useAuthStore();

  const [activeSubTab, setActiveSubTab] = useState<'integrations' | 'ai' | 'onboarding' | 'status'>('status');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bloqueia acesso caso o usuário não seja MASTER
  if (user?.role !== 'MASTER') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-6 space-y-4">
        <ShieldAlert size={48} className="text-red-500 animate-bounce" />
        <h1 className="text-xl font-bold text-slate-850 dark:text-white">Acesso Não Autorizado</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
          Esta área é restrita para o administrador global da plataforma Setoriza.
        </p>
        <Link 
          to={user?.role === 'ADMIN' ? "/admin" : "/chat"} 
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
        >
          Voltar para a minha área
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans overflow-hidden flex-col md:flex-row">
      
      {/* Mobile Header Bar */}
      <div className="flex md:hidden items-center justify-between px-5 py-3.5 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-30 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Abrir Menu"
          >
            <Menu size={16} />
          </button>
          <div className="flex items-center">
            <img 
              src={isDarkMode ? logoWhite : logo} 
              alt="Setoriza Logo" 
              className="h-5 w-auto object-contain" 
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Alternar Tema"
          >
            {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-455 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Sair da Conta"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900/60 backdrop-blur-md flex flex-col border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 md:relative md:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } shrink-0`}>
        
        {/* Desktop Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md select-none md:flex hidden">
          <div className="flex items-center">
            <img 
              src={isDarkMode ? logoWhite : logo} 
              alt="Setoriza Logo" 
              className="h-6 w-auto object-contain" 
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Alternar Tema"
            >
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-455 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Sair da Conta"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center font-bold text-white shadow select-none">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'MA'}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">{user?.name}</h4>
            <span className="text-[9px] uppercase font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 select-none">
              Master Admin
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          <button
            onClick={() => {
              setActiveSubTab('integrations');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all border cursor-pointer ${
              activeSubTab === 'integrations'
                ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/30 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/40 border-transparent'
            }`}
          >
            <Key size={15} />
            Conectores WhatsApp
          </button>

          <button
            onClick={() => {
              setActiveSubTab('ai');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all border cursor-pointer ${
              activeSubTab === 'ai'
                ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/30 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/40 border-transparent'
            }`}
          >
            <Brain size={15} />
            Inteligência Artificial
          </button>

          <button
            onClick={() => {
              setActiveSubTab('onboarding');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all border cursor-pointer ${
              activeSubTab === 'onboarding'
                ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/30 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/40 border-transparent'
            }`}
          >
            <UploadCloud size={15} />
            Carga de Clientes
          </button>

          <button
            onClick={() => {
              setActiveSubTab('status');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all border cursor-pointer ${
              activeSubTab === 'status'
                ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/30 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/40 border-transparent'
            }`}
          >
            <Activity size={15} />
            Status do Sistema
          </button>
        </nav>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-955/20 border border-red-250 dark:border-red-900/40 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-400 text-xs">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {activeSubTab === 'integrations' && (
            <MasterIntegrations
              setError={setError}
            />
          )}

          {activeSubTab === 'ai' && (
            <MasterAI />
          )}

          {activeSubTab === 'onboarding' && (
            <MasterOnboarding />
          )}

          {activeSubTab === 'status' && (
            <MasterStatus />
          )}
        </div>
      </div>
    </div>
  );
};
