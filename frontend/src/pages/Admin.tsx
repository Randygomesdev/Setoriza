import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import {
  Users,
  Briefcase,
  Key,
  LayoutDashboard,
  Plus,
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
  MessageSquare,
  Check,
  LogOut,
  Edit,
  Trash2,
  History,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Search
} from 'lucide-react';

const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined) return '-';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
};

const formatCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
};

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  
  // Brazil DDI (55)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const ddd = digits.slice(2, 4);
    const number = digits.slice(4);
    if (number.length === 8) {
      return `+55 (${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
    } else {
      return `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
    }
  }
  
  // US / Canada DDI (1)
  if (digits.startsWith('1') && digits.length === 11) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Generic fallback
  if (digits.length > 10) {
    return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  }
  return `+${digits}`;
};

const formatPhoneOnly = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const formatTechnicalName = (val: string): string => {
  return val
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
};

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Navigation tabs: 'dashboard' | 'users' | 'clients' | 'integrations' | 'sectors'
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'users' | 'clients' | 'integrations' | 'sectors' | 'history'>('dashboard');
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
  const [slaMetrics, setSlaMetrics] = useState<any | null>(null);
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

  const [newClient, setNewClient] = useState({
    companyName: '',
    cnpj: '',
    initialContactName: '',
    initialWhatsappNumber: '',
  });
  const [clientSuccessMsg, setClientSuccessMsg] = useState('');
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [tempContacts, setTempContacts] = useState<{ contactName: string; whatsappNumber: string }[]>([]);
  const [isAddingContactInline, setIsAddingContactInline] = useState(false);
  const [inlineContact, setInlineContact] = useState({ contactName: '', ddi: '55', whatsappNumber: '' });
  // Search states
  const [searchUser, setSearchUser] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [searchSector, setSearchSector] = useState('');

  // Form states - Evolution Integration
  const [evoConfig, setEvoConfig] = useState({
    baseUrl: 'http://localhost:8080',
    instanceName: 'setoriza-dev',
    apiKey: 'apikey-key-password-123',
  });
  const [evoSuccessMsg, setEvoSuccessMsg] = useState('');

  // Form states - Edit User
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form states - Edit Sector
  const [editingSector, setEditingSector] = useState<any | null>(null);
  const [sectorSuccessMsg, setSectorSuccessMsg] = useState('');

  // Form states - Create Sector
  const [newSector, setNewSector] = useState({
    name: '',
    friendlyName: '',
    slaLimitMinutes: 15,
    active: true
  });

  // Drawer states
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [isClientDrawerOpen, setIsClientDrawerOpen] = useState(false);
  const [isSectorDrawerOpen, setIsSectorDrawerOpen] = useState(false);

  // History Filters & States
  const [historyTickets, setHistoryTickets] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPages, setHistoryPages] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyPageSize] = useState(10);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [histFilterClient, setHistFilterClient] = useState('');
  const [histFilterSector, setHistFilterSector] = useState('');
  const [histFilterAgent, setHistFilterAgent] = useState('');
  const [histFilterStatus, setHistFilterStatus] = useState('');
  const [histFilterStartDate, setHistFilterStartDate] = useState('');
  const [histFilterEndDate, setHistFilterEndDate] = useState('');
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
      const ddd = cleanPhone.substring(2, 4);
      const firstPart = cleanPhone.substring(4, cleanPhone.length - 4);
      const lastPart = cleanPhone.substring(cleanPhone.length - 4);
      return `+55 (${ddd}) ${firstPart}-${lastPart}`;
    }
    if (cleanPhone.length === 11) {
      const ddd = cleanPhone.substring(0, 2);
      const firstPart = cleanPhone.substring(2, 7);
      const lastPart = cleanPhone.substring(7);
      return `(${ddd}) ${firstPart}-${lastPart}`;
    }
    if (cleanPhone.length === 10) {
      const ddd = cleanPhone.substring(0, 2);
      const firstPart = cleanPhone.substring(2, 6);
      const lastPart = cleanPhone.substring(6);
      return `(${ddd}) ${firstPart}-${lastPart}`;
    }
    return phone;
  };

  const loadHistoryTickets = async (page = 0) => {
    setHistoryLoading(true);
    try {
      const startIso = histFilterStartDate ? `${histFilterStartDate}T00:00:00` : undefined;
      const endIso = histFilterEndDate ? `${histFilterEndDate}T23:59:59` : undefined;
      
      const res = await api.tickets.history({
        status: histFilterStatus ? [histFilterStatus] : undefined,
        sectorId: histFilterSector || undefined,
        assignedAgentId: histFilterAgent || undefined,
        clientQuery: histFilterClient || undefined,
        startDate: startIso,
        endDate: endIso,
        page,
        size: historyPageSize
      });
      
      setHistoryTickets(res.content || []);
      setHistoryTotal(res.totalElements || 0);
      setHistoryPages(res.totalPages || 0);
      setHistoryPage(page);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      loadHistoryTickets(0);
    }
  }, [
    activeSubTab,
    histFilterClient,
    histFilterSector,
    histFilterAgent,
    histFilterStatus,
    histFilterStartDate,
    histFilterEndDate
  ]);

  // Sync theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const location = useLocation();
  useEffect(() => {
    const state = location.state as { activeTab?: string } | null;
    if (state?.activeTab === 'history') {
      setActiveSubTab('history');
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, navigate]);

  // Load initial data
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

  const checkEvoStatus = async () => {
    setEvoStatus('LOADING');
    try {
      const res = await api.integration.getStatus();
      if (res && res.instance && res.instance.state === 'open') {
        setEvoStatus('CONNECTED');
        setQrCodeBase64(null);
        if (res.configuredInstanceName) {
          setEvoConfig(prev => ({ ...prev, instanceName: res.configuredInstanceName }));
        }
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
      setTimeout(() => {
        setIsUserDrawerOpen(false);
        setUserSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSuccessMsg('');
    setError(null);
    if (!editingUser) return;
    try {
      await api.users.update(editingUser.id, {
        name: editingUser.name,
        role: editingUser.role,
        sectors: editingUser.sectors,
      });
      setUserSuccessMsg('Colaborador atualizado com sucesso!');
      // Refresh list
      const u = await api.users.list();
      setUsersList(u);
      setTimeout(() => {
        setIsUserDrawerOpen(false);
        setEditingUser(null);
        setUserSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar colaborador');
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientSuccessMsg('');
    setError(null);
    try {
      const cleanCnpj = newClient.cnpj.replace(/\D/g, '');
      const created = await api.clients.create({
        companyName: newClient.companyName,
        cnpj: cleanCnpj,
      });

      // Add all temporary contacts added during creation
      for (const tc of tempContacts) {
        const cleanPhone = tc.whatsappNumber.replace(/\D/g, '');
        await api.clients.addContact(created.id, {
          whatsappNumber: cleanPhone,
          contactName: tc.contactName,
        });
      }

      setClientSuccessMsg('Cliente cadastrado com sucesso!');
      setNewClient({
        companyName: '',
        cnpj: '',
        initialContactName: '',
        initialWhatsappNumber: '',
      });
      setTempContacts([]);
      setIsAddingContactInline(false);
      setInlineContact({ contactName: '', ddi: '55', whatsappNumber: '' });
      // Refresh list
      const c = await api.clients.list();
      setClientsList(c);
      setTimeout(() => {
        setIsClientDrawerOpen(false);
        setClientSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar cliente');
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientSuccessMsg('');
    setError(null);
    if (!editingClient) return;
    try {
      const cleanCnpj = editingClient.cnpj.replace(/\D/g, '');
      await api.clients.update(editingClient.id, {
        companyName: editingClient.companyName,
        cnpj: cleanCnpj,
      });
      setClientSuccessMsg('Cadastro do cliente atualizado com sucesso!');
      // Refresh list
      const c = await api.clients.list();
      setClientsList(c);
      setTimeout(() => {
        setIsClientDrawerOpen(false);
        setEditingClient(null);
        setClientSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar cliente');
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

  const handleDeleteSector = async (id: string) => {
    if (!confirm('Deseja realmente desativar este setor?')) return;
    setError(null);
    try {
      await api.sectors.delete(id);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao desativar setor');
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

  // Search filtering
  const filteredUsers = usersList.filter((usr) => {
    const q = searchUser.toLowerCase();
    return (
      usr.name.toLowerCase().includes(q) ||
      usr.email.toLowerCase().includes(q) ||
      (usr.sectors && usr.sectors.toLowerCase().includes(q))
    );
  });

  const filteredClients = clientsList.filter((client) => {
    const q = searchClient.replace(/\D/g, '');
    const textQuery = searchClient.toLowerCase();
    return (
      client.companyName.toLowerCase().includes(textQuery) ||
      client.cnpj.replace(/\D/g, '').includes(q)
    );
  });

  const filteredSectors = sectorsList.filter((sect) => {
    const q = searchSector.toLowerCase();
    return (
      sect.name.toLowerCase().includes(q) ||
      sect.friendlyName.toLowerCase().includes(q)
    );
  });

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
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
              title="Alternar Tema"
            >
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-450 hover:bg-slate-200/50 dark:hover:bg-slate-805 transition-colors"
              title="Sair da Conta"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">{user?.name}</h4>
            <span className="text-[9px] uppercase font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
              {user?.role === 'MASTER' ? 'Master' : user?.role === 'ADMIN' ? 'Administrador' : 'Operador'}
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
            Clientes
          </button>
          
          <button
            onClick={() => setActiveSubTab('sectors')}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeSubTab === 'sectors'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50'
            }`}
          >
            <FolderOpen size={15} />
            Setores e SLA
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

          <button
            onClick={() => setActiveSubTab('history')}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeSubTab === 'history'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50'
            }`}
          >
            <History size={15} />
            Histórico de Chamados
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
                    <div className={`relative h-28 w-28 flex items-center justify-center rounded-full border-[10px] ${
                      slaMetrics && slaMetrics.overallPercentageWithinSla >= 80 ? 'border-emerald-500' : 'border-amber-500'
                    } border-t-slate-200 dark:border-t-slate-800`}>
                      <div className="text-center">
                        <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                          {slaMetrics?.overallPercentageWithinSla !== undefined ? `${slaMetrics.overallPercentageWithinSla.toFixed(0)}%` : 'N/A'}
                        </span>
                        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Dentro do SLA</p>
                      </div>
                    </div>
                    <div className="w-full text-center space-y-1">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tempo Médio de Primeiro Atendimento</p>
                      <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                        {slaMetrics?.overallAvgResponseTimeSeconds !== undefined && slaMetrics.overallAvgResponseTimeSeconds > 0 
                          ? formatDuration(slaMetrics.overallAvgResponseTimeSeconds) 
                          : 'Sem chamados'}
                      </p>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500">
                        Tempo Médio de Resolução: {slaMetrics?.overallAvgResolutionTimeSeconds !== undefined && slaMetrics.overallAvgResolutionTimeSeconds > 0 
                          ? formatDuration(slaMetrics.overallAvgResolutionTimeSeconds) 
                          : 'N/A'}
                      </p>
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

              {/* SLA details per sector */}
              {slaMetrics?.sectorMetrics && slaMetrics.sectorMetrics.length > 0 && (
                <div className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Detalhamento de SLA por Setor</h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Métricas acumuladas a partir do histórico de transferências e atendimentos.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          <th className="py-2.5 px-3">Setor</th>
                          <th className="py-2.5 px-3">Meta (SLA)</th>
                          <th className="py-2.5 px-3">Tempo Médio de Atendimento</th>
                          <th className="py-2.5 px-3">Tempo Médio de Resolução</th>
                          <th className="py-2.5 px-3">Dentro do SLA (%)</th>
                          <th className="py-2.5 px-3">Chamados Tratados</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {slaMetrics.sectorMetrics.map((sm: any) => (
                          <tr key={sm.sectorId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-all">
                            <td className="py-3 px-3 font-semibold text-slate-850 dark:text-slate-250">{sm.friendlyName}</td>
                            <td className="py-3 px-3 text-slate-500">{sm.slaLimitMinutes} minutos</td>
                            <td className="py-3 px-3 font-bold text-blue-600 dark:text-blue-400">
                              {sm.avgResponseTimeSeconds !== null ? formatDuration(sm.avgResponseTimeSeconds) : 'Sem dados'}
                            </td>
                            <td className="py-3 px-3 text-slate-500 font-semibold">
                              {sm.avgResolutionTimeSeconds !== null ? formatDuration(sm.avgResolutionTimeSeconds) : 'Sem dados'}
                            </td>
                            <td className="py-3 px-3">
                              {sm.percentageWithinSla !== null ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sm.percentageWithinSla >= 80 
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' 
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                                }`}>
                                  {sm.percentageWithinSla.toFixed(0)}%
                                </span>
                              ) : (
                                <span className="text-slate-450">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-500 font-semibold">{sm.totalTicketsHandled}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: USER MANAGEMENT ("USUARIOS") */}
          {activeSubTab === 'users' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cadastro de Colaboradores</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gerencie os atendentes cadastrados no serviço de autenticação e seus setores.</p>
                </div>
                <button
                  onClick={() => {
                    setNewUser({ name: '', email: '', password: '', role: 'USER', sectors: '' });
                    setUserSuccessMsg('');
                    setIsUserDrawerOpen(true);
                  }}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  Novo Colaborador
                </button>
              </div>

              {/* Search Bar */}
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Pesquisar por nome, e-mail ou setor..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full md:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                />
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-3.5">Nome / Colaborador</th>
                        <th className="px-6 py-3.5">E-mail</th>
                        <th className="px-6 py-3.5">Nível de Acesso</th>
                        <th className="px-6 py-3.5">Setores Vinculados</th>
                        <th className="px-6 py-3.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-350">
                      {filteredUsers.map((usr) => (
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
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40'
                                : usr.role === 'ADMIN'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40'
                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40'
                            }`}>
                              {usr.role === 'MASTER' ? 'Master' : usr.role === 'ADMIN' ? 'Administrador' : 'Operador'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {usr.sectors ? (
                              <div className="flex flex-wrap gap-1">
                                {usr.sectors.split(',').map((s: string) => {
                                  const trimmed = s.trim();
                                  if (!trimmed) return null;
                                  return (
                                    <span 
                                      key={trimmed} 
                                      className="text-[9px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                                    >
                                      {trimmed}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-450 text-[10px] italic">Nenhum setor</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {!(usr.role === 'MASTER' && user?.role === 'ADMIN') ? (
                              <button
                                onClick={() => {
                                  setEditingUser({
                                    id: usr.id,
                                    name: usr.name,
                                    email: usr.email,
                                    role: usr.role,
                                    sectors: usr.sectors || ''
                                  });
                                  setUserSuccessMsg('');
                                  setIsUserDrawerOpen(true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-500 font-bold hover:underline transition-all"
                              >
                                Editar
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 cursor-not-allowed">Restrito</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-slate-500">
                            {searchUser ? 'Nenhum colaborador encontrado para esta busca.' : 'Nenhum operador encontrado no banco.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* User Drawer moved to root level */}

            </div>
          )}

          {/* TAB 3: CLIENT MANAGEMENT ("CLIENTES") */}
          {activeSubTab === 'clients' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cadastro de Clientes</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Visualize os clientes cadastrados e gerencie seus contatos autorizados (números de WhatsApp).
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNewClient({ companyName: '', cnpj: '', initialContactName: '', initialWhatsappNumber: '' });
                    setClientSuccessMsg('');
                    setIsClientDrawerOpen(true);
                  }}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  Cadastrar Cliente
                </button>
              </div>

              {/* Search Bar */}
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou CNPJ..."
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                  className="w-full md:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                />
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-3.5">Razão Social / Nome Fantasia</th>
                        <th className="px-6 py-3.5">CNPJ</th>
                        <th className="px-6 py-3.5">Contatos de WhatsApp</th>
                        <th className="px-6 py-3.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-350">
                      {filteredClients.map((client) => (
                        <tr key={client.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                          <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                            {client.companyName}
                          </td>
                          <td className="px-6 py-4 font-mono">{formatCNPJ(client.cnpj)}</td>
                          <td className="px-6 py-4">
                            {client.contacts && client.contacts.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 max-w-[320px]">
                                {client.contacts.map((contact: any) => (
                                  <span 
                                    key={contact.id} 
                                    className="inline-flex items-center gap-1 text-[9px] font-semibold bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-md border border-blue-200/40 dark:border-slate-750"
                                    title={contact.contactName}
                                  >
                                    <Phone size={8} />
                                    {contact.contactName}: {formatPhone(contact.whatsappNumber)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-[10px] italic">Nenhum contato cadastrado</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  if (!client.contacts || client.contacts.length === 0) {
                                    alert('Este cliente não possui nenhum contato de WhatsApp cadastrado. Edite o cliente para adicionar contatos.');
                                    return;
                                  }
                                  const phone = client.contacts[0].whatsappNumber.replace(/\D/g, '');
                                  navigate('/chat', { state: { searchPhone: phone } });
                                }}
                                className="p-1 rounded-lg text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all"
                                title="Iniciar Conversa / Ir para o Chat"
                              >
                                <MessageSquare size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingClient({
                                    id: client.id,
                                    companyName: client.companyName,
                                    cnpj: formatCNPJ(client.cnpj),
                                  });
                                  setClientSuccessMsg('');
                                  setIsClientDrawerOpen(true);
                                }}
                                className="p-1 rounded-lg text-blue-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all"
                                title="Visualizar / Editar Dados do Cliente"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteClient(client.id)}
                                className="p-1 rounded-lg text-rose-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                                title="Remover Cliente"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredClients.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-slate-500">
                            {searchClient ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado ainda.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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


                </div>
              </div>

            </div>
          )}

          {activeSubTab === 'sectors' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Setores de Atendimento</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Gerencie os departamentos da sua empresa e defina a meta de SLA (tempo máximo para primeiro atendimento) de cada um.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingSector(null);
                    setNewSector({ name: '', friendlyName: '', slaLimitMinutes: 15, active: true });
                    setSectorSuccessMsg('');
                    setIsSectorDrawerOpen(true);
                  }}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  Novo Setor
                </button>
              </div>

              {/* Search Bar */}
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Pesquisar por setor..."
                  value={searchSector}
                  onChange={(e) => setSearchSector(e.target.value)}
                  className="w-full md:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                />
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="py-3 px-4">Nome do Setor</th>
                      <th className="py-3 px-4">Meta SLA</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {filteredSectors.map((sect: any) => (
                      <tr key={sect.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-all">
                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{sect.friendlyName}</td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          <span className="font-bold text-blue-600 dark:text-blue-400">{sect.slaLimitMinutes || 15}</span> minutos
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sect.active 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' 
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400'
                          }`}>
                            {sect.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingSector({
                                  id: sect.id,
                                  name: sect.name,
                                  friendlyName: sect.friendlyName,
                                  active: sect.active,
                                  slaLimitMinutes: sect.slaLimitMinutes || 15
                                });
                                setSectorSuccessMsg('');
                                setIsSectorDrawerOpen(true);
                              }}
                              className="p-1 rounded-lg text-blue-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all"
                              title="Visualizar / Editar Setor"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteSector(sect.id)}
                              className={`p-1 rounded-lg transition-all ${
                                sect.active 
                                  ? 'text-rose-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20' 
                                  : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                              }`}
                              title="Desativar Setor"
                              disabled={!sect.active}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredSectors.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500">
                          {searchSector ? 'Nenhum setor encontrado para esta busca.' : 'Nenhum setor cadastrado.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Sector Drawer moved to root level */}

            </div>
          )}

        </div>
      </div>

      {/* ======================================================== */}
      {/* GLOBAL PORTAL DRAWERS (RENDERING AT THE ROOT VIEWPORT LEVEL) */}
      {/* ======================================================== */}

      {/* DRAWER: Create / Edit User */}
      {isUserDrawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => {
              setIsUserDrawerOpen(false);
              setEditingUser(null);
            }}
            className="fixed inset-0 bg-slate-950/40 z-40 backdrop-blur-sm"
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-6 overflow-y-auto flex flex-col space-y-4 animate-in slide-in-from-right duration-250">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {editingUser ? 'Editar Colaborador' : 'Criar Novo Usuário'}
                </h3>
                <p className="text-[10px] text-slate-450 dark:text-slate-500">
                  {editingUser ? 'Atualize o nível de acesso e setores do colaborador.' : 'Gere novas credenciais de login para a plataforma.'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsUserDrawerOpen(false);
                  setEditingUser(null);
                }}
                className="text-slate-400 hover:text-slate-500 dark:text-slate-500 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4 pt-2">
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
                  value={editingUser ? editingUser.name : newUser.name}
                  onChange={(e) => {
                    if (editingUser) {
                      setEditingUser({ ...editingUser, name: e.target.value });
                    } else {
                      setNewUser({ ...newUser, name: e.target.value });
                    }
                  }}
                  placeholder="Ex: Randy Gomes"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">E-mail</label>
                <input
                  type="email"
                  required
                  value={editingUser ? editingUser.email : newUser.email}
                  onChange={(e) => {
                    if (editingUser) {
                      setEditingUser({ ...editingUser, email: e.target.value });
                    } else {
                      setNewUser({ ...newUser, email: e.target.value });
                    }
                  }}
                  placeholder="Ex: atendente@setoriza.com"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {!editingUser && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">Senha Provisória</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">Nível de Acesso</label>
                <select
                  value={editingUser ? editingUser.role : newUser.role}
                  onChange={(e) => {
                    if (editingUser) {
                      setEditingUser({ ...editingUser, role: e.target.value });
                    } else {
                      setNewUser({ ...newUser, role: e.target.value });
                    }
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="USER">Operador (Atendimento)</option>
                  <option value="ADMIN">Administrador (Supervisor)</option>
                  {user?.role === 'MASTER' && (
                    <option value="MASTER">Master (Acesso Total)</option>
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">Setores Vinculados</label>
                {sectorsList.length === 0 ? (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Cadastre setores na aba "Setores e SLA" primeiro.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl max-h-[140px] overflow-y-auto">
                    {sectorsList.map((sect: any) => {
                      const rawSectors = editingUser ? editingUser.sectors : newUser.sectors;
                      const sectorsArray = rawSectors
                        ? rawSectors.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean)
                        : [];
                      const isChecked = sectorsArray.includes(sect.name.toUpperCase());

                      return (
                        <label key={sect.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              let newSectorsArray = [...sectorsArray];
                              if (checked) {
                                newSectorsArray.push(sect.name.toUpperCase());
                              } else {
                                newSectorsArray = newSectorsArray.filter(s => s !== sect.name.toUpperCase());
                              }
                              const newSectorsString = newSectorsArray.join(', ');
                              if (editingUser) {
                                setEditingUser({ ...editingUser, sectors: newSectorsString });
                              } else {
                                setNewUser({ ...newUser, sectors: newSectorsString });
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          {sect.friendlyName}
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-[9px] text-slate-500">Selecione os setores que este colaborador poderá atender.</p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1"
                >
                  {editingUser ? <Check size={14} /> : <Plus size={14} />}
                  {editingUser ? 'Salvar Alterações' : 'Criar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* DRAWER: Create / Edit Client */}
      {isClientDrawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => {
              setIsClientDrawerOpen(false);
              setEditingClient(null);
            }}
            className="fixed inset-0 bg-slate-950/40 z-40 backdrop-blur-sm"
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-6 overflow-y-auto flex flex-col space-y-4 animate-in slide-in-from-right duration-250">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {editingClient ? 'Editar Cliente' : 'Cadastrar Cliente'}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {editingClient ? 'Atualize a razão social e CNPJ do cliente parceiro.' : 'Adicione o cadastro do cliente parceiro para triagem automática.'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsClientDrawerOpen(false);
                  setEditingClient(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={editingClient ? handleUpdateClient : handleCreateClient} className="space-y-4 pt-2">
              {clientSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-400">
                  {clientSuccessMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">Razão Social</label>
                <input
                  type="text"
                  required
                  value={editingClient ? editingClient.companyName : newClient.companyName}
                  onChange={(e) => {
                    if (editingClient) {
                      setEditingClient({ ...editingClient, companyName: e.target.value });
                    } else {
                      setNewClient({ ...newClient, companyName: e.target.value });
                    }
                  }}
                  placeholder="Ex: Minha Empresa Parceira Ltda"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">CNPJ da Empresa</label>
                <input
                  type="text"
                  required
                  maxLength={18}
                  value={editingClient ? editingClient.cnpj : newClient.cnpj}
                  onChange={(e) => {
                    const val = formatCNPJ(e.target.value);
                    if (editingClient) {
                      setEditingClient({ ...editingClient, cnpj: val });
                    } else {
                      setNewClient({ ...newClient, cnpj: val });
                    }
                  }}
                  placeholder="00.000.000/0000-00"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* MULTI-CONTACTS INLINE CONTAINER */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-850">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">Contatos autorizados (WhatsApp)</label>
                  {!isAddingContactInline && (
                    <button
                      type="button"
                      onClick={() => setIsAddingContactInline(true)}
                      className="text-[10px] text-blue-600 hover:text-blue-500 font-bold hover:underline"
                    >
                      + Vincular Contato
                    </button>
                  )}
                </div>

                {/* Display existing or temporary contacts list */}
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {/* 1. If editing, show client's real contacts from database */}
                  {editingClient && (
                    <>
                      {(() => {
                        const currentClient = clientsList.find(c => c.id === editingClient.id);
                        const contacts = currentClient ? currentClient.contacts : [];
                        
                        if (!contacts || contacts.length === 0) {
                          return <p className="text-[10px] text-slate-500 italic text-center py-2">Nenhum contato cadastrado.</p>;
                        }

                        return contacts.map((contact: any) => (
                          <div key={contact.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px]">
                            <div>
                              <span className="font-semibold text-slate-750 dark:text-slate-300 block">{contact.contactName}</span>
                              <span className="font-mono text-slate-500 block text-[9px]">{formatPhone(contact.whatsappNumber)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Deseja remover o contato "${contact.contactName}"?`)) {
                                  try {
                                    await api.clients.deleteContact(editingClient.id, contact.id);
                                    const c = await api.clients.list();
                                    setClientsList(c);
                                  } catch (err: any) {
                                    alert(err.message || 'Erro ao remover contato');
                                  }
                                }
                              }}
                              className="p-1 rounded hover:bg-rose-50 text-rose-600 hover:text-rose-500 dark:hover:bg-rose-950/20 transition-colors"
                              title="Remover Contato"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ));
                      })()}
                    </>
                  )}

                  {/* 2. If creating, show temporary local contacts */}
                  {!editingClient && (
                    <>
                      {tempContacts.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic text-center py-2">Nenhum contato adicionado ainda.</p>
                      ) : (
                        tempContacts.map((contact, index) => (
                          <div key={index} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px]">
                            <div>
                              <span className="font-semibold text-slate-750 dark:text-slate-300 block">{contact.contactName}</span>
                              <span className="font-mono text-slate-500 block text-[9px]">{formatPhone(contact.whatsappNumber)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setTempContacts(tempContacts.filter((_, idx) => idx !== index));
                              }}
                              className="p-1 rounded hover:bg-rose-50 text-rose-600 hover:text-rose-500 dark:hover:bg-rose-905/20 transition-colors"
                              title="Remover Contato"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>

                {/* Inline Form to Add Contact */}
                {isAddingContactInline && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Novo Contato</span>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">Identificação do Contato</label>
                      <input
                        type="text"
                        required
                        value={inlineContact.contactName}
                        onChange={(e) => setInlineContact({ ...inlineContact, contactName: e.target.value })}
                        placeholder="Ex: Suporte, Financeiro, Diretoria"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-16 space-y-1">
                        <label className="text-[9px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">DDI</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">+</span>
                          <input
                            type="text"
                            required
                            value={inlineContact.ddi}
                            onChange={(e) => setInlineContact({ ...inlineContact, ddi: e.target.value.replace(/\D/g, '') })}
                            placeholder="55"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-4 pr-1 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                          />
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">WhatsApp (DDD + Número)</label>
                        <input
                          type="text"
                          required
                          maxLength={15}
                          value={inlineContact.whatsappNumber}
                          onChange={(e) => setInlineContact({ ...inlineContact, whatsappNumber: formatPhoneOnly(e.target.value) })}
                          placeholder="(11) 99999-9999"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingContactInline(false);
                          setInlineContact({ contactName: '', ddi: '55', whatsappNumber: '' });
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-md transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!inlineContact.contactName || !inlineContact.whatsappNumber) {
                            alert('Preencha os campos do contato.');
                            return;
                          }
                          const cleanPhone = (inlineContact.ddi || '55').replace(/\D/g, '') + inlineContact.whatsappNumber.replace(/\D/g, '');
                          
                          if (editingClient) {
                            try {
                              await api.clients.addContact(editingClient.id, {
                                contactName: inlineContact.contactName,
                                whatsappNumber: cleanPhone,
                              });
                              const c = await api.clients.list();
                              setClientsList(c);
                              setIsAddingContactInline(false);
                              setInlineContact({ contactName: '', ddi: '55', whatsappNumber: '' });
                            } catch (err: any) {
                              alert(err.message || 'Erro ao adicionar contato');
                            }
                          } else {
                            setTempContacts([...tempContacts, {
                              contactName: inlineContact.contactName,
                              whatsappNumber: cleanPhone
                            }]);
                            setIsAddingContactInline(false);
                            setInlineContact({ contactName: '', ddi: '55', whatsappNumber: '' });
                          }
                        }}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-md transition-all"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1"
                >
                  {editingClient ? <Check size={14} /> : <Plus size={14} />}
                  {editingClient ? 'Salvar Alterações' : 'Salvar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* DRAWER: Create / Edit Sector */}
      {isSectorDrawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => setIsSectorDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/40 z-40 backdrop-blur-sm"
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-6 overflow-y-auto flex flex-col space-y-4 animate-in slide-in-from-right duration-250">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {editingSector ? 'Editar Setor' : 'Cadastrar Novo Setor'}
                </h3>
                <p className="text-[10px] text-slate-450 dark:text-slate-500">
                  {editingSector ? 'Ajuste os parâmetros de SLA do setor.' : 'Adicione um novo departamento ao sistema.'}
                </p>
              </div>
              <button 
                onClick={() => setIsSectorDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="pt-2">
              {sectorSuccessMsg && (
                <div className="p-3 mb-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-400">
                  {sectorSuccessMsg}
                </div>
              )}

              {editingSector ? (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError(null);
                    setSectorSuccessMsg('');
                    try {
                      await api.sectors.update(editingSector.id, {
                        name: editingSector.name,
                        friendlyName: editingSector.friendlyName,
                        active: editingSector.active,
                        slaLimitMinutes: parseInt(editingSector.slaLimitMinutes.toString(), 10) || 15
                      });
                      setSectorSuccessMsg('Setor e SLA atualizados com sucesso!');
                      await loadData();
                      setTimeout(() => {
                        setEditingSector(null);
                        setSectorSuccessMsg('');
                        setIsSectorDrawerOpen(false);
                      }, 1500);
                    } catch (err: any) {
                      setError(err.message || 'Erro ao atualizar setor');
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nome do Setor</label>
                     <input 
                       type="text"
                       required
                       value={editingSector.friendlyName}
                       onChange={e => setEditingSector({...editingSector, friendlyName: e.target.value})}
                       className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                     />
                   </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Limite de SLA (Em minutos)</label>
                    <input 
                      type="number"
                      required
                      min={1}
                      max={1440}
                      value={editingSector.slaLimitMinutes}
                      onChange={e => setEditingSector({...editingSector, slaLimitMinutes: e.target.value})}
                      className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[9px] text-slate-450 dark:text-slate-500">
                      Tempo limite tolerado de fila para que o operador assuma o chamado neste setor.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input 
                      type="checkbox"
                      id="sectorActiveCheckbox"
                      checked={editingSector.active}
                      onChange={e => setEditingSector({...editingSector, active: e.target.checked})}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="sectorActiveCheckbox" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Setor Habilitado (Ativo)</label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1"
                    >
                      Salvar Configuração
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSector(null);
                        setIsSectorDrawerOpen(false);
                      }}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError(null);
                    setSectorSuccessMsg('');
                    try {
                      await api.sectors.create({
                        name: formatTechnicalName(newSector.friendlyName),
                        friendlyName: newSector.friendlyName,
                        active: newSector.active,
                        slaLimitMinutes: parseInt(newSector.slaLimitMinutes.toString(), 10) || 15
                      });
                      setSectorSuccessMsg('Novo setor cadastrado com sucesso!');
                      setNewSector({
                        name: '',
                        friendlyName: '',
                        slaLimitMinutes: 15,
                        active: true
                      });
                      await loadData();
                      setTimeout(() => {
                        setSectorSuccessMsg('');
                        setIsSectorDrawerOpen(false);
                      }, 1500);
                    } catch (err: any) {
                      setError(err.message || 'Erro ao criar setor');
                    }
                  }}
                  className="space-y-4"
                >
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nome do Setor</label>
                     <input 
                       type="text"
                       required
                       value={newSector.friendlyName}
                       onChange={e => setNewSector({...newSector, friendlyName: e.target.value})}
                       placeholder="Ex: Financeiro"
                       className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                     />
                   </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Limite de SLA (Em minutos)</label>
                    <input 
                      type="number"
                      required
                      min={1}
                      max={1440}
                      value={newSector.slaLimitMinutes}
                      onChange={e => setNewSector({...newSector, slaLimitMinutes: parseInt(e.target.value, 10) || 15})}
                      className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input 
                      type="checkbox"
                      id="newSectorActiveCheckbox"
                      checked={newSector.active}
                      onChange={e => setNewSector({...newSector, active: e.target.checked})}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="newSectorActiveCheckbox" className="text-xs font-semibold text-slate-700 dark:text-slate-350">Setor Habilitado (Ativo)</label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1"
                  >
                    <Plus size={14} />
                    Cadastrar Setor
                  </button>
                </form>
              )}
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'history' && (
        <div className="space-y-6 w-full px-4 py-6 animate-fadeIn">
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h1 className="text-xl font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <History className="text-blue-500" size={24} />
                Histórico de Chamados
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Consulte e filtre todos os atendimentos encerrados e ativos da plataforma.
              </p>
            </div>
          </div>

          {/* Smart Filters Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            {/* Filter Client Query */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Cliente / WhatsApp
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <Search size={12} />
                </span>
                <input
                  type="text"
                  placeholder="Nome ou número..."
                  value={histFilterClient}
                  onChange={(e) => setHistFilterClient(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Filter Sector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Setor
              </label>
              <select
                value={histFilterSector}
                onChange={(e) => setHistFilterSector(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">Todos os Setores</option>
                {sectorsList.map((s) => (
                  <option key={s.id} value={s.id}>{s.friendlyName}</option>
                ))}
              </select>
            </div>

            {/* Filter Agent */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Atendente
              </label>
              <select
                value={histFilterAgent}
                onChange={(e) => setHistFilterAgent(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">Todos os Atendentes</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Status
              </label>
              <select
                value={histFilterStatus}
                onChange={(e) => setHistFilterStatus(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">Todos os Statuses</option>
                <option value="CONCLUIDO">Concluído</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="AGUARDANDO_ATENDIMENTO">Aguardando Fila</option>
                <option value="TRIAGEM">Triagem</option>
              </select>
            </div>

            {/* Period Range */}
            <div className="grid grid-cols-2 gap-2 space-y-0">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Início
                </label>
                <input
                  type="date"
                  value={histFilterStartDate}
                  onChange={(e) => setHistFilterStartDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all dark:[color-scheme:dark]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Fim
                </label>
                <input
                  type="date"
                  value={histFilterEndDate}
                  onChange={(e) => setHistFilterEndDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all dark:[color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center p-20 text-slate-400 dark:text-slate-500 text-xs gap-3">
                <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Pesquisando histórico de atendimentos...</span>
              </div>
            ) : historyTickets.length === 0 ? (
              <div className="p-20 text-center text-slate-400 dark:text-slate-500 text-xs italic">
                Nenhum chamado encontrado com os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/40 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 select-none whitespace-nowrap">
                      <th className="px-6 py-4">ID Curto</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Contato</th>
                      <th className="px-6 py-4">WhatsApp</th>
                      <th className="px-6 py-4">Setor</th>
                      <th className="px-6 py-4">Atendente</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Criado em</th>
                      <th className="px-6 py-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-xs text-slate-750 dark:text-slate-350">
                    {historyTickets.map((t) => {
                      const shortId = t.id.substring(0, 8).toUpperCase();
                      
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4 font-mono font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                            <span>#{shortId}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(t.id);
                                alert("ID completo copiado para a área de transferência!");
                              }}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-205 cursor-pointer"
                              title="Copiar ID Completo"
                            >
                              <Clipboard size={10} />
                            </button>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[150px]">
                            {t.client?.companyName || 'Avulso/S. Cadastro'}
                          </td>
                          <td className="px-6 py-4 font-normal text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                            {t.clientName || 'Desconhecido'}
                          </td>
                          <td className="px-6 py-4 font-normal text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {formatPhoneNumber(t.whatsappNumber)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                              {t.sector ? t.sector.friendlyName : 'S/ Setor'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-normal text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                            {t.assignedAgentId 
                              ? (usersList.find((u) => u.id === t.assignedAgentId)?.name || 'Carregando...') 
                              : <span className="text-slate-400 dark:text-slate-600 italic">Fila</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap border ${
                              t.status === 'AGUARDANDO_ATENDIMENTO'
                                ? 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                : t.status === 'TRIAGEM'
                                ? 'bg-purple-50 text-purple-700 border-purple-250 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20'
                                : t.status === 'EM_ANDAMENTO'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            }`}>
                              {t.status === 'AGUARDANDO_ATENDIMENTO' 
                                ? 'Aguardando' 
                                : t.status === 'TRIAGEM' 
                                ? 'Triagem' 
                                : t.status === 'EM_ANDAMENTO'
                                ? 'Em andamento'
                                : 'Concluído'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-normal text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {new Date(t.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                // Navigate to chat and pass selected ticket ID in state
                                navigate('/chat', { state: { selectTicketId: t.id } });
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold shadow-md transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer whitespace-nowrap"
                            >
                              <MessageSquare size={11} />
                              Ver Conversa
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {historyPages > 1 && (
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm select-none">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Mostrando página <strong className="text-slate-800 dark:text-slate-100">{historyPage + 1}</strong> de <strong className="text-slate-800 dark:text-slate-100">{historyPages}</strong> ({historyTotal} registros)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={historyPage === 0 || historyLoading}
                  onClick={() => loadHistoryTickets(historyPage - 1)}
                  className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-350 transition-colors cursor-pointer"
                  title="Página Anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={historyPage >= historyPages - 1 || historyLoading}
                  onClick={() => loadHistoryTickets(historyPage + 1)}
                  className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-350 transition-colors cursor-pointer"
                  title="Próxima Página"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
