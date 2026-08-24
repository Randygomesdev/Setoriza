import { Client } from '@stomp/stompjs';
import { useChatStore } from '../store/chatStore';

let stompClient: Client | null = null;

export const connectWebSocket = (token: string) => {
  if (stompClient && stompClient.connected) {
    console.log('WebSocket already connected');
    return;
  }

  // Construct broker URL with token in query params for the handshake interceptor
  const isHttps = window.location.protocol === 'https:';
  const wsProtocol = isHttps ? 'wss:' : 'ws:';
  const host = window.location.hostname === 'localhost' ? 'localhost:8080' : window.location.host;
  const brokerURL = `${wsProtocol}//${host}/api/v1/ws?token=${encodeURIComponent(token)}`;

  stompClient = new Client({
    brokerURL,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
      token: token,
    },
    debug: (str) => {
      console.log('STOMP Debug:', str);
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  });

  stompClient.onConnect = (frame) => {
    console.log('Connected to STOMP Broker:', frame);
    useChatStore.getState().setWsConnected(true);

    // Subscribe to the global ticket updates topic
    stompClient?.subscribe('/topic/tickets', (message) => {
      try {
        const event = JSON.parse(message.body);
        console.log('Received WebSocket event on /topic/tickets:', event);
        useChatStore.getState().handleWebSocketEvent(event);
      } catch (err) {
        console.error('Error parsing Stomp message from /topic/tickets', err);
      }
    });
  };

  stompClient.onStompError = (frame) => {
    console.error('Broker reported error: ' + frame.headers['message']);
    console.error('Additional details: ' + frame.body);
    useChatStore.getState().setWsConnected(false);
  };

  stompClient.onWebSocketClose = (evt) => {
    console.log('WebSocket connection closed', evt);
    useChatStore.getState().setWsConnected(false);
  };

  stompClient.activate();
};

export const disconnectWebSocket = () => {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
    console.log('WebSocket connection deactivated');
  }
};
