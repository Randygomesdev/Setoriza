package br.com.innkercode.ticket.service.impl;

import br.com.innkercode.ticket.client.EvolutionClient;
import br.com.innkercode.ticket.client.MetaWhatsAppClient;
import br.com.innkercode.ticket.domain.entity.WhatsAppConfig;
import br.com.innkercode.ticket.domain.model.WhatsAppApiType;
import br.com.innkercode.ticket.domain.repository.WhatsAppConfigRepository;
import br.com.innkercode.ticket.service.WhatsAppGatewayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppGatewayServiceImpl implements WhatsAppGatewayService {

    private final EvolutionClient evolutionClient;
    private final MetaWhatsAppClient metaWhatsAppClient;
    private final WhatsAppConfigRepository whatsAppConfigRepository;

    private static final UUID GLOBAL_CONFIG_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    @Override
    public String sendTextMessage(String number, String text) {
        WhatsAppConfig config = getGlobalConfig();
        log.info("Roteando mensagem de texto para {} via {}", number, config.getApiType());
        
        if (config.getApiType() == WhatsAppApiType.META) {
            return metaWhatsAppClient.sendTextMessage(config, number, text);
        } else {
            return evolutionClient.sendTextMessage(number, text);
        }
    }

    @Override
    public String sendMediaMessage(String number, String mediaUrl, String mediatype, String mimetype, String filename, String caption) {
        WhatsAppConfig config = getGlobalConfig();
        log.info("Roteando mensagem de mídia ({}) para {} via {}", mediatype, number, config.getApiType());
        
        if (config.getApiType() == WhatsAppApiType.META) {
            return metaWhatsAppClient.sendMediaMessage(config, number, mediaUrl, mediatype, mimetype, filename, caption);
        } else {
            return evolutionClient.sendMediaMessage(number, mediaUrl, mediatype, mimetype, filename, caption);
        }
    }

    @Override
    public String sendWhatsAppAudio(String number, String mediaUrl) {
        WhatsAppConfig config = getGlobalConfig();
        log.info("Roteando áudio PTT para {} via {}", number, config.getApiType());
        
        if (config.getApiType() == WhatsAppApiType.META) {
            return metaWhatsAppClient.sendWhatsAppAudio(config, number, mediaUrl);
        } else {
            return evolutionClient.sendWhatsAppAudio(number, mediaUrl);
        }
    }

    @Override
    public byte[] downloadMedia(Object messageData, String mediaIdOrUrl) {
        WhatsAppConfig config = getGlobalConfig();
        log.info("Roteando download de mídia via {}", config.getApiType());
        
        if (config.getApiType() == WhatsAppApiType.META) {
            return metaWhatsAppClient.downloadMedia(config, mediaIdOrUrl);
        } else {
            String base64Data = evolutionClient.getBase64FromMediaMessage(messageData);
            if (base64Data == null || base64Data.isBlank()) {
                return null;
            }
            
            if (base64Data.contains("base64,")) {
                String base64Str = base64Data.split("base64,")[1];
                return java.util.Base64.getDecoder().decode(base64Str.trim());
            } else {
                return java.util.Base64.getDecoder().decode(base64Data.trim());
            }
        }
    }

    private WhatsAppConfig getGlobalConfig() {
        return whatsAppConfigRepository.findById(GLOBAL_CONFIG_ID)
                .orElseGet(() -> WhatsAppConfig.builder()
                        .id(GLOBAL_CONFIG_ID)
                        .apiType(WhatsAppApiType.EVOLUTION)
                        .build());
    }
}
