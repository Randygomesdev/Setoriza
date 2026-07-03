package br.com.innkercode.ticket.controller;

import br.com.innkercode.ticket.dto.webhook.WebhookPayload;
import br.com.innkercode.ticket.service.ChatbotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/webhooks")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final ChatbotService chatbotService;

    @PostMapping("/evolution")
    public ResponseEntity<Void> receiveEvolutionWebhook(@RequestBody WebhookPayload payload) {
        log.info("Recebido webhook da Evolution API: Evento = {}", payload.getEvent());
        try {
            chatbotService.processIncomingWebhook(payload);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erro ao processar webhook da Evolution API", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
