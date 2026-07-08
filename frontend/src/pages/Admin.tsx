import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import {
  Users,
  Briefcase,
  Key,
  LayoutDashboard,
  ArrowLeft,
  Plus,
  Trash2,
  Phone,
  Settings,
  Activity,
  Sun,
  Moon,
  Clock,
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  X,
  MessageSquare
} from 'lucide-react';

export const Admin: React.FC = () => {
  const { user } = useAuthStore();

  // Navigation tabs: 'dashboard' | 'users' | 'clients' | 'integrations'
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'users' | 'clients' | 'integrations'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Evolution live status states
  const [evoStatus, setEvoStatus] = useState<'OFFLINE' | 'CONNECTED' | 'DISCONNECTED' | 'LOADING'>('LOADING');
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // States for data
  const [usersList, setUsersList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [sectorsList, setSectorsList] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form states - Create User
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    sectors: '',
  });
  const [userSuccessMsg, setUserSuccessMsg] = useState('');

  // Form states - Create Client
  const [newClient, setNewClient] = useState({
    companyName: '',
    cnpj: '',
  });
  const [clientSuccessMsg, setClientSuccessMsg] = useState('');

  // Form states - Add Contact to Client
  const [selectedClientIdForContact, setSelectedClientIdForContact] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({
    whatsappNumber: '',
    contactName: '',
  });
  const [contactSuccessMsg, setContactSuccessMsg] = useState('');

  // Form states - Evolution Integration
  const [evoConfig, setEvoConfig] = useState({
    baseUrl: 'http://localhost:8080',
    instanceName: 'setoriza-dev',
    apiKey: 'apikey-key-password-123',
  });
  const [evoSuccessMsg, setEvoSuccessMsg] = useState('');

  // Sync theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load initial data
  const loadData = async () => {
    setError(null);
    try {
      const [u, c, t, s] = await Promise.all([
        api.users.list(),
        api.clients.list(),
        api.tickets.list({
          status: ['IDENTIFICACAO_CNPJ', 'IDENTIFICACAO_NOME', 'TRIAGEM', 'AGUARDANDO_ATENDIMENTO', 'EM_ANDAMENTO', 'CONCLUIDO'],
        }),
        api.sectors.list(),
      ]);
      setUsersList(u);
      setClientsList(c);
      setTicketsList(t);
      setSectorsList(s);
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar dados administrativos');
    }
  };

  const checkEvoStatus = async () => {
    setEvoStatus('LOADING');
    try {
      const res = await api.integration.getStatus();
      if (res && res.instance && res.instance.state === 'open') {
        setEvoStatus('CONNECTED');
        setQrCodeBase64(null);
      } else if (res && res.instance && res.instance.state === 'OFFLINE') {
        setEvoStatus('OFFLINE');
      } else {
        setEvoStatus('DISCONNECTED');
      }
    } catch {
      setEvoStatus('OFFLINE');
    }
  };

  const handleCreateEvoInstance = async () => {
    setError(null);
    setEvoSuccessMsg('');
    try {
      await api.integration.createInstance();
      setEvoSuccessMsg('Instância criada com sucesso! Carregando QR Code...');
      await checkEvoStatus();
      await handleLoadQrCode();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar instância na Evolution API');
    }
  };

  const handleLoadQrCode = async () => {
    setQrLoading(true);
    setError(null);
    try {
      const res = await api.integration.getQrCode();
      if (res && res.base64) {
        setQrCodeBase64(res.base64);
      } else {
        setError('Não foi possível obter a imagem do QR Code. Verifique se a instância está iniciada.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar QR Code');
    } finally {
      setQrLoading(false);
    }
  };

  const handleLogoutEvoInstance = async () => {
    if (!confirm('Deseja realmente desconectar este WhatsApp? Isso encerrará a sessão ativa.')) return;
    setError(null);
    try {
      await api.integration.logout();
      setEvoSuccessMsg('Instância desconectada com sucesso.');
      setQrCodeBase64(null);
      await checkEvoStatus();
    } catch (err: any) {
      setError(err.message || 'Erro ao desconectar instância');
    }
  };

  useEffect(() => {
    let intervalId: any = null;
    if (activeSubTab === 'integrations' && evoStatus === 'DISCONNECTED') {
      intervalId = setInterval(async () => {
        try {
          const res = await api.integration.getStatus();
          if (res && res.instance && res.instance.state === 'open') {
            setEvoStatus('CONNECTED');
            setQrCodeBase64(null);
          }
        } catch {
          // ignore
        }
      }, 4000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeSubTab, evoStatus]);

  useEffect(() => {
    if (activeSubTab === 'integrations') {
      checkEvoStatus();
    }
  }, [activeSubTab]);

  useEffect(() => {
    loadData();
    // Load Evolution Config from LocalStorage
    const savedConfig = localStorage.getItem('evolution_api_config');
    if (savedConfig) {
      try {
        setEvoConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Error loading saved config', e);
      }
    }
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSuccessMsg('');
    setError(null);
    try {
      await api.users.create(newUser);
      setUserSuccessMsg('Usuário criado com sucesso!');
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'USER',
        sectors: '',
      });
      // Refresh list
      const u = await api.users.list();
      setUsersList(u);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário');
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientSuccessMsg('');
    setError(null);
    try {
      await api.clients.create(newClient);
      setClientSuccessMsg('Cliente corporativo cadastrado com sucesso!');
      setNewClient({
        companyName: '',
        cnpj: '',
      });
      // Refresh list
      const c = await api.clients.list();
      setClientsList(c);
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar cliente');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Deseja realmente remover este cliente? Todos os contatos vinculados serão impactados.')) return;
    setError(null);
    try {
      await api.clients.delete(id);
      const c = await api.clients.list();
      setClientsList(c);
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar cliente');
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientIdForContact) return;
    setContactSuccessMsg('');
    setError(null);
    try {
      await api.clients.addContact(selectedClientIdForContact, newContact);
      setContactSuccessMsg('Contato do WhatsApp vinculado com sucesso!');
      setNewContact({
        whatsappNumber: '',
        contactName: '',
      });
      // Refresh clients list to update contacts lists
      const c = await api.clients.list();
      setClientsList(c);
      setTimeout(() => {
        setSelectedClientIdForContact(null);
        setContactSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar contato');
    }
  };


  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Calculations for Dashboard Tab
  const totalTickets = ticketsList.length;
  const awaitingTickets = ticketsList.filter(t => t.status === 'AGUARDANDO_ATENDIMENTO' || t.status === 'TRIAGEM').length;
  const inProgressTickets = ticketsList.filter(t => t.status === 'EM_ANDAMENTO').length;
  const concludedTickets = ticketsList.filter(t => t.status === 'CONCLUIDO').length;
  const chatbotTickets = ticketsList.filter(t => t.status === 'IDENTIFICACAO_CNPJ' || t.status === 'IDENTIFICACAO_NOME').length;

  return (
    <div className="h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <div className="w-64 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md shrink-0">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
              Setoriza Admin
            </span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            title="Alternar Tema"
          >
            {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">{user?.name}</h4>
            <span className="text-[9px] uppercase font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeSubTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50'
            }`}
          >
            <LayoutDashboard size={15} />
            Resumo Geral
          </button>
          
          <button
            onClick={() => setActiveSubTab('users')}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeSubTab === 'users'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50'
            }`}
          >
            <Users size={15} />
            Colaboradores
          </button>
          
          <button
            onClick={() => setActiveSubTab('clients')}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeSubTab === 'clients'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50'
            }`}
          >
            <Briefcase size={15} />
            Clientes Corporativos
          </button>

          <button
            onClick={() => setActiveSubTab('integrations')}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeSubTab === 'integrations'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50'
            }`}
          >
            <Key size={15} />
            Config. Integração
          </button>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 my-1"></div>

          <Link
            to="/chat"
            className="w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50"
          >
            <MessageSquare size={15} />
            Ir para o Chat
          </Link>
        </nav>

        {/* Footer Link */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
          <Link
            to="/chat"
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-sm border border-slate-250 dark:border-slate-700/60 flex items-center justify-center gap-1.5 transition-all"
          >
            <ArrowLeft size={14} />
            Ir para Atendimentos
          </Link>
        </div>
      </div>

      {/* CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-center gap-2 shadow-sm animate-pulse">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: DASHBOARD / SUMMARY */}
          {activeSubTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Header Info */}
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Painel de Resumo</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Estatísticas gerais em tempo real sobre os atendimentos e microsserviços.</p>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                    <Activity size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Total</span>
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{totalTickets}</h3>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Clock size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Fila</span>
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{awaitingTickets}</h3>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
                    <Settings size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Ativos</span>
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{inProgressTickets}</h3>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-500">
                    <FolderOpen size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Chatbot</span>
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{chatbotTickets}</h3>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 col-span-2 lg:col-span-1">
                  <div className="p-2.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    <CheckCircle size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Fechados</span>
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{concludedTickets}</h3>
                  </div>
                </div>

              </div>

              {/* Visual Panels Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Sector Distrib */}
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Distribuição por Setor</h3>
                  <div className="space-y-3.5">
                    {sectorsList.map(sector => {
                      const count = ticketsList.filter(t => t.sector && t.sector.id === sector.id).length;
                      const percentage = totalTickets > 0 ? (count / totalTickets) * 100 : 0;
                      return (
                        <div key={sector.id} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span>{sector.friendlyName}</span>
                            <span>{count} ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-600 rounded-full transition-all" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                    {sectorsList.length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-4">Nenhum setor cadastrado no banco.</p>
                    )}
                  </div>
                </div>

                {/* SLA and Performance */}
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Desempenho de SLA</h3>
                  <div className="flex flex-col items-center justify-center py-4 space-y-3">
                    <div className="relative h-28 w-28 flex items-center justify-center rounded-full border-[10px] border-emerald-500 border-t-slate-200 dark:border-t-slate-800">
                      <div className="text-center">
                        <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">92%</span>
                        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Dentro do SLA</p>
                      </div>
                    </div>
                    <div className="w-full text-center space-y-1">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tempo Médio de Primeiro Atendimento</p>
                      <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">6.2 minutos</p>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500">Meta estipulada pelo time: 15 minutos</p>
                    </div>
                  </div>
                </div>

                {/* Channel Stats */}
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Volume por Canal</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">WhatsApp Business Cloud</span>
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{totalTickets} (100%)</span>
                    </div>

                    <div className="flex items-center justify-between opacity-50">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Telegram Bot (API)</span>
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">0 (0%)</span>
                    </div>

                    <div className="flex items-center justify-between opacity-50">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-purple-500"></span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Instagram Direct</span>
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">0 (0%)</span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-500 leading-relaxed">
                      💡 <strong>Futuras integrações:</strong> O Gateway de Mensagens já foi planejado estruturalmente para carregar conectores de multicanais.
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: USER MANAGEMENT ("USUARIOS") */}
          {activeSubTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* List of Users Column (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cadastro de Colaboradores</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gerencie os atendentes cadastrados no serviço de autenticação e seus setores.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="px-6 py-3.5">Nome / Colaborador</th>
                          <th className="px-6 py-3.5">E-mail</th>
                          <th className="px-6 py-3.5">Papel (Role)</th>
                          <th className="px-6 py-3.5">Setores Vinculados</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-350">
                        {usersList.map((usr) => (
                          <tr key={usr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                            <td className="px-6 py-4 flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center uppercase">
                                {usr.name.slice(0, 2)}
                              </div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{usr.name}</span>
                            </td>
                            <td className="px-6 py-4 font-mono">{usr.email}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                usr.role === 'MASTER'
                                  ? 'bg-red-500/10 text-red-650 border-red-500/20'
                                  : usr.role === 'ADMIN'
                                  ? 'bg-amber-500/10 text-amber-650 border-amber-500/20'
                                  : 'bg-blue-500/10 text-blue-650 border-blue-500/20'
                              }`}>
                                {usr.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 truncate max-w-[180px]">
                              {usr.sectors ? (
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded border border-slate-250 dark:border-slate-800">
                                  {usr.sectors}
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600 text-[10px]">Nenhum setor</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {usersList.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center py-8 text-slate-500">Nenhum operador encontrado no banco.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Create User Form Column (1/3 width) */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Criar Novo Usuário</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gere novas credenciais de login para a plataforma.</p>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    {userSuccessMsg && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-400">
                        {userSuccessMsg}
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        placeholder="Ex: Randy Gomes"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">E-mail</label>
                      <input
                        type="email"
                        required
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="Ex: atendente@setoriza.com"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">Senha Provisória</label>
                      <input
                        type="password"
                        required
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">Papel (Permissões)</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-750 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="USER">USER (Operador de Atendimento)</option>
                        <option value="ADMIN">ADMIN (Administrador Supervisor)</option>
                        <option value="MASTER">MASTER (Acesso Total)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">Setores Vinculados (Separados por vírgula)</label>
                      <input
                        type="text"
                        value={newUser.sectors}
                        onChange={(e) => setNewUser({ ...newUser, sectors: e.target.value })}
                        placeholder="Ex: Suporte, Comercial, Financeiro"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <p className="text-[9px] text-slate-500 mt-1">Os setores digitados aqui associam os atendimentos que o operador poderá capturar.</p>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1"
                    >
                      <Plus size={14} />
                      Criar Colaborador
                    </button>
                  </form>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: CLIENT MANAGEMENT ("CLIENTES") */}
          {activeSubTab === 'clients' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* List of Clients (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Clientes Corporativos Cadastrados</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Visualize as empresas clientes que utilizam o gateway e gerencie seus contatos autorizados (números de WhatsApp).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientsList.map((client) => (
                    <div 
                      key={client.id}
                      className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">{client.companyName}</h3>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">CNPJ: {client.cnpj}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            title="Remover Cliente"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Contacts linked */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Contatos de WhatsApp:</span>
                          {client.contacts && client.contacts.length > 0 ? (
                            <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1">
                              {client.contacts.map((contact: any) => (
                                <div key={contact.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-1.5 rounded border border-slate-200 dark:border-slate-800/80 text-[10px]">
                                  <span className="font-semibold text-slate-700 dark:text-slate-350">{contact.contactName}</span>
                                  <span className="font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                    <Phone size={10} />
                                    {contact.whatsappNumber.split('@')[0]}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-500 italic">Nenhum contato cadastrado. O robô irá solicitar CNPJ no primeiro contato.</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedClientIdForContact(client.id)}
                        className="mt-2 w-full py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-250 dark:border-slate-700/65 text-slate-700 dark:text-slate-200 font-bold text-[9px] rounded-lg tracking-wide flex items-center justify-center gap-1 transition-all"
                      >
                        <Plus size={11} />
                        Vincular Contato do WhatsApp
                      </button>
                    </div>
                  ))}

                  {clientsList.length === 0 && (
                    <div className="col-span-2 p-8 text-center text-slate-500 text-xs">
                      Nenhum cliente corporativo cadastrado ainda.
                    </div>
                  )}
                </div>
              </div>

              {/* Create Client Form (1/3 width) */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Cadastrar Empresa</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Adicione o cadastro da empresa parceira para triagem automática.</p>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                  <form onSubmit={handleCreateClient} className="space-y-4">
                    {clientSuccessMsg && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-400">
                        {clientSuccessMsg}
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">Razão Social / Nome Fantasia</label>
                      <input
                        type="text"
                        required
                        value={newClient.companyName}
                        onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
                        placeholder="Ex: Innker Code LTDA"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">CNPJ (Apenas números)</label>
                      <input
                        type="text"
                        required
                        value={newClient.cnpj}
                        onChange={(e) => setNewClient({ ...newClient, cnpj: e.target.value })}
                        placeholder="Ex: 12345678000199"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1"
                    >
                      <Plus size={14} />
                      Salvar Cadastro
                    </button>
                  </form>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: INTEGRATION SETTINGS ("INTEGRAÇÃO") */}
          {activeSubTab === 'integrations' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gerenciador de Conectores do WhatsApp</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Crie instâncias e faça a autenticação do robô leitor do WhatsApp escaneando o QR Code abaixo.
                  </p>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                  {evoSuccessMsg && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-400">
                      {evoSuccessMsg}
                    </div>
                  )}

                  {evoStatus === 'LOADING' && (
                    <div className="flex flex-col items-center justify-center p-8 text-slate-500 text-xs gap-2">
                      <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Verificando estado do conector do WhatsApp...</span>
                    </div>
                  )}

                  {evoStatus === 'CONNECTED' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex items-start gap-3">
                        <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Aparelho Conectado e Ativo!</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            O robô de atendimento está pareado com sucesso e processando mensagens recebidas em tempo real.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Nome da Instância:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{evoConfig.instanceName}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Status Operacional:</span>
                          <span className="font-bold text-emerald-500">CONECTADO</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={handleLogoutEvoInstance}
                          className="py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                        >
                          Desconectar Aparelho (Logout)
                        </button>
                      </div>
                    </div>
                  )}

                  {evoStatus === 'DISCONNECTED' && (
                    <div className="space-y-6">
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-start gap-3">
                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Aparelho Desconectado</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            A instância existe, mas o WhatsApp não está pareado. Você precisa escanear o QR Code abaixo com o aplicativo do WhatsApp no celular de atendimento.
                          </p>
                        </div>
                      </div>

                      {qrCodeBase64 ? (
                        <div className="flex flex-col items-center justify-center p-6 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-2xl space-y-4 max-w-sm mx-auto">
                          <h4 className="font-bold text-xs text-slate-700 dark:text-slate-350 text-center uppercase tracking-wide">Escaneie o QR Code</h4>
                          <img 
                            src={qrCodeBase64} 
                            alt="WhatsApp QR Code" 
                            className="h-56 w-56 border-4 border-white bg-white rounded-lg shadow-md"
                          />
                          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                            Abra o WhatsApp no celular &gt; Menu &gt; Aparelhos Conectados &gt; Conectar Aparelho.
                          </p>
                          <button
                            onClick={handleLoadQrCode}
                            disabled={qrLoading}
                            className="py-1 px-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-lg transition-all"
                          >
                            {qrLoading ? 'Atualizando...' : 'Atualizar QR Code'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <button
                            onClick={handleLoadQrCode}
                            disabled={qrLoading}
                            className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                          >
                            {qrLoading ? 'Carregando...' : 'Gerar QR Code de Conexão'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {evoStatus === 'OFFLINE' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl flex items-start gap-3">
                        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Robô Indisponível / Instância Inexistente</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Não conseguimos detectar uma conexão ativa com a Evolution API. É possível que a instância do robô ainda não tenha sido criada no servidor local.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 text-center">
                        <button
                          onClick={handleCreateEvoInstance}
                          className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 mx-auto"
                        >
                          <Plus size={14} />
                          Instanciar Robô (Criar Instância "{evoConfig.instanceName}")
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Status and instructions */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Status do Servidor</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configuração de rede e Webhooks.</p>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`h-3 w-3 rounded-full ${evoStatus === 'OFFLINE' ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse shrink-0`}></span>
                    <div>
                      <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        {evoStatus === 'OFFLINE' ? 'API Inalcançável' : 'Conector Online'}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">API: {evoConfig.baseUrl}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 space-y-2 leading-relaxed">
                    <p><strong>Configuração de Webhook:</strong></p>
                    <p>Certifique-se de configurar o webhook de recebimento de mensagens na sua instância do Evolution API direcionado para:</p>
                    <code className="block bg-slate-100 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 font-mono text-[9px] break-all select-all">
                      http://localhost:8080/api/v1/webhooks/evolution
                    </code>
                    <p className="text-[9px] text-slate-450 dark:text-slate-600">Eventos necessários: `messages.upsert` e `messages.update`.</p>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* MODAL LINK CONTACT */}
      {selectedClientIdForContact && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Vincular Contato de Empresa</h3>
              <button
                onClick={() => setSelectedClientIdForContact(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-4">
              {contactSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-xl text-[10px] text-emerald-700 dark:text-emerald-400">
                  {contactSuccessMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">Nome do Contato</label>
                <input
                  type="text"
                  required
                  value={newContact.contactName}
                  onChange={(e) => setNewContact({ ...newContact, contactName: e.target.value })}
                  placeholder="Ex: Randy Gomes (Diretor)"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">Número de WhatsApp (Com DDI e DDD)</label>
                <input
                  type="text"
                  required
                  value={newContact.whatsappNumber}
                  onChange={(e) => setNewContact({ ...newContact, whatsappNumber: e.target.value })}
                  placeholder="Ex: 5511999999999"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[8px] text-slate-500 mt-1">Este número será associado a esta empresa e pulará o fluxo inicial do chatbot.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedClientIdForContact(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-sm border border-slate-250 dark:border-slate-700/60 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
