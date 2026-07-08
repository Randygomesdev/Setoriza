package br.com.innkercode.ticket.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

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

    public void sendTextMessage(String number, String text) {
        log.info("Enviando mensagem de texto para {}: {}", number, text);
        try {
            restClient.post()
                    .uri("/message/sendText/{instance}", instanceName)
                    .header("apikey", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "number", number,
                            "text", text
                    ))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Mensagem enviada com sucesso para {}", number);
        } catch (Exception e) {
            log.error("Erro ao enviar mensagem via Evolution API para {}", number, e);
        }
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
}
