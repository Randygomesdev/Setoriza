import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useChatStore } from '../../../store/chatStore';
import { formatTime, getChannelIcon } from '../utils/chatHelpers';
import {
  MessageSquare,
  Search,
  LogOut,
  Sun,
  Moon,
  Clock,
  Archive,
  Settings,
  History,
  X
} from 'lucide-react';

interface ChatSidebarProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onViewModeChange: (mode: 'chat' | 'history') => void;
  onOpenCreateModal: () => void;
  onSelectTicket: (ticketId: string) => void;
  activeTab: 'aguardando' | 'meus' | 'concluidos';
  onActiveTabChange: (tab: 'aguardando' | 'meus' | 'concluidos') => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isDarkMode,
  onToggleTheme,
  onViewModeChange,
  onOpenCreateModal,
  onSelectTicket,
  activeTab,
  onActiveTabChange,
  searchTerm,
  onSearchTermChange
}) => {
  const { user, logout } = useAuthStore();
  const {
    tickets,
    sectors,
    activeTicketId,
    loading,
    wsConnected,
    claimTicket
  } = useChatStore();

  // Local UI States for filtering

  const [selectedSectorFilter, setSelectedSectorFilter] = useState('ALL');

  const handleLogout = () => {
    if (confirm('Deseja realmente sair do sistema?')) {
      logout();
    }
  };

  const handleClaim = async (ticketId: string) => {
    try {
      await claimTicket(ticketId);
    } catch (err: any) {
      // already handled by store alerts
    }
  };

  // Filter tickets based on tab, user role, user sectors, search term, and sector filter
  const getFilteredTickets = () => {
    if (!user) return [];

    return tickets.filter((ticket) => {
      // 1. Tab-based filtering:
      if (activeTab === 'aguardando') {
        if (user.role.toUpperCase() === 'USER') {
          const inAwaiting = ticket.status === 'AGUARDANDO_ATENDIMENTO' || ticket.status === 'TRIAGEM';
          const sector = ticket.sector;
          const userHasSector = sector && user.sectors.some((secName: string) => secName.toUpperCase() === sector.name.toUpperCase());
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

        // Limit closed tickets list to current day
        const dateStr = ticket.resolvedAt || ticket.updatedAt || ticket.createdAt;
        if (!dateStr) return false;
        const closedDate = new Date(dateStr);
        const today = new Date();
        const isToday = closedDate.getDate() === today.getDate() &&
                        closedDate.getMonth() === today.getMonth() &&
                        closedDate.getFullYear() === today.getFullYear();
        if (!isToday) return false;
        
        // Admins and Masters see all closed tickets of today, regardless of who was the operator (assignedAgentId) or sector!
        if (user.role.toUpperCase() === 'ADMIN' || user.role.toUpperCase() === 'MASTER') {
          // OK, no further check
        } else {
          // Normal operators see only their resolved tickets or tickets in their sectors
          const isAssignedToMe = ticket.assignedAgentId === user.id;
          const sector = ticket.sector;
          const userHasSector = sector && user.sectors.some((secName: string) => secName.toUpperCase() === sector.name.toUpperCase());
          if (!isAssignedToMe && !userHasSector) return false;
        }
      }

      // 2. Search term filter (Client name or WhatsApp Number)
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const clientNameMatch = ticket.clientName && ticket.clientName.toLowerCase().includes(term);
        const phoneMatch = ticket.whatsappNumber && ticket.whatsappNumber.includes(term);
        const companyNameMatch = ticket.client?.companyName && ticket.client.companyName.toLowerCase().includes(term);
        if (!clientNameMatch && !phoneMatch && !companyNameMatch) return false;
      }

      // 3. Sector filter dropdown
      if (selectedSectorFilter !== 'ALL') {
        if (!ticket.sector || ticket.sector.id !== selectedSectorFilter) {
          return false;
        }
      }

      return true;
    });
  };

  const filteredTickets = getFilteredTickets();

  return (
    <div className={`${activeTicketId ? 'hidden' : 'flex'} md:flex w-full md:w-96 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md h-full`}>
      
      {/* User Profile Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center font-bold text-white shadow-md">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
          </div>
          <div className="overflow-hidden">
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{user?.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/40">
                {user?.role}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-rose-500 animate-ping shadow-[0_0_8px_#f43f5e]'}`} />
              <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                {wsConnected ? 'On' : 'Off'}
              </span>
            </div>
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
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            title="Alternar Tema"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-950/20 transition-colors"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Tab Selection */}
      <div className="grid grid-cols-3 p-1 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 gap-1">
        <button
          onClick={() => onActiveTabChange('meus')}
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
          onClick={() => onActiveTabChange('aguardando')}
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
          onClick={() => onActiveTabChange('concluidos')}
          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold tracking-wide transition-all flex items-center justify-center gap-1 ${
            activeTab === 'concluidos'
              ? 'bg-slate-600 dark:bg-slate-700 text-white shadow-md'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
          }`}
        >
          <Archive size={12} />
          Fechados
        </button>
      </div>

      {/* Filters */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 mb-2 cursor-pointer select-none"
        >
          <MessageSquare size={13} />
          Novo Chamado
        </button>

        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchTermChange('')}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <select
          value={selectedSectorFilter}
          onChange={(e) => setSelectedSectorFilter(e.target.value)}
          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL">Todos os Setores</option>
          {sectors.map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.friendlyName}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => onViewModeChange('history')}
          className="w-full py-2 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1 select-none"
        >
          <History size={13} />
          Ver Histórico Completo
        </button>
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
                onClick={() => onSelectTicket(ticket.id)}
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
                      {ticket.client?.companyName ? ` (${ticket.client.companyName})` : ''}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                    {formatTime(ticket.updatedAt || ticket.createdAt || '')}
                  </span>
                </div>

                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-350 dark:border-slate-700/60 truncate max-w-[120px]">
                    {ticket.sector ? ticket.sector.friendlyName : 'S/ Setor'}
                  </span>

                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border ${
                    ticket.status === 'AGUARDANDO_ATENDIMENTO'
                      ? 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                      : ticket.status === 'TRIAGEM'
                      ? 'bg-purple-50 text-purple-700 border-purple-250 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20'
                      : ticket.status === 'IDENTIFICACAO_CNPJ' || ticket.status === 'IDENTIFICACAO_NOME'
                      ? 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20'
                      : ticket.status === 'EM_ANDAMENTO'
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
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
  );
};
