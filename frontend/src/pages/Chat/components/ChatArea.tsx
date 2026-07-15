import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useChatStore } from '../../../store/chatStore';
import { formatTime, getChannelIcon } from '../utils/chatHelpers';
import {
  ChevronLeft,
  History,
  Clock,
  Clipboard,
  Paperclip,
  Send,
  Check,
  Mic,
  X,
  Download,
  ArrowRightLeft
} from 'lucide-react';

interface ChatAreaProps {
  usersList: any[];
  isViewingFromHistory: boolean;
  onImageClick: (url: string) => void;
  onViewModeChange: (mode: 'chat' | 'history') => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  usersList,
  isViewingFromHistory,
  onImageClick,
  onViewModeChange
}) => {
  const { user } = useAuthStore();
  const {
    activeTicketId,
    messagesByTicketId,
    tickets,
    sectors,
    sendOperatorMessage,
    sendOperatorMediaMessage,
    selectTicket,
    claimTicket,
    resolveTicket,
    transferTicket
  } = useChatStore();

  const activeTicket = tickets.find((t) => t.id === activeTicketId);
  const activeTicketMessages = activeTicketId ? (messagesByTicketId[activeTicketId] || []) : [];

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const isRecordingCancelledRef = useRef(false);

  // States
  const [messageText, setMessageText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [showTransferPopover, setShowTransferPopover] = useState(false);
  const [transferSectorId, setTransferSectorId] = useState('');
  const [transferAgentId, setTransferAgentId] = useState('');

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicketMessages]);

  // Audio Recording stopwatch
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingTime(0);
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

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
        selectTicket(null); // Clear selected chat after resolve
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
        setShowTransferPopover(false);
        setTransferSectorId('');
        setTransferAgentId('');
        selectTicket(null); // Clear selected ticket since it is transferred
      } catch (err) {
        // already handled
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeTicketId) return;

    const textToSend = messageText;
    setMessageText(''); // Optimistic clean input

    try {
      await sendOperatorMessage(activeTicketId, textToSend);
    } catch (err: any) {
      alert(`Erro ao enviar mensagem: ${err.message}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeTicketId) return;
    const file = files[0];
    
    setMediaLoading(true);
    try {
      await sendOperatorMediaMessage(activeTicketId, file);
    } catch (err: any) {
      alert(`Erro ao enviar mídia: ${err.message}`);
    } finally {
      setMediaLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    isRecordingCancelledRef.current = false;
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        if (isRecordingCancelledRef.current) {
          audioChunksRef.current = [];
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioChunksRef.current.length > 0) {
          const audioFile = new File([audioBlob], `voice_message_${Date.now()}.webm`, {
            type: mimeType
          });
          
          if (activeTicketId) {
            setMediaLoading(true);
            try {
              await sendOperatorMediaMessage(activeTicketId, audioFile);
            } catch (err: any) {
              console.error("Erro ao enviar áudio:", err);
              alert(`Erro ao enviar áudio: ${err.message}`);
            } finally {
              setMediaLoading(false);
            }
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Não foi possível acessar seu microfone. Verifique as permissões do navegador.");
    }
  };

  const stopRecording = (cancel: boolean) => {
    isRecordingCancelledRef.current = cancel;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessageStatus = (status: string) => {
    if (!status) return null;
    const s = status.toUpperCase();
    if (s === 'SENT') {
      return <Check size={12} className="text-slate-400 dark:text-slate-500" />;
    }
    if (s === 'DELIVERED') {
      return (
        <div className="flex -space-x-1.5 items-center">
          <Check size={12} className="text-slate-400 dark:text-slate-500" />
          <Check size={12} className="text-slate-400 dark:text-slate-500" />
        </div>
      );
    }
    if (s === 'READ' || s === 'PLAYED') {
      return (
        <div className="flex -space-x-1.5 items-center">
          <Check size={12} className="text-blue-400" />
          <Check size={12} className="text-blue-400" />
        </div>
      );
    }
    return null;
  };

  if (!activeTicketId) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 p-8 text-center text-slate-400 dark:text-slate-500 select-none">
        <Clipboard className="h-16 w-16 mb-4 opacity-40 text-blue-500" />
        <h3 className="font-bold text-lg text-slate-700 dark:text-slate-350">Gerenciador de Atendimentos</h3>
        <p className="text-xs max-w-sm mt-1 leading-normal text-slate-500 dark:text-slate-400">
          Selecione um chamado na barra lateral para carregar o histórico de conversas ou capturar o chamado.
        </p>
      </div>
    );
  }

  if (!activeTicket) return null;

  return (
    <div className={`${activeTicketId ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-slate-100 dark:bg-slate-950 relative h-full overflow-hidden`}>
      
      {/* Active Ticket Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            {/* Mobile Back Button */}
            <button
              onClick={() => selectTicket(null)}
              className="p-1.5 mr-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg md:hidden transition-colors cursor-pointer"
              title="Voltar para a Lista de Tickets"
            >
              <ChevronLeft size={16} />
            </button>

            <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              {activeTicket.clientName || 'Cliente em Identificação'}
              {activeTicket.client?.companyName ? ` (${activeTicket.client.companyName})` : ''}
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
          {isViewingFromHistory && user?.role.toUpperCase() === 'USER' && (
            <button
              onClick={() => onViewModeChange('history')}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Voltar para a Lista de Tickets"
            >
              <History size={13} />
              Voltar ao Histórico
            </button>
          )}
          {isViewingFromHistory && (user?.role.toUpperCase() === 'ADMIN' || user?.role.toUpperCase() === 'MASTER') && (
            <Link
              to="/admin"
              state={{ activeTab: 'history' }}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Voltar para o Painel Administrativo Histórico"
            >
              <History size={13} />
              Voltar ao Histórico
            </Link>
          )}

          {activeTicket.status !== 'EM_ANDAMENTO' && activeTicket.status !== 'CONCLUIDO' ? (
            <button
              onClick={() => handleClaim(activeTicket.id)}
              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-md transition-all"
            >
              Capturar Chamado
            </button>
          ) : activeTicket.status === 'EM_ANDAMENTO' && activeTicket.assignedAgentId === user?.id ? (
            <div className="flex gap-2 relative">
              {/* Transfer Ticket Popover */}
              <div className="relative">
                <button
                  onClick={() => setShowTransferPopover(!showTransferPopover)}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer select-none"
                  title="Transferir Chamado"
                >
                  <ArrowRightLeft size={13} />
                  Transferir
                </button>

                {showTransferPopover && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl shadow-2xl p-4 z-50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                        Transferir Atendimento
                      </h4>
                      <button 
                        onClick={() => {
                          setShowTransferPopover(false);
                          setTransferSectorId('');
                          setTransferAgentId('');
                        }}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>

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
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-700 dark:text-slate-330 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleResolve(activeTicket.id)}
                className="py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg shadow-md transition-all cursor-pointer"
              >
                Concluir
              </button>
            </div>
          ) : (
            <div className="py-1 px-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-2xs uppercase rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 select-none">
              <Clock size={10} />
              {activeTicket.status === 'CONCLUIDO' ? 'Finalizado' : 'Visualizando'}
            </div>
          )}
        </div>
      </div>

      {/* Messages list area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 h-full scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-850 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-opacity-5 dark:bg-slate-950">
        {activeTicketMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 text-xs">
            Aguardando primeira mensagem deste atendimento...
          </div>
        ) : (
          activeTicketMessages.map((msg) => {
            const isMe = msg.senderType === 'COLABORADOR';
            const isSystem = msg.senderType === 'SISTEMA';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2 select-none">
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
                  {msg.messageType === 'IMAGEM' ? (
                    <div 
                      onClick={() => onImageClick(msg.content)} 
                      className="block max-w-xs overflow-hidden rounded-xl border border-slate-200/40 dark:border-slate-800/40 hover:opacity-90 transition-opacity cursor-zoom-in"
                    >
                      <img 
                        src={msg.content} 
                        className="max-h-60 object-cover w-full shadow-inner rounded-lg" 
                        alt="Imagem enviada" 
                      />
                    </div>
                  ) : msg.messageType === 'DOCUMENTO' && (
                    msg.content.toLowerCase().endsWith('.webm') || 
                    msg.content.toLowerCase().endsWith('.ogg') || 
                    msg.content.toLowerCase().endsWith('.opus') ||
                    msg.content.toLowerCase().endsWith('.mp3')
                  ) ? (
                    <div className="py-1">
                      <audio 
                        src={msg.content} 
                        controls 
                        className={`max-w-xs md:max-w-md h-9 rounded-lg ${isMe ? 'filter invert hue-rotate-180 brightness-150' : ''}`}
                      />
                    </div>
                  ) : msg.messageType === 'DOCUMENTO' ? (
                    <a 
                      href={msg.content} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold hover:bg-slate-500/10 transition-colors ${
                        isMe 
                          ? 'border-blue-400/45 text-white hover:text-white' 
                          : 'border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      <Download size={14} />
                      <span className="truncate max-w-[180px]">
                        {msg.content.substring(msg.content.lastIndexOf('/') + 1)}
                      </span>
                    </a>
                  ) : (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap select-text break-words">
                      {msg.content}
                    </p>
                  )}
                  
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0 self-end mt-1 select-none flex items-center gap-1 font-medium">
                    {formatTime(msg.sentAt)}
                    {isMe && renderMessageStatus(msg.status || 'SENT')}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {activeTicket.status === 'EM_ANDAMENTO' && activeTicket.assignedAgentId === user?.id ? (
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800/80 z-10 shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            
            {/* Attachment Button */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <button
              type="button"
              disabled={mediaLoading}
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm border border-slate-200 dark:border-slate-700/60 flex items-center justify-center shrink-0"
              title="Anexar arquivo"
            >
              {mediaLoading ? (
                <div className="h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Paperclip size={16} />
              )}
            </button>

            {/* Input area or Recording status */}
            {isRecording ? (
              <div className="flex-1 flex items-center justify-between bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/40 rounded-xl px-4 py-2.5 text-xs text-rose-600 dark:text-rose-400 animate-pulse">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                  <span>Gravando áudio... ({formatRecordingTime(recordingTime)})</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => stopRecording(true)}
                    className="px-3 py-1 bg-slate-205 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => stopRecording(false)}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Escreva sua mensagem..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800/80 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-505 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                />

                {/* Microfone button */}
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={mediaLoading}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm border border-slate-200 dark:border-slate-700/60 flex items-center justify-center shrink-0"
                  title="Gravar áudio"
                >
                  <Mic size={16} />
                </button>

                {/* Send Text Button */}
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-505 disabled:opacity-50 text-white transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-md shadow-blue-500/20"
                  title="Enviar mensagem"
                >
                  <Send size={16} />
                </button>
              </>
            )}
          </form>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800/80 text-center text-slate-400 dark:text-slate-500 text-xs select-none shrink-0">
          {activeTicket.status === 'CONCLUIDO' 
            ? 'Este atendimento foi encerrado. Reabra pelo histórico se necessário.' 
            : 'Capture o atendimento para poder interagir com o cliente.'}
        </div>
      )}
    </div>
  );
};
