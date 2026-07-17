import { create } from 'zustand';
import { api } from '../services/api';
import { playNotificationSound, showDesktopNotification, startTitleFlash } from '../services/notification';

export interface Sector {
  id: string;
  name: string;
  friendlyName: string;
  active: boolean;
}

export interface Client {
  id: string;
  cnpj: string;
  companyName: string;
}

export interface Ticket {
  id: string;
  clientId: string | null;
  client?: Client | null;
  assignedAgentId: string | null;
  whatsappNumber: string;
  clientName: string | null;
  sector: Sector | null;
  status: 'IDENTIFICACAO_CNPJ' | 'IDENTIFICACAO_NOME' | 'TRIAGEM' | 'AGUARDANDO_ATENDIMENTO' | 'EM_ANDAMENTO' | 'CONCLUIDO';
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
}

export interface Message {
  id: string;
  ticketId: string;
  senderType: 'CLIENTE' | 'COLABORADOR' | 'SISTEMA';
  messageType: 'TEXTO' | 'DOCUMENTO' | 'IMAGEM';
  content: string;
  sentAt: string;
  whatsappMsgId?: string;
  status?: string;
}

export interface TicketEvent {
  type: string;
  ticketId: string;
  payload: any;
}

interface ChatState {
  tickets: Ticket[];
  sectors: Sector[];
  activeTicketId: string | null;
  messagesByTicketId: Record<string, Message[]>;
  unreadCounts: Record<string, number>;
  audioMuted: boolean;
  loading: boolean;
  error: string | null;
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
  toggleAudioMute: () => void;
  
  fetchTickets: () => Promise<void>;
  fetchSectors: () => Promise<void>;
  selectTicket: (ticketId: string | null) => Promise<void>;
  claimTicket: (ticketId: string) => Promise<void>;
  resolveTicket: (ticketId: string) => Promise<void>;
  transferTicket: (ticketId: string, targetSectorId?: string, targetAgentId?: string, targetAgentName?: string) => Promise<void>;
  sendOperatorMessage: (ticketId: string, content: string) => Promise<void>;
  sendOperatorMediaMessage: (ticketId: string, file: File, caption?: string) => Promise<void>;
  createTicket: (whatsappNumber: string, clientName: string, sectorId: string) => Promise<any>;
  handleWebSocketEvent: (event: TicketEvent) => void;
  markAsRead: (ticketId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  tickets: [],
  sectors: [],
  activeTicketId: null,
  messagesByTicketId: {},
  unreadCounts: {},
  audioMuted: localStorage.getItem('setoriza_audio_muted') === 'true',
  loading: false,
  error: null,
  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),
  
  toggleAudioMute: () => {
    set((state) => {
      const newMuted = !state.audioMuted;
      localStorage.setItem('setoriza_audio_muted', String(newMuted));
      return { audioMuted: newMuted };
    });
  },

