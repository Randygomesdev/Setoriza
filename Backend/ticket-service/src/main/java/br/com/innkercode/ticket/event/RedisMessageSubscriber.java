package br.com.innkercode.ticket.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RedisMessageSubscriber implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String body = new String(message.getBody());
            log.debug("Recebido evento do Redis PubSub: {}", body);

            TicketEvent event = objectMapper.readValue(body, TicketEvent.class);

            // Broadcast para a lista geral de tickets
            messagingTemplate.convertAndSend("/topic/tickets", event);

            // Broadcast para a conversa específica
            if (event.getTicketId() != null) {
                messagingTemplate.convertAndSend("/topic/tickets/" + event.getTicketId(), event);
            }
        } catch (Exception e) {
            log.error("Erro ao desserializar ou processar mensagem do Redis PubSub", e);
        }
    }
}
