import React, { useState } from 'react';
import { Plus, X, FolderOpen, AlertTriangle } from 'lucide-react';
import { api } from '../../../services/api';
import { formatTechnicalName } from '../utils/adminHelpers';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';

interface AdminSectorsProps {
  sectorsList: any[];
  onRefresh: () => Promise<void>;
  setError: (err: string | null) => void;
}

export const AdminSectors: React.FC<AdminSectorsProps> = ({
  sectorsList,
  onRefresh,
  setError
}) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [searchSector, setSearchSector] = useState('');
  const [isSectorDrawerOpen, setIsSectorDrawerOpen] = useState(false);
  const [sectorSuccessMsg, setSectorSuccessMsg] = useState('');
  
  const [newSector, setNewSector] = useState({
    name: '',
    friendlyName: '',
    slaLimitMinutes: 15,
    active: true,
    autoCloseEnabled: false,
    autoCloseTimeoutMinutes: 60,
    autoCloseWarningMinutes: 15,
    autoCloseWarningMessage: 'Olá! Seu atendimento está inativo e será encerrado automaticamente em alguns instantes.',
  });
  
  const [editingSector, setEditingSector] = useState<any | null>(null);

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSectorSuccessMsg('');
    try {
      await api.sectors.create({
        name: formatTechnicalName(newSector.friendlyName),
        friendlyName: newSector.friendlyName,
        active: newSector.active,
        slaLimitMinutes: parseInt(newSector.slaLimitMinutes.toString(), 10) || 15,
        autoCloseEnabled: newSector.autoCloseEnabled,
        autoCloseTimeoutMinutes: newSector.autoCloseTimeoutMinutes,
        autoCloseWarningMinutes: newSector.autoCloseWarningMinutes,
        autoCloseWarningMessage: newSector.autoCloseWarningMessage
      });
      setSectorSuccessMsg('Novo setor cadastrado com sucesso!');
      setNewSector({
        name: '',
        friendlyName: '',
        slaLimitMinutes: 15,
        active: true,
        autoCloseEnabled: false,
        autoCloseTimeoutMinutes: 60,
        autoCloseWarningMinutes: 15,
        autoCloseWarningMessage: 'Olá! Seu atendimento está inativo e será encerrado automaticamente em alguns instantes.',
      });
      await onRefresh();
      setTimeout(() => {
        setIsSectorDrawerOpen(false);
        setSectorSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar setor');
    }
  };

  const handleUpdateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSectorSuccessMsg('');
    if (!editingSector) return;
    try {
      await api.sectors.update(editingSector.id, {
        name: editingSector.name,
        friendlyName: editingSector.friendlyName,
        active: editingSector.active,
        slaLimitMinutes: parseInt(editingSector.slaLimitMinutes.toString(), 10) || 15,
        autoCloseEnabled: editingSector.autoCloseEnabled,
        autoCloseTimeoutMinutes: editingSector.autoCloseTimeoutMinutes,
        autoCloseWarningMinutes: editingSector.autoCloseWarningMinutes,
        autoCloseWarningMessage: editingSector.autoCloseWarningMessage
      });
      setSectorSuccessMsg('Configurações do setor atualizadas com sucesso!');
      await onRefresh();
      setTimeout(() => {
        setIsSectorDrawerOpen(false);
        setEditingSector(null);
        setSectorSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar setor');
    }
  };

  const handleDeleteSector = async (id: string) => {
    const confirmed = await confirm({
      title: 'Desativar Setor',
      message: 'Deseja realmente desativar este setor?',
      confirmText: 'Desativar',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (!confirmed) return;
    setError(null);
    try {
      await api.sectors.delete(id);
      await onRefresh();
      addToast({ type: 'success', title: 'Setor Desativado', message: 'Setor desativado com sucesso!' });
    } catch (err: any) {
      const errMsg = err.message || 'Erro ao desativar setor';
      setError(errMsg);
      addToast({ type: 'error', title: 'Erro ao desativar', message: errMsg });
    }
  };

  const filteredSectors = sectorsList.filter((sect) => {
    const q = searchSector.toLowerCase();
    return (
      sect.name.toLowerCase().includes(q) ||
      sect.friendlyName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-850 dark:text-slate-100">Setores de Atendimento e SLA</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure os setores, limites máximos de SLA e regras de fechamento automático por inatividade.</p>
        </div>
        <button
          onClick={() => {
            setEditingSector(null);
            setSectorSuccessMsg('');
            setIsSectorDrawerOpen(true);
          }}
          className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
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
          className="w-full md:w-80 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
        />
      </div>
      <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3.5">Nome Amigável</th>
                <th className="px-6 py-3.5">Nome Técnico (Código)</th>
                <th className="px-6 py-3.5">SLA Fila (Máximo)</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Auto Fechamento</th>
                <th className="px-6 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-350">
              {filteredSectors.map((sect) => (
                <tr key={sect.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-emerald-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center uppercase">
                      {sect.friendlyName.slice(0, 2)}
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{sect.friendlyName}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-[10px] text-slate-500 dark:text-slate-450">{sect.name}</td>
                  <td className="px-6 py-4">
                    <span className="font-semibold">{sect.slaLimitMinutes} minutos</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      sect.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-500/20'
                        : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}>
                      {sect.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {sect.autoCloseEnabled ? (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                        Sim ({sect.autoCloseTimeoutMinutes}m)
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-455 text-[10px]">Não</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button
                      onClick={() => {
                        setEditingSector({
                          id: sect.id,
                          name: sect.name,
                          friendlyName: sect.friendlyName,
                          active: sect.active,
                          slaLimitMinutes: sect.slaLimitMinutes,
                          autoCloseEnabled: sect.autoCloseEnabled || false,
                          autoCloseTimeoutMinutes: sect.autoCloseTimeoutMinutes || 60,
                          autoCloseWarningMinutes: sect.autoCloseWarningMinutes || 15,
                          autoCloseWarningMessage: sect.autoCloseWarningMessage || 'Olá! Seu atendimento está inativo e será encerrado automaticamente em alguns instantes.',
                        });
                        setSectorSuccessMsg('');
                        setIsSectorDrawerOpen(true);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-500 font-bold hover:underline transition-all"
                    >
                      Editar
                    </button>
                    {sect.active && (
                      <button
                        onClick={() => handleDeleteSector(sect.id)}
                        className="text-xs text-rose-600 hover:text-rose-500 font-bold hover:underline transition-all"
                      >
                        Desativar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredSectors.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    {searchSector ? 'Nenhum setor de atendimento encontrado para esta busca.' : 'Nenhum setor cadastrado no banco.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sectors Cards (Mobile only) */}
      <div className="block md:hidden space-y-4">
        {filteredSectors.map((sect) => (
          <div 
            key={sect.id}
            className="p-5 bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4"
          >
            {/* Header: Avatar, Name and Status */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 text-blue-600 dark:text-blue-400 font-extrabold flex items-center justify-center uppercase shadow-sm">
                  {sect.friendlyName.slice(0, 2)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[180px]">
                    {sect.friendlyName}
                  </h4>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 font-mono mt-0.5">
                    {sect.name}
                  </p>
                </div>
              </div>
              
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                sect.active
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/20'
                  : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              }`}>
                {sect.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            {/* SLA and Auto-close Details */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-150 dark:border-slate-800/60 text-xs">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">SLA Fila</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{sect.slaLimitMinutes} minutos</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Auto Fechamento</span>
                {sect.autoCloseEnabled ? (
                  <span className="font-bold text-blue-600 dark:text-blue-400">Ativo ({sect.autoCloseTimeoutMinutes}m)</span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">Inativo</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingSector({
                    id: sect.id,
                    name: sect.name,
                    friendlyName: sect.friendlyName,
                    active: sect.active,
                    slaLimitMinutes: sect.slaLimitMinutes,
                    autoCloseEnabled: sect.autoCloseEnabled || false,
                    autoCloseTimeoutMinutes: sect.autoCloseTimeoutMinutes || 60,
                    autoCloseWarningMinutes: sect.autoCloseWarningMinutes || 15,
                    autoCloseWarningMessage: sect.autoCloseWarningMessage || 'Olá! Seu atendimento está inativo e será encerrado automaticamente em alguns instantes.',
                  });
                  setSectorSuccessMsg('');
                  setIsSectorDrawerOpen(true);
                }}
                className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-blue-600 dark:text-blue-400 font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Editar
              </button>
              {sect.active && (
                <button
                  type="button"
                  onClick={() => handleDeleteSector(sect.id)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-rose-600 dark:text-rose-455 font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  Desativar
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredSectors.length === 0 && (
          <div className="py-8 text-center text-slate-500 text-xs bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl">
            {searchSector ? 'Nenhum setor de atendimento encontrado para esta busca.' : 'Nenhum setor cadastrado no banco.'}
          </div>
        )}
      </div>

      {/* Sliding Drawer for Sectors */}
      {isSectorDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end"
          onClick={() => setIsSectorDrawerOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md h-full border-l border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-y-auto flex flex-col space-y-4 animate-in slide-in-from-right duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen size={16} className="text-blue-500" />
                {editingSector ? 'Editar Setor' : 'Novo Setor de Atendimento'}
              </h3>
              <button 
                onClick={() => setIsSectorDrawerOpen(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {sectorSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-450 text-center">
                {sectorSuccessMsg}
              </div>
            )}

            <form onSubmit={editingSector ? handleUpdateSector : handleCreateSector} className="space-y-4 flex-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Nome Comercial</label>
                <input 
                  type="text"
                  required
                  value={editingSector ? editingSector.friendlyName : newSector.friendlyName}
                  onChange={(e) => {
                    if (editingSector) setEditingSector({ ...editingSector, friendlyName: e.target.value });
                    else setNewSector({ ...newSector, friendlyName: e.target.value });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ex: Comercial, Suporte Premium, TI"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Tempo Máximo de Espera na Fila (SLA em minutos)</label>
                <input 
                  type="number"
                  required
                  min={1}
                  value={editingSector ? editingSector.slaLimitMinutes : newSector.slaLimitMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 15;
                    if (editingSector) setEditingSector({ ...editingSector, slaLimitMinutes: val });
                    else setNewSector({ ...newSector, slaLimitMinutes: val });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ex: 15"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl select-none">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Fila Ativa</span>
                  <p className="text-[10px] text-slate-400 leading-normal">Se o setor está ativo para novos chamados.</p>
                </div>
                <input 
                  type="checkbox"
                  checked={editingSector ? editingSector.active : newSector.active}
                  onChange={(e) => {
                    if (editingSector) setEditingSector({ ...editingSector, active: e.target.checked });
                    else setNewSector({ ...newSector, active: e.target.checked });
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 select-none cursor-pointer"
                />
              </div>

              {/* SLA auto-close settings */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-850 space-y-4">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-amber-500" />
                  Auto Encerramento por Inatividade
                </label>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl select-none">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Ativar Fechamento Automático</span>
                    <p className="text-[10px] text-slate-400 leading-normal">Fecha atendimentos ociosos automaticamente.</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={editingSector ? editingSector.autoCloseEnabled : newSector.autoCloseEnabled}
                    onChange={(e) => {
                      if (editingSector) setEditingSector({ ...editingSector, autoCloseEnabled: e.target.checked });
                      else setNewSector({ ...newSector, autoCloseEnabled: e.target.checked });
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 select-none cursor-pointer"
                  />
                </div>

                {((editingSector && editingSector.autoCloseEnabled) || (!editingSector && newSector.autoCloseEnabled)) && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400">Tempo Limite (Minutos)</label>
                        <input 
                          type="number"
                          required
                          min={2}
                          value={editingSector ? editingSector.autoCloseTimeoutMinutes : newSector.autoCloseTimeoutMinutes}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 60;
                            if (editingSector) setEditingSector({ ...editingSector, autoCloseTimeoutMinutes: val });
                            else setNewSector({ ...newSector, autoCloseTimeoutMinutes: val });
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400">Alerta Prévio (Minutos)</label>
                        <input 
                          type="number"
                          required
                          min={1}
                          value={editingSector ? editingSector.autoCloseWarningMinutes : newSector.autoCloseWarningMinutes}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 15;
                            if (editingSector) setEditingSector({ ...editingSector, autoCloseWarningMinutes: val });
                            else setNewSector({ ...newSector, autoCloseWarningMinutes: val });
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Mensagem de Alerta</label>
                      <textarea
                        rows={2}
                        value={editingSector ? editingSector.autoCloseWarningMessage : newSector.autoCloseWarningMessage}
                        onChange={(e) => {
                          if (editingSector) setEditingSector({ ...editingSector, autoCloseWarningMessage: e.target.value });
                          else setNewSector({ ...newSector, autoCloseWarningMessage: e.target.value });
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSectorDrawerOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-750 transition-all select-none cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1 select-none cursor-pointer"
                >
                  Salvar Setor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
