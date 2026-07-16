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
        private String keyId;
        private String remoteJid;
        private boolean fromMe;
        private String status;
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
        private ReactionMessage reactionMessage;
        private ProtocolMessage protocolMessage;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ExtendedTextMessage {
        private String text;
        private ContextInfo contextInfo;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ContextInfo {
        private String stanzaId;
        private String participant;
        private WebhookMessage quotedMessage;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ReactionMessage {
        private WebhookKey key;
        private String text;
        private Long senderTimestampMs;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ProtocolMessage {
        private WebhookKey key;
        private String type;
        private WebhookMessage editedMessage;
    }
}
