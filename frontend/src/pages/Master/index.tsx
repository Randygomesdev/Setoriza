import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  Key,
  Sun,
  Moon,
  LogOut,
  Menu,
  Brain,
  ShieldAlert,
  UploadCloud,
  Activity,
  Database,
  Server,
  Download
} from 'lucide-react';

// Subcomponents
import { MasterIntegrations } from './components/MasterIntegrations';
import { MasterAI } from './components/MasterAI';

// Future onboarding loader component placeholder
const MasterOnboarding: React.FC = () => {
  const downloadExcelTemplate = () => {
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"/></head>
      <body>
        <table border="1">
          <tr style="background-color: #3b82f6; color: #ffffff; font-weight: bold;">
            <th>CNPJ</th>
            <th>Razão Social</th>
            <th>Nome Fantasia</th>
            <th>Nome do Responsável</th>
            <th>Contato do Responsável</th>
          </tr>
          <tr>
            <td>12345678000190</td>
            <td>Empresa de Exemplo LTDA</td>
            <td>Exemplo Co</td>
            <td>Randy Gomes</td>
            <td>5527998349791</td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_onboarding_setoriza.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
          <UploadCloud size={22} className="text-blue-500" />
          Carga de Dados & Onboarding de Clientes
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Importe a listagem de clientes ativos dos escritórios de contabilidade diretamente para o sistema.
        </p>
      </div>

      <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-6">
        
        {/* Download Template Card */}
        <div className="p-5 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200">Planilha de Modelo Padrão (Excel)</h3>
            <p className="text-xs text-blue-700/85 dark:text-blue-400/80">
              Faça o download do arquivo modelo pre-formatado, preencha com as informações dos clientes e envie ao lado.
            </p>
          </div>
          <button
            onClick={downloadExcelTemplate}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Download size={14} />
            Baixar Modelo Excel
          </button>
        </div>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-2xl p-10 flex flex-col items-center justify-center space-y-4 hover:border-blue-500 transition-colors cursor-pointer">
          <div className="p-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
            <UploadCloud size={32} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-slate-850 dark:text-slate-200">Arraste seu arquivo Excel preenchido ou clique para navegar</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Tamanho máximo do arquivo: 5MB</p>
          </div>
        </div>

      </div>
    </div>
  );
};

// Future system health dashboard placeholder
const MasterStatus: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
          <Activity size={22} className="text-blue-500" />
          Status do Sistema & Integridade de Dados
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Monitore o estado de funcionamento dos microsserviços, cache e armazenamento do ecossistema Setoriza.
        </p>
      </div>

      {/* Grid de Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Microsserviços</span>
            <Server size={16} className="text-blue-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-350">Gateway Service</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded">ONLINE</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-350">Auth Service</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded">ONLINE</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-350">Ticket Service</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded">ONLINE</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Bancos & Cache</span>
            <Database size={16} className="text-blue-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-355">Postgres DB (auth_db)</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded">INTEGRO</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-355">Postgres DB (ticket_db)</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded">INTEGRO</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-355">Redis Cache</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded">ATIVO</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Storage</span>
            <UploadCloud size={16} className="text-blue-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-350">MinIO Storage</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded">CONECTADO</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-350">Bucket (setoriza-medias)</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded">INTEGRO</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Master: React.FC = () => {
  const { user, logout, isDarkMode, toggleTheme } = useAuthStore();

  const [activeSubTab, setActiveSubTab] = useState<'integrations' | 'ai' | 'onboarding' | 'status'>('integrations');
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
          <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
            Setoriza Master
          </span>
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
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
              Setoriza Master
            </span>
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
