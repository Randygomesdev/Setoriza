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

    @Value("${whatsapp.evolution.apikey}")
    private String expectedApiKey;

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
}
