import React from 'react';
import {
  Activity,
  Server,
  Database,
  UploadCloud
} from 'lucide-react';

export const MasterStatus: React.FC = () => {
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