  fetchTickets: async () => {
    set({ loading: true, error: null });
    try {
      // List all tickets including completed ones
      const data = await api.tickets.list({
        status: ['IDENTIFICACAO_CNPJ', 'IDENTIFICACAO_NOME', 'TRIAGEM', 'AGUARDANDO_ATENDIMENTO', 'EM_ANDAMENTO', 'CONCLUIDO'],
      });
      set({ tickets: data, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Falha ao buscar tickets', loading: false });
    }
  },

  fetchSectors: async () => {
    try {
      const data = await api.sectors.list();
      set({ sectors: data });
    } catch (err: any) {
      console.error('Error fetching sectors:', err);
    }
  },

  selectTicket: async (ticketId: string | null) => {
    set({ activeTicketId: ticketId });
    if (!ticketId) return;
    
    // Zera mensagens não lidas ao selecionar
    get().markAsRead(ticketId);
    
    // Fetch messages for the ticket if not already loaded, or to refresh
    try {
      const messages = await api.tickets.getMessages(ticketId);
      // Map properties to match frontend interface
      const formattedMessages: Message[] = messages.map(m => ({
        id: m.id,
        ticketId: m.ticketId,
        senderType: m.senderType,
        messageType: m.messageType,
        content: m.content,
        sentAt: m.sentAt || new Date().toISOString(),
      }));

      set((state) => ({
        messagesByTicketId: {
          ...state.messagesByTicketId,
          [ticketId]: formattedMessages,
        },
      }));
    } catch (err: any) {
      console.error(`Error fetching messages for ticket ${ticketId}:`, err);
    }
  },

  markAsRead: (ticketId: string) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [ticketId]: 0,
      },
    }));
  },

  claimTicket: async (ticketId: string) => {
    try {
      const updatedTicket = await api.tickets.claim(ticketId);
      set((state) => ({
        tickets: state.tickets.map((t) => (t.id === ticketId ? updatedTicket : t)),
      }));
    } catch (err: any) {
      throw err;
    }
  },

  resolveTicket: async (ticketId: string) => {
    try {
      const updatedTicket = await api.tickets.resolve(ticketId);
      set((state) => ({
        tickets: state.tickets.map((t) => (t.id === ticketId ? updatedTicket : t)),
      }));
    } catch (err: any) {
      throw err;
    }
  },

  createTicket: async (whatsappNumber: string, clientName: string, sectorId: string) => {
    try {
      const newTicket = await api.tickets.create(whatsappNumber, clientName, sectorId);
      set((state) => ({
        tickets: [newTicket, ...state.tickets],
        activeTicketId: newTicket.id,
      }));
      return newTicket;
    } catch (err: any) {
      throw err;
    }
  },

  transferTicket: async (ticketId: string, targetSectorId?: string, targetAgentId?: string, targetAgentName?: string) => {
    try {
      const updatedTicket = await api.tickets.transfer(ticketId, targetSectorId, targetAgentId, targetAgentName);
      
      // If operator doesn't belong to the sector anymore (or if the ticket status changes), 
      // we might want to let the event handler or the state manage it. Let's update local ticket.
      set((state) => ({
        tickets: state.tickets.map((t) => (t.id === ticketId ? updatedTicket : t)),
        // If it was transferred out of our scope, we can clear active ticket or keep it
      }));
    } catch (err: any) {
      throw err;
    }
  },

  sendOperatorMessage: async (ticketId: string, content: string) => {
    try {
      const sentMessage = await api.tickets.sendMessage(ticketId, content);
      
      const formattedMessage: Message = {
        id: sentMessage.id,
        ticketId: sentMessage.ticketId,
        senderType: sentMessage.senderType,
        messageType: sentMessage.messageType,
        content: sentMessage.content,
        sentAt: sentMessage.sentAt || new Date().toISOString(),
      };

      set((state) => {
        const ticketMessages = state.messagesByTicketId[ticketId] || [];
        // Avoid duplicate messages if already added by WebSocket event
        if (ticketMessages.some((m) => m.id === formattedMessage.id)) {
          return state;
        }
        return {
          messagesByTicketId: {
            ...state.messagesByTicketId,
            [ticketId]: [...ticketMessages, formattedMessage],
          },
        };
      });
    } catch (err: any) {
      throw err;
    }
  },

  sendOperatorMediaMessage: async (ticketId: string, file: File, caption?: string) => {
    try {
      const sentMessage = await api.tickets.sendMediaMessage(ticketId, file, caption);
      
      const formattedMessage: Message = {
        id: sentMessage.id,
        ticketId: sentMessage.ticketId,
        senderType: sentMessage.senderType,
        messageType: sentMessage.messageType,
        content: sentMessage.content,
        sentAt: sentMessage.sentAt || new Date().toISOString(),
      };

      set((state) => {
        const ticketMessages = state.messagesByTicketId[ticketId] || [];
        if (ticketMessages.some((m) => m.id === formattedMessage.id)) {
          return state;
        }
        return {
          messagesByTicketId: {
            ...state.messagesByTicketId,
            [ticketId]: [...ticketMessages, formattedMessage],
          },
        };
      });
    } catch (err: any) {
      throw err;
    }
  },

  handleWebSocketEvent: (event: TicketEvent) => {
    const { type, ticketId, payload } = event;
    
    switch (type) {
      case 'TICKET_CREATED': {
        const newTicket: Ticket = payload;
        let isNew = false;
        set((state) => {
          if (state.tickets.some((t) => t.id === newTicket.id)) {
            return state;
          }
          isNew = true;
          return { tickets: [newTicket, ...state.tickets] };
        });

        if (isNew) {
          if (!get().audioMuted) {
            playNotificationSound();
          }
          startTitleFlash('Novo ticket na fila!');
          showDesktopNotification(
            'Novo Ticket na Fila',
            `O cliente ${newTicket.clientName || newTicket.whatsappNumber} iniciou um contato.`,
            () => {
              get().selectTicket(newTicket.id);
            }
          );
        }
        break;
      }
      
      case 'TICKET_UPDATED':
      case 'TICKET_CLAIMED': {
        const updatedTicket: Ticket = payload;
        set((state) => ({
          tickets: state.tickets.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)),
        }));
        break;
      }
      
      case 'TICKET_RESOLVED': {
        const resolvedTicket: Ticket = payload;
        set((state) => ({
          tickets: state.tickets.map((t) => (t.id === resolvedTicket.id ? resolvedTicket : t)),
        }));
        break;
      }
      
      case 'MESSAGE_RECEIVED':
      case 'MESSAGE_SENT_BY_AGENT': {
        const newMessage: Message = {
          id: payload.id,
          ticketId: payload.ticketId || ticketId,
          senderType: payload.senderType,
          messageType: payload.messageType,
          content: payload.content,
          sentAt: payload.sentAt || new Date().toISOString(),
          whatsappMsgId: payload.whatsappMsgId,
          status: payload.status,
        };
        
        let isDuplicate = false;
        set((state) => {
          const ticketMessages = state.messagesByTicketId[ticketId] || [];
          if (ticketMessages.some((m) => m.id === newMessage.id)) {
            isDuplicate = true;
            return {
              messagesByTicketId: {
                ...state.messagesByTicketId,
                [ticketId]: ticketMessages.map((m) => m.id === newMessage.id ? { ...m, ...newMessage } : m),
              },
            };
          }
          return {
            messagesByTicketId: {
              ...state.messagesByTicketId,
              [ticketId]: [...ticketMessages, newMessage],
            },
          };
        });

        // Notifica apenas se for uma nova mensagem recebida do CLIENTE
        if (type === 'MESSAGE_RECEIVED' && !isDuplicate && newMessage.senderType === 'CLIENTE') {
          if (!get().audioMuted) {
            playNotificationSound();
          }
          
          const activeTicketId = get().activeTicketId;
          const isCurrentActive = activeTicketId === ticketId;
          const isFocused = document.visibilityState === 'visible' && document.hasFocus();

          // Se não estiver visualizando essa conversa ativamente ou o navegador estiver em background/outra aba
          if (!isCurrentActive || !isFocused) {
            // Incrementa o contador de não lidas
            set((state) => ({
              unreadCounts: {
                ...state.unreadCounts,
                [ticketId]: (state.unreadCounts[ticketId] || 0) + 1,
              },
            }));

            const ticket = get().tickets.find((t) => t.id === ticketId);
            const clientName = ticket ? (ticket.clientName || ticket.whatsappNumber) : 'Cliente';
            
            startTitleFlash(`Nova mensagem de ${clientName}`);
            showDesktopNotification(
              `Nova mensagem de ${clientName}`,
              newMessage.content,
              () => {
                get().selectTicket(ticketId);
              }
            );
          }
        }
        break;
      }

      case 'MESSAGE_STATUS_UPDATED': {
        const updatedMessage: Message = payload;
        set((state) => {
          const ticketMessages = state.messagesByTicketId[ticketId] || [];
          return {
            messagesByTicketId: {
              ...state.messagesByTicketId,
              [ticketId]: ticketMessages.map((m) =>
                m.id === updatedMessage.id ? { ...m, status: updatedMessage.status } : m
              ),
            },
          };
        });
        break;
      }
      
      default:
        console.warn('Unknown WebSocket event type:', type);
    }
  },
}));
