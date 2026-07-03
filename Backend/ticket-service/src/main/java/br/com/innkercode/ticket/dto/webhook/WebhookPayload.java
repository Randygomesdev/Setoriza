package br.com.innkercode.ticket.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

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
        private MediaMessage imageMessage;
        private MediaMessage audioMessage;
        private MediaMessage videoMessage;
        private MediaMessage documentMessage;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ExtendedTextMessage {
        private String text;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MediaMessage {
        private String url;
        private String mimetype;
        private String caption;
        private String fileName;
    }
}
