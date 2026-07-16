package br.com.innkercode.ticket.client;

import br.com.innkercode.ticket.domain.entity.WhatsAppConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;

@Component
@Slf4j
public class MetaWhatsAppClient {

    private final RestClient restClient;

    @Value("${whatsapp.meta.phone-number-id:}")
    private String defaultPhoneNumberId;

    @Value("${whatsapp.meta.access-token:}")
    private String defaultAccessToken;

    public MetaWhatsAppClient(@Value("${whatsapp.meta.url:https://graph.facebook.com/v19.0}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public String sendTextMessage(WhatsAppConfig config, String number, String text) {
        String phoneNumberId = getPhoneNumberId(config);
        String accessToken = getAccessToken(config);

        if (phoneNumberId == null || phoneNumberId.isBlank() || accessToken == null || accessToken.isBlank()) {
            log.error("Configurações da Meta API ausentes para o envio de mensagem.");
            return null;
        }

        log.info("Enviando mensagem de texto Meta API para {} usando PhoneID {}", number, phoneNumberId);

        try {
            Map<String, Object> body = Map.of(
                    "messaging_product", "whatsapp",
                    "recipient_type", "individual",
                    "to", number,
                    "type", "text",
                    "text", Map.of(
                            "preview_url", false,
                            "body", text
                    )
            );

            Map<?, ?> response = restClient.post()
                    .uri("/{phoneNumberId}/messages", phoneNumberId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            log.info("Mensagem enviada com sucesso via Meta API");
            return extractMessageId(response);
        } catch (Exception e) {
            log.error("Erro ao enviar mensagem de texto via Meta API para {}", number, e);
            return null;
        }
    }

    public String sendMediaMessage(WhatsAppConfig config, String number, String mediaUrl, String mediatype, String mimetype, String filename, String caption) {
        String phoneNumberId = getPhoneNumberId(config);
        String accessToken = getAccessToken(config);

        if (phoneNumberId == null || phoneNumberId.isBlank() || accessToken == null || accessToken.isBlank()) {
            log.error("Configurações da Meta API ausentes para o envio de mídia.");
            return null;
        }

        log.info("Enviando mídia {} Meta API para {} usando PhoneID {}", mediatype, number, phoneNumberId);

        try {
            String metaMediaType = "image".equalsIgnoreCase(mediatype) ? "image" : "document";
            Map<String, Object> mediaObject = new HashMap<>();
            mediaObject.put("link", mediaUrl);
            if (caption != null && !caption.isBlank()) {
                mediaObject.put("caption", caption);
            }
            if ("document".equals(metaMediaType) && filename != null && !filename.isBlank()) {
                mediaObject.put("filename", filename);
            }

            Map<String, Object> body = Map.of(
                    "messaging_product", "whatsapp",
                    "recipient_type", "individual",
                    "to", number,
                    "type", metaMediaType,
                    metaMediaType, mediaObject
            );

            Map<?, ?> response = restClient.post()
                    .uri("/{phoneNumberId}/messages", phoneNumberId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            log.info("Mídia enviada com sucesso via Meta API");
            return extractMessageId(response);
        } catch (Exception e) {
            log.error("Erro ao enviar mídia via Meta API para {}", number, e);
            return null;
        }
    }

    public String sendWhatsAppAudio(WhatsAppConfig config, String number, String mediaUrl) {
        String phoneNumberId = getPhoneNumberId(config);
        String accessToken = getAccessToken(config);

        if (phoneNumberId == null || phoneNumberId.isBlank() || accessToken == null || accessToken.isBlank()) {
            log.error("Configurações da Meta API ausentes para o envio de áudio.");
            return null;
        }

        log.info("Enviando áudio PTT Meta API para {} usando PhoneID {}", number, phoneNumberId);

        try {
            Map<String, Object> body = Map.of(
                    "messaging_product", "whatsapp",
                    "recipient_type", "individual",
                    "to", number,
                    "type", "audio",
                    "audio", Map.of("link", mediaUrl)
            );

            Map<?, ?> response = restClient.post()
                    .uri("/{phoneNumberId}/messages", phoneNumberId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            log.info("Áudio PTT enviado com sucesso via Meta API");
            return extractMessageId(response);
        } catch (Exception e) {
            log.error("Erro ao enviar áudio via Meta API para {}", number, e);
            return null;
        }
    }

    public byte[] downloadMedia(WhatsAppConfig config, String mediaId) {
        String accessToken = getAccessToken(config);
        if (accessToken == null || accessToken.isBlank() || mediaId == null || mediaId.isBlank()) {
            log.error("Configurações da Meta API ou mediaId ausentes para download.");
            return null;
        }

        try {
            log.info("Obtendo URL de download da mídia Meta: {}", mediaId);
            Map<?, ?> mediaMetadata = restClient.get()
                    .uri("/{mediaId}", mediaId)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(Map.class);

            if (mediaMetadata == null || !mediaMetadata.containsKey("url")) {
                log.warn("URL de mídia não retornada pela Meta API.");
                return null;
            }

            String downloadUrl = (String) mediaMetadata.get("url");
            log.info("Baixando bytes da mídia Meta a partir de: {}", downloadUrl);

            RestClient downloadClient = RestClient.builder().baseUrl(downloadUrl).build();
            return downloadClient.get()
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(byte[].class);
        } catch (Exception e) {
            log.error("Erro ao baixar mídia da Meta API (ID: {})", mediaId, e);
            return null;
        }
    }

    private String getPhoneNumberId(WhatsAppConfig config) {
        if (config != null && config.getMetaPhoneNumberId() != null && !config.getMetaPhoneNumberId().isBlank()) {
            return config.getMetaPhoneNumberId();
        }
        return defaultPhoneNumberId;
    }

    private String getAccessToken(WhatsAppConfig config) {
        if (config != null && config.getMetaAccessToken() != null && !config.getMetaAccessToken().isBlank()) {
            return config.getMetaAccessToken();
        }
        return defaultAccessToken;
    }

    @SuppressWarnings("unchecked")
    private String extractMessageId(Map<?, ?> response) {
        if (response != null && response.containsKey("messages")) {
            java.util.List<Map<String, Object>> messages = (java.util.List<Map<String, Object>>) response.get("messages");
            if (messages != null && !messages.isEmpty()) {
                Map<String, Object> firstMsg = messages.get(0);
                if (firstMsg != null && firstMsg.containsKey("id")) {
                    return (String) firstMsg.get("id");
                }
            }
        }
        return null;
    }
}
