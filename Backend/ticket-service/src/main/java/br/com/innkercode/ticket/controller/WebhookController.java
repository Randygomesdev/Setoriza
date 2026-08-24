package br.com.innkercode.ticket.controller;

import br.com.innkercode.ticket.dto.webhook.WebhookPayload;
import br.com.innkercode.ticket.service.ChatbotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/webhooks")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final ChatbotService chatbotService;

    private final br.com.innkercode.ticket.domain.repository.WhatsAppConfigRepository whatsAppConfigRepository;
    private static final java.util.UUID GLOBAL_CONFIG_ID = java.util.UUID.fromString("00000000-0000-0000-0000-000000000000");

    @Value("${whatsapp.evolution.apikey}")
    private String expectedApiKey;

    @Value("${whatsapp.meta.verify-token:setoriza_verify_token_123}")
    private String expectedMetaVerifyToken;

    @PostMapping("/evolution")
    public ResponseEntity<Void> receiveEvolutionWebhook(
            @RequestHeader(value = "apikey", required = false) String incomingApiKey,
            @RequestBody WebhookPayload payload
    ) {
        log.info("Recebido webhook da Evolution API: Evento = {}", payload.getEvent());

        if (incomingApiKey == null || !incomingApiKey.equals(expectedApiKey)) {
            log.warn("Tentativa de chamada de webhook rejeitada: apikey ausente ou inválida.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            chatbotService.processIncomingWebhook(payload);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erro ao processar webhook da Evolution API", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/meta")
    public ResponseEntity<String> verifyMetaWebhook(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.challenge") String challenge,
            @RequestParam("hub.verify_token") String verifyToken
    ) {
        log.info("Recebido pedido de verificação de Webhook Meta: mode={}, verifyToken={}", mode, verifyToken);

        String dbVerifyToken = whatsAppConfigRepository.findById(GLOBAL_CONFIG_ID)
                .map(br.com.innkercode.ticket.domain.entity.WhatsAppConfig::getMetaVerifyToken)
                .orElse(null);

        boolean tokenMatches = expectedMetaVerifyToken.equals(verifyToken) || 
                             (dbVerifyToken != null && dbVerifyToken.equals(verifyToken));

        if ("subscribe".equals(mode) && tokenMatches) {
            log.info("Webhook Meta verificado com sucesso!");
            return ResponseEntity.ok(challenge);
        } else {
            log.warn("Falha na verificação do Webhook Meta: token incorreto ou modo inválido.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @PostMapping("/meta")
    public ResponseEntity<Void> receiveMetaWebhook(
            @RequestBody java.util.Map<String, Object> payload
    ) {
        log.info("Recebido webhook da Meta API. Payload: {}", payload);
        try {
            chatbotService.processIncomingMetaWebhook(payload);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erro ao processar webhook da Meta API", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
