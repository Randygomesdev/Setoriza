import React, { useState } from 'react';
import JSZip from 'jszip';
import { useAuthStore } from '../../../store/authStore';
import { useChatStore } from '../../../store/chatStore';
import {
  X,
  User,
  ArrowRightLeft,
  Paperclip,
  Download,
  Check,
  Clock
} from 'lucide-react';

interface ChatDetailsProps {
  usersList: any[];
  showDetailsPanel: boolean;
  onCloseDetails: () => void;
  onImageClick: (url: string) => void;
}

export const ChatDetails: React.FC<ChatDetailsProps> = ({
  usersList,
  showDetailsPanel,
  onCloseDetails,
  onImageClick
}) => {
  const { user } = useAuthStore();
  const {
    activeTicketId,
    tickets,
    sectors,
    messagesByTicketId,
    claimTicket,
    resolveTicket,
    transferTicket,
    selectTicket
  } = useChatStore();

  const activeTicket = tickets.find((t) => t.id === activeTicketId);
  const activeTicketMessages = activeTicketId ? (messagesByTicketId[activeTicketId] || []) : [];

  // Local states for file filters and ZIP
  const [fileFilterOrigin, setFileFilterOrigin] = useState<'ALL' | 'SENT' | 'RECEIVED'>('ALL');
  const [fileFilterTypes, setFileFilterTypes] = useState<string[]>(['IMAGEM', 'AUDIO', 'DOCUMENTO']);
  const [zipLoading, setZipLoading] = useState(false);

  // Local states for transfer
  const [transferSectorId, setTransferSectorId] = useState('');
  const [transferAgentId, setTransferAgentId] = useState('');

  const handleClaim = async (ticketId: string) => {
    try {
      await claimTicket(ticketId);
    } catch (err) {
      // already handled
    }
  };

  const handleResolve = async (ticketId: string) => {
    if (confirm('Deseja realmente encerrar este atendimento?')) {
      try {
        await resolveTicket(ticketId);
        selectTicket(null);
      } catch (err) {
        // already handled
      }
    }
  };

  const handleTransfer = async () => {
    if (!activeTicketId || !transferSectorId) return;

    const sectorName = sectors.find((s) => s.id === transferSectorId)?.friendlyName || '';
    const agentName = usersList.find((u) => u.id === transferAgentId)?.name || '';

    const confirmMessage = transferAgentId 
      ? `Deseja transferir o chamado para o atendente ${agentName} no setor ${sectorName}?`
      : `Deseja colocar o chamado na fila do setor ${sectorName}?`;

    if (confirm(confirmMessage)) {
      try {
        await transferTicket(activeTicketId, transferSectorId, transferAgentId || undefined);
        setTransferSectorId('');
        setTransferAgentId('');
        selectTicket(null);
      } catch (err) {
        // already handled
      }
    }
  };

  const handleDownloadAllZip = async (filteredMessages: any[]) => {
    if (filteredMessages.length === 0) return;
    setZipLoading(true);
    try {
      const zip = new JSZip();
      
      const fetchPromises = filteredMessages.map(async (msg, index) => {
        try {
          const response = await fetch(msg.content);
          if (!response.ok) throw new Error(`Falha no HTTP status ${response.status}`);
          const blob = await response.blob();
          
          let folderName = 'Outros';
          let extension = '.bin';
          
          if (msg.messageType === 'IMAGEM') {
            folderName = 'Imagens';
            extension = '.jpg';
          } else if (msg.messageType === 'AUDIO') {
            folderName = 'Audios';
            extension = '.webm';
          } else if (msg.messageType === 'DOCUMENTO') {
            folderName = 'Documentos';
            const urlObj = new URL(msg.content);
            const pathParts = urlObj.pathname.split('/');
            const originalName = pathParts[pathParts.length - 1];
            
            if (originalName && originalName.includes('.')) {
              extension = originalName.substring(originalName.lastIndexOf('.'));
            } else if (msg.content.toLowerCase().endsWith('.webm')) {
              extension = '.webm';
            } else if (msg.content.toLowerCase().endsWith('.ogg')) {
              extension = '.ogg';
            } else if (msg.content.toLowerCase().endsWith('.opus')) {
              extension = '.opus';
            } else if (msg.content.toLowerCase().endsWith('.mp3')) {
              extension = '.mp3';
            } else if (msg.content.toLowerCase().endsWith('.pdf')) {
              extension = '.pdf';
            }
          }
          
          const filename = `${folderName}/arquivo_${index + 1}${extension}`;
          zip.file(filename, blob);
        } catch (err) {
          console.error(`Erro ao baixar arquivo para ZIP: ${msg.content}`, err);
        }
      });

      await Promise.all(fetchPromises);
      const contentZip = await zip.generateAsync({ type: 'blob' });
      
      const ticketPrefix = activeTicketId ? activeTicketId.substring(0, 8) : 'ticket';
      const zipFilename = `${ticketPrefix}.zip`;
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(contentZip);
      link.download = zipFilename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err: any) {
      alert(`Erro ao gerar o arquivo ZIP: ${err.message}`);
    } finally {
      setZipLoading(false);
    }
  };

  const toggleFileTypeFilter = (type: string) => {
    if (fileFilterTypes.includes(type)) {
      if (fileFilterTypes.length > 1) {
        setFileFilterTypes(fileFilterTypes.filter((t) => t !== type));
      }
    } else {
      setFileFilterTypes([...fileFilterTypes, type]);
    }
  };

  if (!activeTicket || !showDetailsPanel) return null;

  return (
    <div className="w-72 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 backdrop-blur-md flex flex-col p-5 space-y-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Detalhes do Ticket</h3>
        <button
          onClick={onCloseDetails}
          className="text-slate-400 dark:text-slate-500 hover:text-slate-850 dark:hover:text-white cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Client Metadata Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-455 dark:text-slate-400">
            <User size={18} />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
              {activeTicket.clientName || 'Em Identificação'}
              {activeTicket.client?.companyName ? ` (${activeTicket.client.companyName})` : ''}
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
              onChange={(e) => {
                setTransferSectorId(e.target.value);
                setTransferAgentId('');
              }}
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

            {transferSectorId && (
              <select
                value={transferAgentId}
                onChange={(e) => setTransferAgentId(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Qualquer Colaborador (Fila do Setor)</option>
                {usersList
                  .filter((usr) => {
                    if (!usr.sectors) return false;
                    const targetSector = sectors.find((s) => s.id === transferSectorId);
                    if (!targetSector) return false;
                    const targetName = targetSector.name.toUpperCase();
                    return usr.sectors.split(',').map((s: string) => s.trim().toUpperCase()).includes(targetName);
                  })
                  .map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
              </select>
            )}

            <button
              type="button"
              onClick={handleTransfer}
              disabled={!transferSectorId}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-400 dark:disabled:text-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-lg border border-slate-250 dark:border-slate-700/60 shadow-sm transition-all cursor-pointer"
            >
              Confirmar Transferência
            </button>
          </div>
        </div>
      )}

      {/* Shared Files & Media */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex-1 flex flex-col min-h-0 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Paperclip size={12} />
            Arquivos e Mídias
          </h4>
        </div>

        {/* Filter Options */}
        <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-105 dark:border-slate-800/60">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">Origem:</span>
            <div className="flex gap-1">
              {(['ALL', 'SENT', 'RECEIVED'] as const).map((origin) => (
                <button
                  key={origin}
                  type="button"
                  onClick={() => setFileFilterOrigin(origin)}
                  className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    fileFilterOrigin === origin
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-250 dark:bg-slate-805 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {origin === 'ALL' ? 'Todos' : origin === 'SENT' ? 'Enviados' : 'Recebidos'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px]">
            <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">Tipo:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => toggleFileTypeFilter('IMAGEM')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  fileFilterTypes.includes('IMAGEM')
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-250 dark:bg-slate-805 text-slate-605 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                Img
              </button>
              <button
                type="button"
                onClick={() => toggleFileTypeFilter('AUDIO')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  fileFilterTypes.includes('AUDIO')
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-250 dark:bg-slate-805 text-slate-605 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                Aud
              </button>
              <button
                type="button"
                onClick={() => toggleFileTypeFilter('DOCUMENTO')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  fileFilterTypes.includes('DOCUMENTO')
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-250 dark:bg-slate-805 text-slate-650 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                Doc
              </button>
            </div>
          </div>
        </div>

        {/* Media List */}
        {(() => {
          const mediaMessages = activeTicketMessages.filter((msg) => {
            if (msg.senderType === 'SISTEMA') return false;
            
            // 1. Filter by categories/types
            if (!fileFilterTypes.includes(msg.messageType)) return false;
            
            // 2. Filter by origin
            if (fileFilterOrigin === 'SENT' && msg.senderType !== 'COLABORADOR') return false;
            if (fileFilterOrigin === 'RECEIVED' && msg.senderType !== 'CLIENTE') return false;
            
            return true;
          });

          return (
            <div className="flex-1 flex flex-col min-h-0 space-y-2">
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[220px] scrollbar-thin">
                {mediaMessages.length === 0 ? (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center py-4">
                    Nenhum arquivo encontrado.
                  </div>
                ) : (
                  mediaMessages.map((msg) => {
                    const isImg = msg.messageType === 'IMAGEM';
                    
                    return (
                      <div
                        key={msg.id}
                        className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-205 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
                      >
                        {isImg ? (
                          <div
                            onClick={() => onImageClick(msg.content)}
                            className="h-8 w-8 rounded-lg overflow-hidden shrink-0 cursor-zoom-in border border-slate-200/50"
                          >
                            <img src={msg.content} className="h-full w-full object-cover" alt="Anexo" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                            <Paperclip size={14} />
                          </div>
                        )}
                        <div className="overflow-hidden flex-1">
                          <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate">
                            {msg.content.substring(msg.content.lastIndexOf('/') + 1)}
                          </p>
                          <span className="text-[8px] text-slate-400 uppercase font-bold">
                            {msg.messageType}
                          </span>
                        </div>
                        <a
                          href={msg.content}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-slate-205 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-650 shrink-0 cursor-pointer"
                        >
                          <Download size={12} />
                        </a>
                      </div>
                    );
                  })
                )}
              </div>

              {mediaMessages.length > 0 && (
                <button
                  onClick={() => handleDownloadAllZip(mediaMessages)}
                  disabled={zipLoading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer select-none"
                >
                  {zipLoading ? (
                    <>
                      <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Compactando...</span>
                    </>
                  ) : (
                    <>
                      <Download size={12} />
                      <span>Baixar selecionados</span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Action List */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-end">
        {activeTicket.status === 'EM_ANDAMENTO' && activeTicket.assignedAgentId === user?.id && (
          <button
            onClick={() => handleResolve(activeTicket.id)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check size={14} />
            Concluir Atendimento
          </button>
        )}
        
        {activeTicket.status === 'EM_ANDAMENTO' && activeTicket.assignedAgentId !== user?.id && (
          <button
            onClick={() => handleClaim(activeTicket.id)}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <User size={14} />
            Assumir Atendimento
          </button>
        )}
        
        {activeTicket.status === 'CONCLUIDO' && (
          <button
            onClick={() => handleClaim(activeTicket.id)}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Clock size={14} />
            Reabrir Chamado
          </button>
        )}
      </div>
    </div>
  );
};
