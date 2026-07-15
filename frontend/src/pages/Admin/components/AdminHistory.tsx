import React, { useState, useEffect } from 'react';
import { History, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../../services/api';
import { formatTime, formatPhoneNumber, getChannelIcon } from '../../Chat/utils/chatHelpers';

interface AdminHistoryProps {
  usersList: any[];
  sectorsList: any[];
}

export const AdminHistory: React.FC<AdminHistoryProps> = ({
  usersList,
  sectorsList
}) => {
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
    loadHistoryTickets(0);
  }, [
    histFilterClient,
    histFilterSector,
    histFilterAgent,
    histFilterStatus,
    histFilterStartDate,
    histFilterEndDate
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <History className="text-blue-500" size={24} />
          Histórico Geral de Chamados
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Consulte e filtre todos os atendimentos encerrados e ativos da plataforma.</p>
      </div>

      {/* Filter Card */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Filter Client */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cliente / Whatsapp</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              value={histFilterClient}
              onChange={(e) => setHistFilterClient(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* Filter Status */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</label>
          <select
            value={histFilterStatus}
            onChange={(e) => setHistFilterStatus(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">Todos</option>
            <option value="AGUARDANDO_ATENDIMENTO">Em Espera</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="CONCLUIDO">Concluído</option>
          </select>
        </div>

        {/* Filter Sector */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Setor</label>
          <select
            value={histFilterSector}
            onChange={(e) => setHistFilterSector(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">Todos os Setores</option>
            {sectorsList.map((s) => (
              <option key={s.id} value={s.id}>{s.friendlyName}</option>
            ))}
          </select>
        </div>

        {/* Filter Agent */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Atendente</label>
          <select
            value={histFilterAgent}
            onChange={(e) => setHistFilterAgent(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">Todos</option>
            {usersList.map((usr) => (
              <option key={usr.id} value={usr.id}>{usr.name}</option>
            ))}
          </select>
        </div>

        {/* Filter Date Start */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Data Início</label>
          <input
            type="date"
            value={histFilterStartDate}
            onChange={(e) => setHistFilterStartDate(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Filter Date End */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Data Fim</label>
          <input
            type="date"
            value={histFilterEndDate}
            onChange={(e) => setHistFilterEndDate(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* History table list (Desktop only) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3.5">Cliente</th>
                <th className="px-6 py-3.5">Telefone</th>
                <th className="px-6 py-3.5">Setor</th>
                <th className="px-6 py-3.5">Atendente</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Última Atualização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-350">
              {historyTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                  <td className="px-6 py-4 flex items-center gap-2">
                    {getChannelIcon(ticket.whatsappNumber)}
                    <span className="font-semibold text-slate-850 dark:text-slate-200">{ticket.clientName || 'Triagem'}</span>
                  </td>
                  <td className="px-6 py-4 font-mono">{formatPhoneNumber(ticket.whatsappNumber)}</td>
                  <td className="px-6 py-4">
                    {ticket.sector ? (
                      <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {ticket.sector.friendlyName}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px] italic">Sem setor</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                    {ticket.assignedAgent ? ticket.assignedAgent.name : 'Nenhum'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      ticket.status === 'CONCLUIDO'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-955/20 dark:text-rose-400 dark:border-rose-900/30'
                        : ticket.status === 'EM_ANDAMENTO'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-955/20 dark:text-amber-400'
                    }`}>
                      {ticket.status === 'CONCLUIDO' ? 'Finalizado' : ticket.status === 'EM_ANDAMENTO' ? 'Em Atendimento' : 'Em Espera'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 dark:text-slate-550 font-medium">
                    {formatTime(ticket.updatedAt || ticket.createdAt)}
                  </td>
                </tr>
              ))}
              {historyTickets.length === 0 && !historyLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum chamado encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
              {historyLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-450">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      Carregando dados...
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {historyPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 flex justify-between items-center text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Mostrando página <span className="font-semibold text-slate-700 dark:text-slate-200">{historyPage + 1}</span> de <span className="font-semibold text-slate-700 dark:text-slate-200">{historyPages}</span> ({historyTotal} registros)
            </span>

            <div className="flex gap-1.5">
              <button
                onClick={() => loadHistoryTickets(historyPage - 1)}
                disabled={historyPage === 0 || historyLoading}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 disabled:opacity-45 disabled:cursor-not-allowed text-slate-600 dark:text-slate-350 transition-colors"
                title="Página Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => loadHistoryTickets(historyPage + 1)}
                disabled={historyPage >= historyPages - 1 || historyLoading}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-955 disabled:opacity-45 disabled:cursor-not-allowed text-slate-600 dark:text-slate-350 transition-colors"
                title="Próxima Página"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History Cards (Mobile only) */}
      <div className="block md:hidden space-y-4">
        {historyTickets.map((ticket) => (
          <div 
            key={ticket.id}
            className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4"
          >
            {/* Header: Client info and Status */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                {getChannelIcon(ticket.whatsappNumber)}
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[180px]">
                  {ticket.clientName || 'Triagem'}
                </span>
              </div>
              
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                ticket.status === 'CONCLUIDO'
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-955/20 dark:text-rose-450 dark:border-rose-900/30'
                  : ticket.status === 'EM_ANDAMENTO'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-955/20 dark:text-amber-400'
              }`}>
                {ticket.status === 'CONCLUIDO' ? 'Finalizado' : ticket.status === 'EM_ANDAMENTO' ? 'Em Atendimento' : 'Em Espera'}
              </span>
            </div>

            {/* Details: Phone, Sector, Agent, Date */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Telefone:</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-350">{formatPhoneNumber(ticket.whatsappNumber)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Setor:</span>
                {ticket.sector ? (
                  <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {ticket.sector.friendlyName}
                  </span>
                ) : (
                  <span className="text-slate-400 text-[10px] italic">Sem setor</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Atendente:</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">{ticket.assignedAgent ? ticket.assignedAgent.name : 'Nenhum'}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-50 dark:border-slate-850/45">
                <span className="text-slate-400">Última Atualização:</span>
                <span className="font-medium text-slate-400 dark:text-slate-500">{formatTime(ticket.updatedAt || ticket.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}

        {historyTickets.length === 0 && !historyLoading && (
          <div className="py-8 text-center text-slate-500 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            Nenhum chamado encontrado para os filtros selecionados.
          </div>
        )}
        
        {historyLoading && (
          <div className="py-8 text-center text-slate-450 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="flex items-center justify-center gap-1.5">
              <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              Carregando dados...
            </div>
          </div>
        )}

        {/* Mobile Pagination */}
        {historyPages > 1 && (
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex justify-between items-center text-xs">
            <span className="text-slate-500">
              Pág. {historyPage + 1}/{historyPages}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => loadHistoryTickets(historyPage - 1)}
                disabled={historyPage === 0 || historyLoading}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 disabled:opacity-45 text-slate-600 dark:text-slate-350"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => loadHistoryTickets(historyPage + 1)}
                disabled={historyPage >= historyPages - 1 || historyLoading}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-955 disabled:opacity-45 text-slate-650 dark:text-slate-350"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
