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
}
