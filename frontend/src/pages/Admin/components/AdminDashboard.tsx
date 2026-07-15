import React from 'react';
import { Activity, Clock, Settings, FolderOpen, CheckCircle } from 'lucide-react';
import { formatDuration } from '../utils/adminHelpers';

interface AdminDashboardProps {
  ticketsList: any[];
  sectorsList: any[];
  slaMetrics: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  ticketsList,
  sectorsList,
  slaMetrics
}) => {
  const totalTickets = ticketsList.length;
  const awaitingTickets = ticketsList.filter(t => t.status === 'AGUARDANDO_ATENDIMENTO' || t.status === 'TRIAGEM').length;
  const inProgressTickets = ticketsList.filter(t => t.status === 'EM_ANDAMENTO').length;
  const concludedTickets = ticketsList.filter(t => t.status === 'CONCLUIDO').length;
  const chatbotTickets = ticketsList.filter(t => t.status === 'IDENTIFICACAO_CNPJ' || t.status === 'IDENTIFICACAO_NOME').length;

  return (
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
                    <span>{count} ({Math.round(percentage)}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-550" 
                      style={{ width: `${percentage}%` }}
                    />
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
          
          <div className="flex flex-col items-center justify-center py-3 space-y-2">
            <div className={`h-24 w-24 rounded-full border-[6px] ${
              slaMetrics && slaMetrics.overallPercentageWithinSla >= 80 ? 'border-emerald-500' : 'border-amber-500'
            } border-t-slate-200 dark:border-t-slate-800 flex flex-col items-center justify-center shadow`}>
              <span className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                {slaMetrics ? `${Math.round(slaMetrics.overallPercentageWithinSla)}%` : '-'}
              </span>
              <span className="text-[7.5px] uppercase font-bold text-slate-400 tracking-wider">Dentro SLA</span>
            </div>
            <p className="text-[10px] text-slate-400 text-center max-w-[180px] leading-relaxed">
              Meta de performance global: manter acima de <span className="font-bold text-emerald-500">80%</span>.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-3 text-center">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400">Tempo de Fila</span>
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                {slaMetrics ? formatDuration(slaMetrics.averageQueueTimeSeconds) : '-'}
              </h4>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400">Tempo de Atend.</span>
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                {slaMetrics ? formatDuration(slaMetrics.averageResolutionTimeSeconds) : '-'}
              </h4>
            </div>
          </div>
        </div>

        {/* SLA Sector breakdown */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">SLA por Setor</h3>
          <div className="space-y-3.5">
            {sectorsList.map(sector => {
              const sectorMetric = slaMetrics?.sectorMetrics?.[sector.name.toUpperCase()];
              const percentage = sectorMetric ? sectorMetric.percentageWithinSla : 100;
              const hasTickets = sectorMetric ? sectorMetric.totalTicketsCount > 0 : false;
              
              return (
                <div key={sector.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>{sector.friendlyName}</span>
                    <span className={percentage >= 80 ? 'text-emerald-500' : 'text-amber-500'}>
                      {hasTickets ? `${Math.round(percentage)}%` : 'Sem chamados'}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${percentage >= 80 ? 'bg-emerald-500' : 'bg-amber-500'} rounded-full transition-all`} 
                      style={{ width: `${hasTickets ? percentage : 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {sectorsList.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">Nenhum setor cadastrado no banco.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
