package br.com.innkercode.ticket.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class TicketEventPublisher {

    private final StringRedisTemplate stringRedisTemplate;
    private final ChannelTopic ticketTopic;
    private final ObjectMapper objectMapper;

    public void publish(String type, String ticketId, Object payload) {
        try {
            TicketEvent event = TicketEvent.builder()
                    .type(type)
                    .ticketId(ticketId)
                    .payload(payload)
                    .build();

            String jsonEvent = objectMapper.writeValueAsString(event);
            log.info("Publicando evento Redis PubSub [{}]: {}", type, jsonEvent);
            stringRedisTemplate.convertAndSend(ticketTopic.getTopic(), jsonEvent);
        } catch (Exception e) {
            log.error("Erro ao publicar evento no Redis PubSub", e);
        }
    }
}
