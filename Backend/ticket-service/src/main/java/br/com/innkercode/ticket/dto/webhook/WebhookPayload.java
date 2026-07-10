package br.com.innkercode.ticket.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class WebhookPayload {

    private String event;
    private String instance;
    private String sender;
    private WebhookData data;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class WebhookData {
        private WebhookKey key;
        private String pushName;
        private String messageType;
        private WebhookMessage message;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class WebhookKey {
        private String remoteJid;
        private boolean fromMe;
        private String id;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class WebhookMessage {
        private String conversation;
        private ExtendedTextMessage extendedTextMessage;
        private Map<String, Object> imageMessage;
        private Map<String, Object> audioMessage;
        private Map<String, Object> videoMessage;
        private Map<String, Object> documentMessage;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ExtendedTextMessage {
        private String text;
    }
}
