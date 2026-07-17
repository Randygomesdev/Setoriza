package br.com.innkercode.ticket.service.impl;

import br.com.innkercode.ticket.domain.entity.AiConfig;
import br.com.innkercode.ticket.domain.repository.AiConfigRepository;
import br.com.innkercode.ticket.service.AiConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AiConfigServiceImpl implements AiConfigService {

    private final AiConfigRepository aiConfigRepository;
    private final br.com.innkercode.ticket.client.GeminiClient geminiClient;
    private static final UUID CONFIG_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

    @Override
    @Transactional(readOnly = true)
    public AiConfig getConfig() {
        return aiConfigRepository.findById(CONFIG_ID)
                .orElseGet(() -> {
                    // Fallback de segurança se por algum motivo a migration não rodou no banco de testes
                    AiConfig defaultConfig = AiConfig.builder()
                            .id(CONFIG_ID)
                            .aiEnabled(false)
                            .autoTriageEnabled(false)
                            .chatbotEnabled(false)
                            .geminiApiKey(null)
                            .systemPrompt("Você é o atendente virtual do Setoriza. Seu objetivo é ajudar o cliente de forma educada, curta e prestativa.")
                            .build();
                    return aiConfigRepository.save(defaultConfig);
                });
    }

    @Override
    @Transactional
    public AiConfig updateConfig(AiConfig newConfig) {
        AiConfig existing = getConfig();
        existing.setAiEnabled(newConfig.isAiEnabled());
        existing.setAutoTriageEnabled(newConfig.isAutoTriageEnabled());
        existing.setChatbotEnabled(newConfig.isChatbotEnabled());
        existing.setGeminiApiKey(newConfig.getGeminiApiKey());
        existing.setSystemPrompt(newConfig.getSystemPrompt());
        return aiConfigRepository.save(existing);
    }

    @Override
    @Transactional(readOnly = true)
    public String testConnection() {
        return geminiClient.testApiConnection();
    }
}
