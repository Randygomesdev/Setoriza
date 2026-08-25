package br.com.innkercode.ticket.service;

import br.com.innkercode.ticket.domain.entity.AiConfig;

public interface AiConfigService {
    AiConfig getConfig();
    AiConfig updateConfig(AiConfig config);
    String testConnection();
}
