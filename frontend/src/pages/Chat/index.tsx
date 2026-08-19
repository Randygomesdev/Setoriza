import React, { useEffect, useState } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useToast } from '../../context/ToastContext';
import { connectWebSocket, disconnectWebSocket } from '../../services/websocket';
import { api } from '../../services/api';
import { requestNotificationPermission } from '../../services/notification';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatArea } from './components/ChatArea';
import { ChatDetails } from './components/ChatDetails';
import { formatPhoneNumber } from './utils/chatHelpers';
import {
  MessageSquare,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  History
} from 'lucide-react';

export const Chat: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const { user, token, isAuthenticated, isDarkMode, toggleTheme } = useAuthStore();
  const {
    tickets,
    sectors,
    fetchTickets,
    fetchSectors,
    selectTicket,
    createTicket
  } = useChatStore();




  const [activeTab, setActiveTab] = useState<'aguardando' | 'meus' | 'concluidos'>('meus');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTicketPhone, setNewTicketPhone] = useState('');
  const [newTicketName, setNewTicketName] = useState('');
  const [newTicketSectorId, setNewTicketSectorId] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [contactSearchInput, setContactSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'history'>('chat');
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
  const [isViewingFromHistory, setIsViewingFromHistory] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);



  // Initialize data and WebSocket connection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Connect WebSocket for live events
    connectWebSocket(token || '');
    
    // Initial fetch
    fetchTickets();
    fetchSectors();
    requestNotificationPermission();

    const loadUsers = async () => {
      try {
        const data = await api.users.list();
        setUsersList(data);
      } catch (err) {
        console.error("Erro ao listar usuários:", err);
      }
    };
    const loadContacts = async () => {
      try {
        const data = await api.clients.listContacts();
        setContactsList(data);
      } catch (err) {
        console.error("Erro ao listar contatos:", err);
      }
    };
    loadUsers();
    loadContacts();

    // Poll tickets every 15s in case of websocket failure fallback
    const interval = setInterval(() => {
      fetchTickets();
    }, 15000);

    return () => {
      disconnectWebSocket();
      clearInterval(interval);
    };
  }, [token, navigate, fetchTickets, fetchSectors]);

  useEffect(() => {
    const state = location.state as { selectTicketId?: string } | null;
    if (state?.selectTicketId) {
      const ticket = tickets.find(t => t.id === state.selectTicketId);
      if (ticket) {
        if (ticket.status === 'CONCLUIDO') {
          setActiveTab('concluidos');
        } else if (ticket.status === 'EM_ANDAMENTO') {
          if (ticket.assignedAgentId === user?.id) {
            setActiveTab('meus');
          } else {
            setActiveTab('aguardando');
          }
        } else {
          setActiveTab('aguardando');
        }
        selectTicket(state.selectTicketId);
        setIsViewingFromHistory(true);
      } else {
        selectTicket(state.selectTicketId);
        setIsViewingFromHistory(true);
      }
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, tickets, user, selectTicket, navigate]);

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
    if (viewMode === 'history') {
      loadHistoryTickets(0);
    }
  }, [
    viewMode,
    histFilterClient,
    histFilterSector,
    histFilterAgent,
    histFilterStatus,
    histFilterStartDate,
    histFilterEndDate
  ]);

  // Scroll to bottom of chat when messages change
















  return (
    <div className="h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans overflow-hidden">
      {viewMode === 'history' ? (
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto p-8 animate-fadeIn">
          <div className="w-full mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <History className="text-blue-500" size={24} />
                  Histórico de Chamados
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Consulte e filtre todos os atendimentos encerrados e ativos da plataforma.
                </p>
              </div>
              <button
                onClick={() => setViewMode('chat')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all select-none cursor-pointer"
              >
                Voltar para o Chat
              </button>
            </div>

            {/* Smart Filters Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
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
                  {sectors.map((s) => (
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
                  disabled={user?.role.toUpperCase() === 'USER'}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {user?.role.toUpperCase() === 'USER' ? (
                    <option value={user.id}>{user.name}</option>
                  ) : (
                    <>
                      <option value="">Todos os Atendentes</option>
                      {usersList.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </>
                  )}
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

            {/* History Table (Desktop only) */}
            <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm hidden md:block">
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
                      <tr className="bg-slate-50/50 dark:bg-slate-950/40 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 select-none whitespace-nowrap">
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
                        const isClosed = t.status === 'CONCLUIDO';
                        
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="px-6 py-4 font-mono font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                              <span>#{shortId}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(t.id);
                                  addToast({ type: 'success', title: 'Copiado', message: 'ID completo copiado para a área de transferência!' });
                                }}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                title="Copiar ID Completo"
                              >
                                <Clipboard size={10} />
                              </button>
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[150px]">
                              {t.client?.tradeName || t.client?.companyName || 'Avulso/S. Cadastro'}
                            </td>
                            <td className="px-6 py-4 font-normal text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                              {t.clientName || 'Desconhecido'}
                            </td>
                            <td className="px-6 py-4 font-normal text-slate-800 dark:text-slate-200 whitespace-nowrap">{formatPhoneNumber(t.whatsappNumber)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
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
                                  // Switch to chat view
                                  setViewMode('chat');
                                  // Switch to closed/active tab based on ticket status
                                  if (isClosed) {
                                    setActiveTab('concluidos');
                                  } else {
                                    if (t.assignedAgentId === user?.id) {
                                      setActiveTab('meus');
                                    } else {
                                      setActiveTab('aguardando');
                                    }
                                  }
                                  // Select the ticket in the chat area
                                  selectTicket(t.id);
                                  setIsViewingFromHistory(true);
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

            {/* History Cards (Mobile only) */}
            <div className="block md:hidden space-y-4">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500 text-xs bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl gap-3">
                  <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Pesquisando histórico...</span>
                </div>
              ) : historyTickets.length === 0 ? (
                <div className="p-12 text-center text-slate-455 dark:text-slate-500 text-xs italic bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl">
                  Nenhum chamado encontrado com os filtros selecionados.
                </div>
              ) : (
                historyTickets.map((t) => {
                  const shortId = t.id.substring(0, 8).toUpperCase();
                  const isClosed = t.status === 'CONCLUIDO';
                  const agentName = t.assignedAgentId 
                    ? (usersList.find((u) => u.id === t.assignedAgentId)?.name || 'Carregando...') 
                    : 'Fila';

                  return (
                    <div 
                      key={t.id}
                      className="p-5 bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-3.5"
                    >
                      {/* Header: ID, Client, Status */}
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500">#{shortId}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[180px] mt-0.5">
                            {t.client?.tradeName || t.client?.companyName || 'Avulso/S. Cadastro'}
                          </span>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                          t.status === 'AGUARDANDO_ATENDIMENTO'
                            ? 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                            : t.status === 'TRIAGEM'
                            ? 'bg-purple-50 text-purple-700 border-purple-250 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20'
                            : t.status === 'EM_ANDAMENTO'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-550/10 dark:text-blue-400 dark:border-blue-500/20'
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
                      </div>

                      {/* Details: Contact, Phone, Sector, Agent, Date */}
                      <div className="space-y-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Contato:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-350">{t.clientName || 'Desconhecido'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">WhatsApp:</span>
                          <span className="font-mono font-semibold text-slate-750 dark:text-slate-300">{formatPhoneNumber(t.whatsappNumber)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Setor:</span>
                          <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {t.sector ? t.sector.friendlyName : 'S/ Setor'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Atendente:</span>
                          <span className="font-semibold text-slate-750 dark:text-slate-300">{agentName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Abertura:</span>
                          <span className="text-slate-400 dark:text-slate-500">{new Date(t.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Action button */}
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('chat');
                          if (isClosed) {
                            setActiveTab('concluidos');
                          } else {
                            if (t.assignedAgentId === user?.id) {
                              setActiveTab('meus');
                            } else {
                              setActiveTab('aguardando');
                            }
                          }
                          selectTicket(t.id);
                          setIsViewingFromHistory(true);
                        }}
                        className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare size={13} />
                        Ver Conversa
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {historyPages > 1 && (
              <div className="flex justify-between items-center bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm select-none">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Mostrando página <strong className="text-slate-800 dark:text-slate-100">{historyPage + 1}</strong> de <strong className="text-slate-800 dark:text-slate-100">{historyPages}</strong> ({historyTotal} registros)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={historyPage === 0 || historyLoading}
                    onClick={() => loadHistoryTickets(historyPage - 1)}
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-350 transition-colors"
                    title="Página Anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={historyPage >= historyPages - 1 || historyLoading}
                    onClick={() => loadHistoryTickets(historyPage + 1)}
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-350 transition-colors"
                    title="Próxima Página"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <ChatSidebar
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
            onViewModeChange={setViewMode}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onSelectTicket={(ticketId) => {
              setIsViewingFromHistory(false);
              selectTicket(ticketId);
            }}
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
          />

      {/* COLUMN 2: CENTER SECTION (CHAT AREA) */}
      <ChatArea
        usersList={usersList}
        isViewingFromHistory={isViewingFromHistory}
        onImageClick={setPreviewImageUrl}
        onViewModeChange={setViewMode}
        showDetailsPanel={showDetailsPanel}
        onToggleDetails={() => setShowDetailsPanel(!showDetailsPanel)}
      />

      {/* COLUMN 3: RIGHT DETAILS PANEL */}
      <ChatDetails
        usersList={usersList}
        showDetailsPanel={showDetailsPanel}
        onCloseDetails={() => setShowDetailsPanel(false)}
        onImageClick={setPreviewImageUrl}
      />
      </>)}

      {/* New Ticket Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div 
            className="w-[380px] bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              className="absolute top-4 right-4 p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors select-none cursor-pointer"
              onClick={() => {
                setIsCreateModalOpen(false);
                setNewTicketPhone('');
                setNewTicketName('');
                setNewTicketSectorId('');
                setContactSearchInput('');
                setShowSuggestions(false);
              }}
              type="button"
            >
              <X size={16} />
            </button>
            
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={16} className="text-blue-500" />
                Abrir Novo Chamado
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                Preencha os dados abaixo para iniciar um atendimento ativo via WhatsApp.
              </p>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newTicketPhone.trim() || !newTicketName.trim() || !newTicketSectorId) return;
                setIsCreatingTicket(true);
                try {
                  const created = await createTicket(newTicketPhone, newTicketName, newTicketSectorId);
                  setIsCreateModalOpen(false);
                  setNewTicketPhone('');
                  setNewTicketName('');
                  setNewTicketSectorId('');
                  setContactSearchInput('');
                  setShowSuggestions(false);
                  setSearchTerm('');
                  selectTicket(created.id);
                } catch (err) {
                  // error already handled by store alert
                } finally {
                  setIsCreatingTicket(false);
                }
              }}
              className="space-y-3.5 relative"
            >
              {/* Autocomplete Search Field */}
              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Buscar Contato Salvo (Opcional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Digite o nome para buscar..."
                    value={contactSearchInput}
                    onChange={(e) => {
                      setContactSearchInput(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  {contactSearchInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setContactSearchInput('');
                        setNewTicketPhone('');
                        setNewTicketName('');
                        setShowSuggestions(false);
                      }}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:text-slate-505 dark:hover:text-slate-350 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && contactSearchInput.trim() && (
                  <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl shadow-xl max-h-[160px] overflow-y-auto custom-scrollbar">
                    {contactsList
                      .filter((c) =>
                        c.contactName.toLowerCase().includes(contactSearchInput.toLowerCase()) ||
                        (c.tradeName && c.tradeName.toLowerCase().includes(contactSearchInput.toLowerCase())) ||
                        (c.companyName && c.companyName.toLowerCase().includes(contactSearchInput.toLowerCase()))
                      )
                      .slice(0, 5)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewTicketPhone(c.whatsappNumber);
                            setNewTicketName(c.contactName);
                            setContactSearchInput(`${c.contactName} (${c.tradeName || c.companyName})`);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-850 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 last:border-b-0 flex flex-col cursor-pointer"
                        >
                          <span className="font-semibold">{c.contactName}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            Empresa: {c.tradeName || c.companyName} | WhatsApp: {c.whatsappNumber}
                          </span>
                        </button>
                      ))}
                    {contactsList.filter((c) =>
                      c.contactName.toLowerCase().includes(contactSearchInput.toLowerCase()) ||
                      (c.tradeName && c.tradeName.toLowerCase().includes(contactSearchInput.toLowerCase())) ||
                      (c.companyName && c.companyName.toLowerCase().includes(contactSearchInput.toLowerCase()))
                    ).length === 0 && (
                      <div className="px-3.5 py-3 text-xs text-slate-500 dark:text-slate-400 italic">
                        Nenhum contato encontrado.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Phone Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  WhatsApp do Cliente (Apenas números)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 5527998349791"
                  value={newTicketPhone}
                  onChange={(e) => setNewTicketPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Name Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Nome do Cliente / Contato
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carol Silva"
                  value={newTicketName}
                  onChange={(e) => setNewTicketName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Sector Selection Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Setor do Atendimento
                </label>
                <select
                  required
                  value={newTicketSectorId}
                  onChange={(e) => setNewTicketSectorId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Selecione o Setor...</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.friendlyName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setNewTicketPhone('');
                    setNewTicketName('');
                    setNewTicketSectorId('');
                    setContactSearchInput('');
                    setShowSuggestions(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-750 transition-all select-none cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTicket || !newTicketPhone.trim() || !newTicketName.trim() || !newTicketSectorId}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer"
                >
                  {isCreatingTicket ? 'Abrindo...' : 'Abrir Chamado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Zoom Preview Modal */}
      <ImagePreviewModal
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />
    </div>
  );
};
export default Chat;
