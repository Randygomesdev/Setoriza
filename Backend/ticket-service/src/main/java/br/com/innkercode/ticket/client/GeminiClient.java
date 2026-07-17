package br.com.innkercode.ticket.client;

import br.com.innkercode.ticket.domain.entity.AiConfig;
import br.com.innkercode.ticket.dto.gemini.GeminiRequest;
import br.com.innkercode.ticket.dto.gemini.GeminiResponse;
import br.com.innkercode.ticket.domain.repository.AiConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class GeminiClient {

    private final AiConfigRepository aiConfigRepository;
    private final RestClient restClient = RestClient.builder().build();
    private static final UUID CONFIG_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

    /**
     * Envia uma requisição genérica de chat para o Gemini utilizando o prompt do sistema cadastrado.
     */
    public String generateContent(String userMessage) {
        AiConfig config = aiConfigRepository.findById(CONFIG_ID).orElse(null);
        if (config == null || !config.isAiEnabled() || config.getGeminiApiKey() == null || config.getGeminiApiKey().isBlank()) {
            log.warn("Integração com Gemini solicitada, mas a IA está desativada ou a chave de API está ausente.");
            return null;
        }

        return generate(userMessage, config.getSystemPrompt(), null);
    }

    /**
     * Envia uma requisição genérica com um prompt de sistema personalizado (usado na triagem).
     */
    public String generateContentWithCustomSystem(String userMessage, String customSystemPrompt, String responseMimeType) {
        AiConfig config = aiConfigRepository.findById(CONFIG_ID).orElse(null);
        if (config == null || !config.isAiEnabled() || config.getGeminiApiKey() == null || config.getGeminiApiKey().isBlank()) {
            log.warn("Integração com Gemini solicitada, mas a IA está desativada ou a chave de API está ausente.");
            return null;
        }

        return generate(userMessage, customSystemPrompt, responseMimeType);
    }

    private String generate(String userMessage, String systemPrompt, String responseMimeType) {
        try {
            AiConfig config = aiConfigRepository.findById(CONFIG_ID).orElse(null);
            if (config == null) return null;
            String apiKey = config.getGeminiApiKey();

            // Usamos o modelo gemini-3.5-flash pela alta velocidade e excelente custo-benefício.
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" + apiKey;

            GeminiRequest.Part userPart = new GeminiRequest.Part(userMessage);
            GeminiRequest.Content content = new GeminiRequest.Content(List.of(userPart));

            GeminiRequest.SystemInstruction systemInstruction = null;
            if (systemPrompt != null && !systemPrompt.isBlank()) {
                GeminiRequest.Part systemPart = new GeminiRequest.Part(systemPrompt);
                systemInstruction = new GeminiRequest.SystemInstruction(List.of(systemPart));
            }

            GeminiRequest.GenerationConfig generationConfig = null;
            if (responseMimeType != null && !responseMimeType.isBlank()) {
                generationConfig = new GeminiRequest.GenerationConfig(0.1, 2048, responseMimeType);
            } else {
                generationConfig = new GeminiRequest.GenerationConfig(0.5, 2048, null);
            }

            GeminiRequest requestPayload = new GeminiRequest(
                List.of(content),
                systemInstruction,
                generationConfig
            );

            GeminiResponse response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestPayload)
                    .retrieve()
                    .body(GeminiResponse.class);

            if (response != null && response.candidates() != null && !response.candidates().isEmpty()) {
                GeminiResponse.Candidate candidate = response.candidates().get(0);
                if (candidate.content() != null && candidate.content().parts() != null && !candidate.content().parts().isEmpty()) {
                    return candidate.content().parts().get(0).text();
                }
            }

            log.warn("A resposta da API do Gemini veio vazia ou em formato inesperado.");
            return null;

        } catch (Exception e) {
            log.error("Erro ao se comunicar com a API do Google Gemini: {}", e.getMessage(), e);
            return null;
        }
    }

    public String testApiConnection() {
        AiConfig config = aiConfigRepository.findById(CONFIG_ID).orElse(null);
        if (config == null || config.getGeminiApiKey() == null || config.getGeminiApiKey().isBlank()) {
            return "Chave de API ausente ou em branco.";
        }
        String response = generate("Olá, responda em no máximo 10 palavras confirmando que você é o Gemini e que a conexão de integração foi estabelecida com sucesso.", null, null);
        return (response != null && !response.isBlank()) ? response : "Falha ao obter resposta do Gemini.";
    }
}
