package br.com.innkercode.ticket.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class EvolutionClient {

    private final RestClient restClient;

    @Value("${whatsapp.evolution.instance:setoriza}")
    private String instanceName;

    @Value("${whatsapp.evolution.apikey}")
    private String apiKey;

    public EvolutionClient(@Value("${whatsapp.evolution.url}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public String getInstanceName() {
        return this.instanceName;
    }

    @SuppressWarnings("unchecked")
    public String sendTextMessage(String number, String text) {
        log.info("Enviando mensagem de texto para {}: {}", number, text);
        try {
            Map<String, Object> response = restClient.post()
                    .uri("/message/sendText/{instance}", instanceName)
                    .header("apikey", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "number", number,
                            "text", text
                    ))
                    .retrieve()
                    .body(Map.class);
            log.info("Mensagem enviada com sucesso para {}", number);
            if (response != null && response.containsKey("key")) {
                Map<String, Object> key = (Map<String, Object>) response.get("key");
                if (key != null && key.containsKey("id")) {
                    return (String) key.get("id");
                }
            }
        } catch (Exception e) {
            log.error("Erro ao enviar mensagem via Evolution API para {}", number, e);
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    public String sendMediaMessage(String number, String mediaUrl, String mediatype, String mimetype, String filename, String caption) {
        boolean isUrl = mediaUrl != null && (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://"));
        log.info("Enviando mensagem de mídia ({}) para {}. É URL? {}", mediatype, number, isUrl);
        
        String resolvedMedia = mediaUrl;
        if (isUrl && resolvedMedia.contains("localhost:9000")) {
            resolvedMedia = resolvedMedia.replace("localhost:9000", "minio.local:9000");
        }
        
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("number", number);
            body.put("mediatype", mediatype);
            body.put("mimetype", mimetype);
            body.put("media", resolvedMedia);
            if (filename != null && !filename.isBlank()) {
                body.put("fileName", filename);
            }
            if (caption != null && !caption.isBlank()) {
                body.put("caption", caption);
            }
            
            Map<String, Object> response = restClient.post()
                    .uri("/message/sendMedia/{instance}", instanceName)
                    .header("apikey", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            log.info("Mídia enviada com sucesso para {}", number);
            if (response != null && response.containsKey("key")) {
                Map<String, Object> key = (Map<String, Object>) response.get("key");
                if (key != null && key.containsKey("id")) {
                    return (String) key.get("id");
                }
            }
        } catch (Exception e) {
            log.error("Erro ao enviar mídia via Evolution API para {}", number, e);
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    public String sendWhatsAppAudio(String number, String mediaUrl) {
        log.info("Enviando áudio PTT via Evolution API para {}", number);
        
        String resolvedMedia = mediaUrl;
        if (resolvedMedia != null && resolvedMedia.contains("localhost:9000")) {
            resolvedMedia = resolvedMedia.replace("localhost:9000", "minio.local:9000");
        }
        
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("number", number);
            body.put("audio", resolvedMedia);
            body.put("delay", 1200);
            body.put("encoding", true);
            
            Map<String, Object> response = restClient.post()
                    .uri("/message/sendWhatsAppAudio/{instance}", instanceName)
                    .header("apikey", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            log.info("Áudio PTT enviado com sucesso para {}", number);
            if (response != null && response.containsKey("key")) {
                Map<String, Object> key = (Map<String, Object>) response.get("key");
                if (key != null && key.containsKey("id")) {
                    return (String) key.get("id");
                }
            }
        } catch (Exception e) {
            log.error("Erro ao enviar áudio PTT via Evolution API para {}", number, e);
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getConnectionState() {
        try {
            return restClient.get()
                    .uri("/instance/connectionState/{instance}", instanceName)
                    .header("apikey", apiKey)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.error("Erro ao obter estado de conexão da Evolution API", e);
            return Map.of("instance", Map.of("state", "OFFLINE"));
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> createInstance() {
        try {
            return restClient.post()
                    .uri("/instance/create")
                    .header("apikey", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "instanceName", instanceName,
                            "qrcode", true,
                            "integration", "WHATSAPP-BAILEYS"
                    ))
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.error("Erro ao criar instância na Evolution API", e);
            throw new RuntimeException("Erro ao criar instância: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getQrCode() {
        try {
            return restClient.get()
                    .uri("/instance/connect/{instance}", instanceName)
                    .header("apikey", apiKey)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.error("Erro ao obter QR Code da Evolution API", e);
            throw new RuntimeException("Erro ao obter QR Code: " + e.getMessage());
        }
    }

    public void logoutInstance() {
        try {
            restClient.post()
                    .uri("/instance/logout/{instance}", instanceName)
                    .header("apikey", apiKey)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.error("Erro ao desconectar instância na Evolution API", e);
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> registerWebhook(String serverUrl) {
        try {
            String webhookUrl = serverUrl + "/api/v1/webhooks/evolution";
            log.info("Registrando webhook na Evolution API: {}", webhookUrl);
            
            Map<String, Object> webhookData = Map.of(
                    "enabled", true,
                    "url", webhookUrl,
                    "byEvents", false,
                    "events", List.of("MESSAGES_UPSERT", "MESSAGES_UPDATE"),
                    "headers", Map.of("apikey", apiKey)
            );
            
            return restClient.post()
                    .uri("/webhook/set/{instance}", instanceName)
                    .header("apikey", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("webhook", webhookData))
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.error("Erro ao registrar webhook na Evolution API", e);
            throw new RuntimeException("Erro ao registrar webhook: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public String getBase64FromMediaMessage(Object messageData) {
        try {
            Object finalMessage = messageData;
            if (messageData instanceof br.com.innkercode.ticket.dto.webhook.WebhookPayload.WebhookData data) {
                finalMessage = Map.of(
                        "key", Map.of(
                                "id", data.getKey().getId(),
                                "remoteJid", data.getKey().getRemoteJid(),
                                "fromMe", data.getKey().isFromMe()
                        )
                );
            }
            
            Map<String, Object> body = Map.of(
                    "message", finalMessage,
                    "convertToMp4", false
            );
            
            Map<String, Object> response = restClient.post()
                    .uri("/chat/getBase64FromMediaMessage/{instance}", instanceName)
                    .header("apikey", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            
            if (response != null && response.containsKey("base64")) {
                return (String) response.get("base64");
            }
            if (response != null && response.containsKey("response") && response.get("response") instanceof Map) {
                Map<String, Object> respMap = (Map<String, Object>) response.get("response");
                if (respMap.containsKey("base64")) {
                    return (String) respMap.get("base64");
                }
            }
            log.warn("Evolution API não retornou base64 para a mensagem de mídia.");
        } catch (Exception e) {
            log.error("Erro ao chamar getBase64FromMediaMessage", e);
        }
        return null;
    }
}
