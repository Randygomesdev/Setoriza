import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { connectWebSocket, disconnectWebSocket } from '../services/websocket';
import {
  MessageSquare,
  Send,
  Check,
  Search,
  LogOut,
  Sun,
  Moon,
  ArrowRightLeft,
  User,
  Info,
  X,
  Clock,
  MessageCircle,
  Laptop,
  Camera,
  Archive,
  Settings
} from 'lucide-react';

export const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuthStore();
  const {
    tickets,
    sectors,
    activeTicketId,
    messagesByTicketId,
    loading,
    fetchTickets,
    fetchSectors,
    selectTicket,
    claimTicket,
    resolveTicket,
    transferTicket,
    sendOperatorMessage
  } = useChatStore();

  const [activeTab, setActiveTab] = useState<'aguardando' | 'meus' | 'concluidos'>('meus');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('ALL');
  const [transferSectorId, setTransferSectorId] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Sync isDarkMode with document classList for Tailwind's darkMode: 'class' strategy
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageAreaRef = useRef<HTMLDivElement>(null);

  // Initialize data and WebSocket connection
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    // Connect WebSocket for live events
    connectWebSocket(token);
    
    // Initial fetch
    fetchTickets();
    fetchSectors();

    // Poll tickets every 15s in case of websocket failure fallback
    const interval = setInterval(() => {
      fetchTickets();
    }, 15000);

    return () => {
      disconnectWebSocket();
      clearInterval(interval);
    };
  }, [token, navigate, fetchTickets, fetchSectors]);

  // Scroll to bottom of chat when messages change
  const activeMessages = activeTicketId ? messagesByTicketId[activeTicketId] || [] : [];
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Filter tickets based on tab, user role, user sectors, search term, and sector filter
  const getFilteredTickets = () => {
    if (!user) return [];

    return tickets.filter((ticket) => {
      // 1. Tab-based filtering:
      if (activeTab === 'aguardando') {
        if (user.role === 'USER') {
          const inAwaiting = ticket.status === 'AGUARDANDO_ATENDIMENTO' || ticket.status === 'TRIAGEM';
          const userHasSector = ticket.sector && user.sectors.includes(ticket.sector.friendlyName);
          if (!inAwaiting || !userHasSector) return false;
        } else {
          const isAwaiting = ticket.status === 'AGUARDANDO_ATENDIMENTO' || ticket.status === 'TRIAGEM' || ticket.status === 'IDENTIFICACAO_CNPJ' || ticket.status === 'IDENTIFICACAO_NOME';
          if (!isAwaiting) return false;
        }
      } else if (activeTab === 'meus') {
        const inProgress = ticket.status === 'EM_ANDAMENTO';
        const isAssignedToMe = ticket.assignedAgentId === user.id;
        if (!inProgress || !isAssignedToMe) return false;
      } else if (activeTab === 'concluidos') {
        const isConcluded = ticket.status === 'CONCLUIDO';
        if (!isConcluded) return false;
        
        // normal operators (USER) see completed tickets of their sectors or assigned to them
        if (user.role === 'USER') {
          const userHasSector = ticket.sector && user.sectors.includes(ticket.sector.friendlyName);
          const wasAssignedToMe = ticket.assignedAgentId === user.id;
          if (!userHasSector && !wasAssignedToMe) return false;
        }
      }

      // 2. Sector filter
      if (selectedSectorFilter !== 'ALL') {
        if (!ticket.sector || ticket.sector.id !== selectedSectorFilter) {
          return false;
        }
      }

      // 3. Search filter (client name or phone number)
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const clientNameMatch = ticket.clientName && ticket.clientName.toLowerCase().includes(query);
        const phoneMatch = ticket.whatsappNumber.includes(query);
        if (!clientNameMatch && !phoneMatch) return false;
      }

      return true;
    });
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTicketId || !messageText.trim()) return;

    const text = messageText;
    setMessageText('');
    await sendOperatorMessage(activeTicketId, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClaim = async (ticketId: string) => {
    await claimTicket(ticketId);
    // Switch to 'meus' tab to see claimed ticket
    setActiveTab('meus');
    selectTicket(ticketId);
  };

  const handleResolve = async (ticketId: string) => {
    if (confirm('Tem certeza de que deseja concluir este atendimento?')) {
      await resolveTicket(ticketId);
    }
  };

  const handleTransfer = async () => {
    if (!activeTicketId || !transferSectorId) return;
    const sectorName = sectors.find((s) => s.id === transferSectorId)?.friendlyName || '';
    if (confirm(`Deseja transferir o ticket selecionado para o setor ${sectorName}?`)) {
      await transferTicket(activeTicketId, transferSectorId);
      setTransferSectorId('');
    }
  };

  const activeTicket = tickets.find((t) => t.id === activeTicketId);
  const filteredTickets = getFilteredTickets();

  // Helper to format date
  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Determine channel icon based on WhatsApp number / details
  // In the future, this can be mapped to a channel attribute on the ticket
  const getChannelIcon = (number: string) => {
    if (number.startsWith('telegram:')) {
      return <Send className="h-4 w-4 text-sky-400" />;
    } else if (number.startsWith('instagram:')) {
      return <Camera className="h-4 w-4 text-pink-400" />;
    } else if (number.startsWith('web:')) {
      return <Laptop className="h-4 w-4 text-blue-400" />;
    }
    // Default is WhatsApp
    return <MessageCircle className="h-4 w-4 text-emerald-400" />;
  };

  return (
    <div className="h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans overflow-hidden">
      {/* COLUMN 1: LEFT SIDEBAR (TICKETS & USER) */}
      <div className="w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md">
        
        {/* User Profile Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center font-bold text-white shadow-md">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{user?.name}</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/40">
                {user?.role}
              </span>
            </div>
          </div>

          <div className="flex gap-1">
            {(user?.role === 'ADMIN' || user?.role === 'MASTER') && (
              <Link
                to="/admin"
                className="p-2 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                title="Painel Administrativo"
              >
                <Settings size={16} />
              </Link>
            )}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
              title="Alternar Tema"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-950/20 transition-colors"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 p-1 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 gap-1">
          <button
            onClick={() => setActiveTab('meus')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold tracking-wide transition-all flex items-center justify-center gap-1 ${
              activeTab === 'meus'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
            }`}
          >
            <MessageSquare size={12} />
            Ativos
          </button>
          <button
            onClick={() => setActiveTab('aguardando')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold tracking-wide transition-all relative flex items-center justify-center gap-1 ${
              activeTab === 'aguardando'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
            }`}
          >
            <Clock size={12} />
            Fila
            {tickets.filter(t => t.status === 'AGUARDANDO_ATENDIMENTO' || t.status === 'TRIAGEM').length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold rounded-full text-[9px] w-4 h-4 flex items-center justify-center border border-slate-950 animate-pulse">
                {tickets.filter(t => t.status === 'AGUARDANDO_ATENDIMENTO' || t.status === 'TRIAGEM').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('concluidos')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold tracking-wide transition-all flex items-center justify-center gap-1 ${
              activeTab === 'concluidos'
                ? 'bg-slate-650 dark:bg-slate-700 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
            }`}
          >
            <Archive size={12} />
            Fechados
          </button>
        </div>

        {/* Filters */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500 pointer-events-none">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Sector Filter Dropdown */}
          <select
            value={selectedSectorFilter}
            onChange={(e) => setSelectedSectorFilter(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">Todos os Setores</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.friendlyName}
              </option>
            ))}
          </select>
        </div>

        {/* Tickets Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40 bg-slate-50/10 dark:bg-slate-950/20">
          {loading && tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400 dark:text-slate-500 text-xs gap-2">
              <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Carregando chamados...</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              Nenhum chamado encontrado nesta aba.
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const isActive = ticket.id === activeTicketId;
              
              return (
                <div
                  key={ticket.id}
                  onClick={() => selectTicket(ticket.id)}
                  className={`p-4 cursor-pointer transition-all duration-200 border-l-4 select-none ${
                    isActive
                      ? 'bg-blue-600/5 dark:bg-blue-600/10 border-blue-500 bg-slate-100/80 dark:bg-slate-900/90 shadow-sm'
                      : 'hover:bg-slate-200/40 dark:hover:bg-slate-900/40 border-transparent bg-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getChannelIcon(ticket.whatsappNumber)}
                      <span className="font-semibold text-xs text-slate-700 dark:text-slate-200 truncate">
                        {ticket.clientName || 'Cliente em Triagem'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                      {/* Placeholder for real last message time */}
                      {formatTime(new Date().toISOString())}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-350 dark:border-slate-700/60 truncate">
                      {ticket.sector ? ticket.sector.friendlyName : 'S/ Setor'}
                    </span>

                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      ticket.status === 'AGUARDANDO_ATENDIMENTO'
                        ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                        : ticket.status === 'TRIAGEM'
                        ? 'bg-purple-950/60 text-purple-400 border border-purple-800/40'
                        : ticket.status === 'IDENTIFICACAO_CNPJ' || ticket.status === 'IDENTIFICACAO_NOME'
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : ticket.status === 'EM_ANDAMENTO'
                        ? 'bg-blue-950/60 text-blue-400 border border-blue-900/40'
                        : 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40'
                    }`}>
                      {ticket.status === 'AGUARDANDO_ATENDIMENTO' 
                        ? 'Aguardando' 
                        : ticket.status === 'TRIAGEM' 
                        ? 'Triagem' 
                        : ticket.status === 'IDENTIFICACAO_CNPJ' || ticket.status === 'IDENTIFICACAO_NOME'
                        ? 'Chatbot'
                        : ticket.status === 'EM_ANDAMENTO'
                        ? 'Em andamento'
                        : 'Concluído'}
                    </span>
                  </div>

                  {ticket.status !== 'EM_ANDAMENTO' && ticket.status !== 'CONCLUIDO' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClaim(ticket.id);
                      }}
                      className="mt-3 w-full py-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all"
                    >
                      Capturar Chamado
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* COLUMN 2: CENTER SECTION (CHAT AREA) */}
      <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 relative">
        
        {/* Active Ticket Header */}
        {activeTicket ? (
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900/40 backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {activeTicket.clientName || 'Cliente em Identificação'}
                </h2>
                {getChannelIcon(activeTicket.whatsappNumber)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {activeTicket.whatsappNumber} 
                {activeTicket.sector && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-blue-600 dark:text-blue-400">{activeTicket.sector.friendlyName}</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeTicket.status !== 'EM_ANDAMENTO' && activeTicket.status !== 'CONCLUIDO' ? (
                <button
                  onClick={() => handleClaim(activeTicket.id)}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-md transition-all"
                >
                  Capturar Chamado
                </button>
              ) : activeTicket.status === 'EM_ANDAMENTO' && activeTicket.assignedAgentId === user?.id ? (
                <button
                  onClick={() => handleResolve(activeTicket.id)}
                  className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-md flex items-center gap-1 transition-all"
                >
                  <Check size={14} />
                  Concluir Chamado
                </button>
              ) : activeTicket.status === 'CONCLUIDO' ? (
                <button
                  onClick={() => handleClaim(activeTicket.id)}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-md transition-all"
                >
                  Reabrir Chamado
                </button>
              ) : null}

              <button
                onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                title="Detalhes do Cliente"
              >
                <Info size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/10">
            <h2 className="font-bold text-sm text-slate-400 dark:text-slate-500">Nenhum atendimento selecionado</h2>
          </div>
        )}

        {/* Messages Scrollable Area */}
        <div 
          ref={messageAreaRef} 
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-opacity-5 dark:bg-slate-950"
        >
          {!activeTicketId ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
              <div className="h-16 w-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-3xl mb-4 border border-slate-200 dark:border-slate-800 shadow-lg text-slate-400">
                💬
              </div>
              <h3 className="font-bold text-slate-700 dark:text-slate-400 text-sm">Pronto para Atender</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Selecione um chamado na barra lateral para começar a responder as mensagens em tempo real.
              </p>
            </div>
          ) : activeMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
              Nenhuma mensagem no histórico.
            </div>
          ) : (
            activeMessages.map((msg) => {
              const isMe = msg.senderType === 'COLABORADOR';
              const isSystem = msg.senderType === 'SISTEMA';

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <span className="bg-slate-200/80 dark:bg-slate-900/60 border border-slate-300/80 dark:border-slate-800/60 text-slate-600 dark:text-slate-400 text-[10px] px-3 py-1 rounded-full font-medium tracking-wide">
                      ⚙️ {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md flex flex-col ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-none'
                    }`}
                  >
                    <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <span
                      className={`text-[9px] mt-1.5 self-end font-semibold ${
                        isMe ? 'text-blue-200' : 'text-slate-450 dark:text-slate-500'
                      }`}
                    >
                      {formatTime(msg.sentAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        {activeTicketId && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 backdrop-blur-md">
            {activeTicket?.status !== 'EM_ANDAMENTO' ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 rounded-xl text-center text-[11px] text-amber-700 dark:text-amber-300">
                Você precisa <strong>capturar o chamado</strong> para habilitar as respostas humanas.
              </div>
            ) : activeTicket?.assignedAgentId !== user?.id ? (
              <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-[11px] text-slate-500 dark:text-slate-400">
                Este chamado está sendo atendido por outro colaborador.
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex gap-2 items-end">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escreva sua resposta... (Pressione Enter para enviar)"
                  rows={1}
                  className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none min-h-[40px] max-h-[120px]"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-xl shadow-md transition-all shrink-0"
                >
                  <Send size={16} />
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* COLUMN 3: RIGHT DETAILS PANEL */}
      {activeTicket && showDetailsPanel && (
        <div className="w-72 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 backdrop-blur-md flex flex-col p-5 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Detalhes do Ticket</h3>
            <button
              onClick={() => setShowDetailsPanel(false)}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-805 dark:hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          {/* Client Metadata Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-450 dark:text-slate-400">
                <User size={18} />
              </div>
              <div>
                <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  {activeTicket.clientName || 'Em Identificação'}
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">{activeTicket.whatsappNumber}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">ID do Ticket:</span>
                <span className="font-mono text-slate-600 dark:text-slate-400 text-[9px] truncate w-32 text-right">{activeTicket.id}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Setor Atual:</span>
                <span className="font-semibold text-blue-400">
                  {activeTicket.sector ? activeTicket.sector.friendlyName : 'Não definido'}
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Canal:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">WhatsApp</span>
              </div>
            </div>
          </div>

          {/* Transfer Sector Form */}
          {activeTicket.status === 'EM_ANDAMENTO' && activeTicket.assignedAgentId === user?.id && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ArrowRightLeft size={12} />
                Transferir Setor
              </h4>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Envie o cliente para a fila de outro setor especializado.
              </p>
              
              <div className="space-y-2">
                <select
                  value={transferSectorId}
                  onChange={(e) => setTransferSectorId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Selecione o Setor...</option>
                  {sectors
                    .filter((s) => !activeTicket.sector || s.id !== activeTicket.sector.id)
                    .map((sector) => (
                      <option key={sector.id} value={sector.id}>
                        {sector.friendlyName}
                      </option>
                    ))}
                </select>

                <button
                  onClick={handleTransfer}
                  disabled={!transferSectorId}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-400 dark:disabled:text-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-lg border border-slate-250 dark:border-slate-700/60 shadow-sm transition-all"
                >
                  Confirmar Transferência
                </button>
              </div>
            </div>
          )}

          {/* Action List */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 flex-1 flex flex-col justify-end">
            {activeTicket.status === 'EM_ANDAMENTO' && activeTicket.assignedAgentId === user?.id && (
              <button
                onClick={() => handleResolve(activeTicket.id)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Check size={14} />
                Concluir Atendimento
              </button>
            )}
            
            {activeTicket.status === 'CONCLUIDO' && (
              <button
                onClick={() => handleClaim(activeTicket.id)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Clock size={14} />
                Reabrir Chamado
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default Chat;
