package br.com.innkercode.ticket.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.connection.DefaultMessage;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.io.IOException;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class RedisMessageSubscriberTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private ObjectMapper objectMapper;
    private RedisMessageSubscriber subscriber;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        subscriber = new RedisMessageSubscriber(messagingTemplate, objectMapper);
    }

    @Test
    void testReceiveMultipleMessagesAndBroadcasts() throws IOException {
        // Arrange
        UUID ticketId1 = UUID.randomUUID();
        UUID ticketId2 = UUID.randomUUID();

        TicketEvent event1 = TicketEvent.builder()
                .type("MESSAGE_RECEIVED")
                .ticketId(ticketId1.toString())
                .payload("Hello 1")
                .build();

        TicketEvent event2 = TicketEvent.builder()
                .type("MESSAGE_RECEIVED")
                .ticketId(ticketId2.toString())
                .payload("Hello 2")
                .build();

        byte[] body1 = objectMapper.writeValueAsBytes(event1);
        byte[] body2 = objectMapper.writeValueAsBytes(event2);

        DefaultMessage redisMsg1 = new DefaultMessage("ticket-updates".getBytes(), body1);
        DefaultMessage redisMsg2 = new DefaultMessage("ticket-updates".getBytes(), body2);

        // Act - Simular recepção de múltiplas mensagens
        subscriber.onMessage(redisMsg1, null);
        subscriber.onMessage(redisMsg2, null);

        // Assert
        // Verifica que ambos os eventos foram publicados na lista geral
        verify(messagingTemplate, times(2)).convertAndSend(eq("/topic/tickets"), any(TicketEvent.class));

        // Verifica que os tópicos de salas de chat específicas receberam as mensagens correspondentes
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/tickets/" + ticketId1), any(TicketEvent.class));
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/tickets/" + ticketId2), any(TicketEvent.class));
    }
}
