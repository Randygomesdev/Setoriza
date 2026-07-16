import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { useAuthStore } from '../../../store/authStore';
import { useChatStore } from '../../../store/chatStore';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { api } from '../../../services/api';
import {
  X,
  User,
  ArrowRightLeft,
  Paperclip,
  Download,
  Check,
  Clock,
  Mic,
  Image,
  Layers,
  Inbox,
  Send,
  FileText,
  ChevronDown,
  ChevronRight,
  History as HistoryIcon
} from 'lucide-react';
import { formatPhoneNumber, formatCNPJ } from '../utils/chatHelpers';

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
  const { addToast } = useToast();
  const { confirm } = useConfirm();
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

  // Accordion panel visibility states
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(true);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // Sector transfer history/timeline states
  const [sectorHistory, setSectorHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Local states for file filters and ZIP
  const [fileFilterOrigin, setFileFilterOrigin] = useState<'ALL' | 'SENT' | 'RECEIVED'>('ALL');
  const [fileFilterTypes, setFileFilterTypes] = useState<string[]>(['IMAGEM', 'AUDIO', 'DOCUMENTO']);
  const [zipLoading, setZipLoading] = useState(false);

  // Local states for transfer
  const [transferSectorId, setTransferSectorId] = useState('');
  const [transferAgentId, setTransferAgentId] = useState('');

  // Fetch sector history on ticket change
  useEffect(() => {
    if (activeTicketId) {
      setHistoryLoading(true);
      api.tickets.getSectorHistory(activeTicketId)
        .then(setSectorHistory)
        .catch((err) => console.error('Erro ao buscar histórico de setores:', err))
        .finally(() => setHistoryLoading(false));
    } else {
      setSectorHistory([]);
    }
  }, [activeTicketId]);

  const handleClaim = async (ticketId: string) => {
    try {
      await claimTicket(ticketId);
      addToast({ type: 'success', title: 'Atendimento Capturado', message: 'Você assumiu o atendimento com sucesso!' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Erro ao capturar', message: err.message || 'Não foi possível capturar o atendimento.' });
    }
  };

  const handleResolve = async (ticketId: string) => {
    const confirmed = await confirm({
      title: 'Encerrar Atendimento',
      message: 'Deseja realmente encerrar este atendimento?',
      confirmText: 'Encerrar',
      cancelText: 'Cancelar',
      type: 'primary'
    });
    if (confirmed) {
      try {
        await resolveTicket(ticketId);
        selectTicket(null);
        addToast({ type: 'success', title: 'Atendimento Concluído', message: 'Atendimento encerrado com sucesso!' });
      } catch (err: any) {
        addToast({ type: 'error', title: 'Erro ao concluir', message: err.message || 'Não foi possível concluir o atendimento.' });
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

    const confirmed = await confirm({
      title: 'Transferir Chamado',
      message: confirmMessage,
      confirmText: 'Transferir',
      cancelText: 'Cancelar',
      type: 'primary'
    });

    if (confirmed) {
      try {
        await transferTicket(activeTicketId, transferSectorId, transferAgentId || undefined, agentName || undefined);
        setTransferSectorId('');
        setTransferAgentId('');
        selectTicket(null);
        addToast({ type: 'success', title: 'Chamado Transferido', message: 'Chamado transferido com sucesso!' });
      } catch (err: any) {
        addToast({ type: 'error', title: 'Erro ao transferir', message: err.message || 'Não foi possível transferir o chamado.' });
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
      addToast({ type: 'success', title: 'Arquivo ZIP Gerado', message: 'Mídias empacotadas e baixadas com sucesso!' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Erro no ZIP', message: `Erro ao gerar o arquivo ZIP: ${err.message}` });
    } finally {
      setZipLoading(false);
    }
  };

  const handleExportTextHistory = () => {
    if (!activeTicket) return;
    try {
      const ticketInfo = `==================================================
HISTÓRICO DE ATENDIMENTO - SETORIZA
Ticket ID: ${activeTicket.id}
Cliente: ${activeTicket.clientName || 'Contato em Identificação'}
Empresa: ${activeTicket.client ? activeTicket.client.companyName : 'Não Identificado'}
CNPJ: ${activeTicket.client ? formatCNPJ(activeTicket.client.cnpj) : 'Aguardando'}
Setor: ${activeTicket.sector ? activeTicket.sector.friendlyName : 'Sem Setor'}
Exportado em: ${new Date().toLocaleString('pt-BR')}
==================================================\r\n\r\n`;

      const textContent = activeTicketMessages.map((msg: any) => {
        let sender = 'Sistema';
        if (msg.senderType === 'COLABORADOR') sender = 'Atendente';
        if (msg.senderType === 'CLIENTE') sender = 'Cliente';

        const time = new Date(msg.sentAt).toLocaleString('pt-BR');

        // Formatação especial se for mídia/anexo
        let text = msg.content;
        if (msg.messageType === 'IMAGEM') {
          text = `<Imagem Anexada: ${msg.content}>`;
        } else if (
          (msg.content || '').toLowerCase().endsWith('.webm') || 
          (msg.content || '').toLowerCase().endsWith('.ogg') || 
          (msg.content || '').toLowerCase().endsWith('.opus') ||
          (msg.content || '').toLowerCase().endsWith('.mp3') ||
          (msg.content || '').toLowerCase().includes('voice_message')
        ) {
          text = `<Áudio enviado/recebido: ${msg.content}>`;
        } else if (msg.messageType === 'DOCUMENTO') {
          const fileName = msg.content.substring(msg.content.lastIndexOf('/') + 1);
          text = `<Documento Anexado: ${fileName} (${msg.content})>`;
        }

        return `[${time}] ${sender}: ${text}`;
      }).join('\r\n');

      const blob = new Blob([ticketInfo + textContent], { type: 'text/plain;charset=utf-8' });
      const ticketPrefix = activeTicket.id.substring(0, 8);
      const filename = `conversa_${ticketPrefix}.txt`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      addToast({
        type: 'success',
        title: 'Exportação Concluída',
        message: 'O histórico de conversa foi baixado com sucesso!'
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao Exportar',
        message: err.message || 'Não foi possível exportar a conversa.'
      });
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
          <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-450 dark:text-slate-400">
            <User size={18} />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
              {activeTicket.clientName || 'Contato em Identificação'}
            </h4>
            <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5">
              {formatPhoneNumber(activeTicket.whatsappNumber)}
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2">
          <div className="flex justify-between text-[10px] items-center">
            <span className="text-slate-500">ID do Ticket:</span>
            <span className="font-mono text-slate-650 dark:text-slate-450 text-[9px] bg-slate-200/50 dark:bg-slate-800/50 px-1 py-0.5 rounded select-all" title="Copiar ID Completo">
              #{(activeTicket.id || '').substring(0, 8)}
            </span>
          </div>
          <div className="flex justify-between text-[10px] items-start">
            <span className="text-slate-500">Cliente (Empresa):</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 text-right truncate w-32" title={activeTicket.client?.companyName || 'Não Identificado'}>
              {activeTicket.client ? activeTicket.client.companyName : 'Não Identificado'}
            </span>
          </div>
          <div className="flex justify-between text-[10px] items-center">
            <span className="text-slate-500">CNPJ:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {activeTicket.client ? formatCNPJ(activeTicket.client.cnpj) : 'Aguardando'}
            </span>
          </div>
          <div className="flex justify-between text-[10px] items-center">
            <span className="text-slate-500">Setor Atual:</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {activeTicket.sector ? activeTicket.sector.friendlyName : 'Não definido'}
            </span>
          </div>
          <div className="flex justify-between text-[10px] items-center">
            <span className="text-slate-500">Canal:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">WhatsApp</span>
          </div>
          <div className="flex justify-between text-[10px] items-center border-t border-slate-150 dark:border-slate-800/40 pt-1.5">
            <span className="text-slate-500">Abertura:</span>
            <span className="font-semibold text-slate-750 dark:text-slate-300">
              {activeTicket.createdAt ? new Date(activeTicket.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
            </span>
          </div>
          {activeTicket.status === 'CONCLUIDO' && activeTicket.resolvedAt && (
            <div className="flex justify-between text-[10px] items-center">
              <span className="text-slate-500">Fechamento:</span>
              <span className="font-semibold text-slate-750 dark:text-slate-300">
                {new Date(activeTicket.resolvedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Transfer Sector Accordion */}
      {activeTicket.status === 'EM_ANDAMENTO' && activeTicket.assignedAgentId === user?.id && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col min-h-0">
          <button
            type="button"
            onClick={() => setIsTransferOpen(!isTransferOpen)}
            className="w-full flex items-center justify-between font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors pb-2"
          >
            <span className="flex items-center gap-1.5">
              <ArrowRightLeft size={12} className="text-blue-500" />
              Transferir Setor
            </span>
            {isTransferOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {isTransferOpen && (
            <div className="mt-2 space-y-3 animate-fadeIn">
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
        </div>
      )}

      {/* Sector Transfer Timeline Accordion */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col min-h-0">
        <button
          type="button"
          onClick={() => setIsTimelineOpen(!isTimelineOpen)}
          className="w-full flex items-center justify-between font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors pb-2"
        >
          <span className="flex items-center gap-1.5">
            <HistoryIcon size={12} className="text-blue-500" />
            Histórico de Transferências
          </span>
          {isTimelineOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {isTimelineOpen && (
          <div className="mt-2 space-y-3.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin animate-fadeIn">
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-500 text-[10px] gap-2">
                <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Carregando timeline...</span>
              </div>
            ) : sectorHistory.length === 0 ? (
              <div className="text-[10px] text-slate-450 dark:text-slate-500 italic text-center py-4">
                Nenhuma transferência registrada neste chamado.
              </div>
            ) : (
              <div className="relative pl-3 border-l-2 border-slate-200 dark:border-slate-800 ml-1.5 py-1 space-y-4">
                {/* Special Node: Chamado Aberto */}
                {activeTicket.createdAt && (
                  <div className="relative text-[10px] leading-normal">
                    <span className="absolute -left-[17.5px] top-1 h-2 w-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900 shadow-sm" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        🚀 Chamado Aberto
                      </span>
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Abertura: {new Date(activeTicket.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Sector History Nodes */}
                {sectorHistory.map((hist: any, idx: number) => {
                  const entryTime = new Date(hist.enteredAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const claimTime = hist.claimedAt ? new Date(hist.claimedAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : null;
                  const agentName = hist.assignedAgentId 
                    ? (usersList.find(u => u.id === hist.assignedAgentId)?.name || 'Atendente')
                    : 'Fila do Setor';
                  
                  return (
                    <div key={hist.id || idx} className="relative text-[10px] leading-normal">
                      {/* Timeline node dot */}
                      <span className="absolute -left-[17.5px] top-1.5 h-2 w-2 rounded-full bg-blue-500 border border-white dark:border-slate-900 shadow-sm" />
                      
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Setor: {hist.sector?.friendlyName || 'Setor Inicial'}
                        </span>
                        {hist.assignedAgentId ? (
                          <>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Atendente: <strong className="text-slate-650 dark:text-slate-350">{agentName}</strong>
                            </span>
                            {claimTime && (
                              <span className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">
                                Assumido em: {claimTime}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[9px] text-slate-450 dark:text-slate-500 italic mt-0.5">
                            Aguardando na fila do setor
                          </span>
                        )}
                        <span className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Entrada: {entryTime}
                          {hist.exitedAt && (
                            <>
                              <br />
                              Saída: {new Date(hist.exitedAt).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Special Node: Chamado Concluído */}
                {activeTicket.status === 'CONCLUIDO' && activeTicket.resolvedAt && (
                  <div className="relative text-[10px] leading-normal">
                    <span className="absolute -left-[17.5px] top-1 h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600 border border-white dark:border-slate-900 shadow-sm" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        ✅ Chamado Concluído
                      </span>
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Fechamento: {new Date(activeTicket.resolvedAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shared Files & Media Accordion */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col min-h-0">
        <button
          type="button"
          onClick={() => setIsMediaOpen(!isMediaOpen)}
          className="w-full flex items-center justify-between font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors pb-2"
        >
          <span className="flex items-center gap-1.5">
            <Paperclip size={12} className="text-blue-500" />
            Arquivos e Mídias
          </span>
          {isMediaOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {isMediaOpen && (
          <div className="space-y-3 animate-fadeIn flex flex-col min-h-0 mt-2">
            {/* Filter Options */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">Origem:</span>
                <div className="flex gap-1.5">
                  {(['ALL', 'SENT', 'RECEIVED'] as const).map((origin) => {
                    const IconComponent = origin === 'ALL' ? Layers : origin === 'SENT' ? Send : Inbox;
                    const tooltip = origin === 'ALL' ? 'Todos os Remetentes' : origin === 'SENT' ? 'Enviados pelo Suporte' : 'Recebidos do Cliente';
                    return (
                      <button
                        key={origin}
                        type="button"
                        onClick={() => setFileFilterOrigin(origin)}
                        title={tooltip}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center border ${
                          fileFilterOrigin === origin
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <IconComponent size={12} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-[9px]">
                <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">Tipo:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleFileTypeFilter('IMAGEM')}
                    title="Imagens"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center border ${
                      fileFilterTypes.includes('IMAGEM')
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Image size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFileTypeFilter('AUDIO')}
                    title="Áudios / Voz"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center border ${
                      fileFilterTypes.includes('AUDIO')
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Mic size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFileTypeFilter('DOCUMENTO')}
                    title="Documentos / PDFs"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center border ${
                      fileFilterTypes.includes('DOCUMENTO')
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Paperclip size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Media List */}
            {(() => {
              const mediaMessages = activeTicketMessages.filter((msg) => {
                if (msg.senderType === 'SISTEMA') return false;
                if (msg.messageType !== 'IMAGEM' && msg.messageType !== 'DOCUMENTO') return false;
                
                // 1. Determine actual visual category
                let category: 'IMAGEM' | 'AUDIO' | 'DOCUMENTO' = 'DOCUMENTO';
                if (msg.messageType === 'IMAGEM') {
                  category = 'IMAGEM';
                } else if (
                  (msg.content || '').toLowerCase().endsWith('.webm') ||
                  (msg.content || '').toLowerCase().endsWith('.ogg') ||
                  (msg.content || '').toLowerCase().endsWith('.opus') ||
                  (msg.content || '').toLowerCase().endsWith('.mp3') ||
                  (msg.content || '').toLowerCase().includes('voice_message')
                ) {
                  category = 'AUDIO';
                }
                
                // Filter by categories/types selection
                if (!fileFilterTypes.includes(category)) return false;
                
                // 2. Filter by origin
                if (fileFilterOrigin === 'SENT' && msg.senderType !== 'COLABORADOR') return false;
                if (fileFilterOrigin === 'RECEIVED' && msg.senderType !== 'CLIENTE') return false;
                
                return true;
              });

              return (
                <div className="flex flex-col min-h-0 space-y-2">
                  <div className="overflow-y-auto pr-1 space-y-2.5 max-h-[220px] scrollbar-thin">
                    {mediaMessages.length === 0 ? (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center py-4">
                        Nenhum arquivo encontrado.
                      </div>
                    ) : (
                      mediaMessages.map((msg) => {
                        const isImg = msg.messageType === 'IMAGEM';
                        const isAud = (msg.content || '').toLowerCase().endsWith('.webm') ||
                                      (msg.content || '').toLowerCase().endsWith('.ogg') ||
                                      (msg.content || '').toLowerCase().endsWith('.opus') ||
                                      (msg.content || '').toLowerCase().endsWith('.mp3') ||
                                      (msg.content || '').toLowerCase().includes('voice_message');
                        
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
                            ) : isAud ? (
                              <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center shrink-0 border border-blue-200/40 dark:border-blue-900/30">
                                <Mic size={14} />
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
                              <span className={`text-[8px] uppercase font-bold ${isAud ? 'text-blue-500' : 'text-slate-400'}`}>
                                {isAud ? 'ÁUDIO' : msg.messageType}
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
        )}
      </div>

      {/* Action List */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-end">
        <button
          onClick={handleExportTextHistory}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-250 dark:border-slate-700 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none"
        >
          <FileText size={12} />
          Exportar Conversa (.txt)
        </button>

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
        
        {activeTicket.status === 'CONCLUIDO' && (() => {
          const resolvedTime = activeTicket.resolvedAt ? new Date(activeTicket.resolvedAt).getTime() : 0;
          const diffHours = resolvedTime ? (Date.now() - resolvedTime) / (1000 * 60 * 60) : 999;
          const canReopen = diffHours <= 24;

          return (
            <button
              onClick={() => handleClaim(activeTicket.id)}
              disabled={!canReopen}
              title={!canReopen ? "Este chamado foi concluído há mais de 24 horas e não pode ser reaberto." : "Reabrir este chamado"}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Clock size={14} />
              Reabrir Chamado
            </button>
          );
        })()}
      </div>
    </div>
  );
};
