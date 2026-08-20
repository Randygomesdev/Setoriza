import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import logo from '../../assets/logo.svg';
import logoWhite from '../../assets/logoWhite.svg';
import {
  Users,
  Briefcase,
  LayoutDashboard,
  Sun,
  Moon,
  AlertTriangle,
  FolderOpen,
  MessageSquare,
  LogOut,
  History,
  Menu
} from 'lucide-react';

// Subcomponents
import { AdminDashboard } from './components/AdminDashboard';
import { AdminUsers } from './components/AdminUsers';
import { AdminClients } from './components/AdminClients';
import { AdminSectors } from './components/AdminSectors';
import { AdminHistory } from './components/AdminHistory';

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isDarkMode, toggleTheme } = useAuthStore();

  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'users' | 'clients' | 'sectors' | 'history'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common lists shared across tabs
  const [usersList, setUsersList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [sectorsList, setSectorsList] = useState<any[]>([]);
  const [slaMetrics, setSlaMetrics] = useState<any | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const [u, c, t, s, sla] = await Promise.all([
        api.users.list(),
        api.clients.list(),
        api.tickets.list({
          status: ['IDENTIFICACAO_CNPJ', 'IDENTIFICACAO_NOME', 'TRIAGEM', 'AGUARDANDO_ATENDIMENTO', 'EM_ANDAMENTO', 'CONCLUIDO'],
        }),
        api.sectors.list(),
        api.tickets.getSlaMetrics().catch(() => null),
      ]);
      setUsersList(u);
      setClientsList(c);
      setTicketsList(t);
      setSectorsList(s);
      setSlaMetrics(sla);
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar dados administrativos');
    }
  };

  // Handle incoming router state redirections
  useEffect(() => {
    const state = location.state as { activeTab?: string } | null;
    if (state?.activeTab === 'history') {
      setActiveSubTab('history');
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, navigate]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

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
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">{user?.name}</h4>
            <span className="text-[9px] uppercase font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 select-none">
              {user?.role === 'MASTER' ? 'Master' : user?.role === 'ADMIN' ? 'Administrador' : 'Operador'}
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          <button
            onClick={() => {
              setActiveSubTab('dashboard');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all border cursor-pointer ${
              activeSubTab === 'dashboard'
                ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/30 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/40 border-transparent'
            }`}
          >
            <LayoutDashboard size={15} />
            Resumo Geral
          </button>
          
          <button
            onClick={() => {
              setActiveSubTab('users');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all border cursor-pointer ${
              activeSubTab === 'users'
                ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/30 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/40 border-transparent'
            }`}
          >
            <Users size={15} />
            Colaboradores
          </button>
          
          <button
            onClick={() => {
              setActiveSubTab('clients');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all border cursor-pointer ${
              activeSubTab === 'clients'
                ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/30 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/40 border-transparent'
            }`}
          >
            <Briefcase size={15} />
            Clientes
          </button>
          
          <button
            onClick={() => {
              setActiveSubTab('sectors');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all border cursor-pointer ${
              activeSubTab === 'sectors'
                ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/30 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/40 border-transparent'
            }`}
          >
            <FolderOpen size={15} />
            Setores e SLA
          </button>



          <button
            onClick={() => {
              setActiveSubTab('history');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all border cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/30 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/40 border-transparent'
            }`}
          >
            <History size={15} />
            Histórico de Chamados
          </button>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 my-1"></div>

          <Link
            to="/chat"
            className="w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/40"
          >
            <MessageSquare size={15} />
            Ir para o Chat
          </Link>
        </nav>
      </div>

      {/* CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6">
          
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-center gap-2 shadow-sm animate-pulse">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {activeSubTab === 'dashboard' && (
            <AdminDashboard
              ticketsList={ticketsList}
              sectorsList={sectorsList}
              slaMetrics={slaMetrics}
            />
          )}

          {activeSubTab === 'users' && (
            <AdminUsers
              usersList={usersList}
              sectorsList={sectorsList}
              onRefresh={loadData}
              setError={setError}
            />
          )}

          {activeSubTab === 'clients' && (
            <AdminClients
              clientsList={clientsList}
              onRefresh={loadData}
              setError={setError}
            />
          )}



          {activeSubTab === 'sectors' && (
            <AdminSectors
              sectorsList={sectorsList}
              onRefresh={loadData}
              setError={setError}
            />
          )}

          {activeSubTab === 'history' && (
            <AdminHistory
              usersList={usersList}
              sectorsList={sectorsList}
            />
          )}
        </div>
      </div>
    </div>
  );
};
