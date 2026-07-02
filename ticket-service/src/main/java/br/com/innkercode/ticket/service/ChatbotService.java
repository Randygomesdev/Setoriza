package br.com.innkercode.ticket.service;

import br.com.innkercode.ticket.client.EvolutionClient;
import br.com.innkercode.ticket.domain.entity.Ticket;
import br.com.innkercode.ticket.domain.model.MessageType;
import br.com.innkercode.ticket.domain.model.Sector;
import br.com.innkercode.ticket.domain.model.SenderType;
import br.com.innkercode.ticket.domain.model.TicketStatus;
import br.com.innkercode.ticket.dto.webhook.WebhookPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatbotService {

    private final TicketService ticketService;
    private final MessageService messageService;
    private final EvolutionClient evolutionClient;

    public void processIncomingWebhook(WebhookPayload payload) {
        if (payload == null || payload.getData() == null || payload.getData().getKey() == null) {
            log.warn("Payload de webhook inválido recebido.");
            return;
        }

        // Ignorar mensagens enviadas pela própria API (evita loops)
        if (payload.getData().getKey().isFromMe()) {
            log.debug("Ignorando mensagem enviada pela própria API (fromMe = true).");
            return;
        }

        String event = payload.getEvent();
        if (!"messages.upsert".equals(event)) {
            log.debug("Ignorando evento de webhook não suportado: {}", event);
            return;
        }

        String senderNumber = payload.getSender();
        if (senderNumber == null || senderNumber.isBlank()) {
            log.warn("Mensagem sem número de remetente.");
            return;
        }

        String textContent = extractTextContent(payload.getData().getMessage());
        if (textContent == null || textContent.isBlank()) {
            log.info("Mensagem recebida sem conteúdo de texto direto (pode ser mídia).");
            textContent = "[Mídia/Outro]";
        }

        String clientName = payload.getData().getPushName();

        // Buscar ticket ativo para o número
        Optional<Ticket> activeTicketOpt = ticketService.getActiveTicketByWhatsappNumber(senderNumber);

        if (activeTicketOpt.isEmpty()) {
            // Criar novo ticket de triagem e enviar menu inicial
            Ticket ticket = ticketService.createTriageTicket(senderNumber, clientName);
            messageService.saveMessage(ticket, SenderType.CLIENTE, MessageType.TEXTO, textContent);

            sendTriageMenu(senderNumber);
        } else {
            Ticket ticket = activeTicketOpt.get();
            messageService.saveMessage(ticket, SenderType.CLIENTE, MessageType.TEXTO, textContent);

            if (ticket.getStatus() == TicketStatus.TRIAGEM) {
                handleTriageInput(ticket, textContent);
            } else {
                log.info("Ticket {} ativo em status {}, mensagem recebida: {}", ticket.getId(), ticket.getStatus(), textContent);
            }
        }
    }

    private String extractTextContent(WebhookPayload.WebhookMessage msg) {
        if (msg == null) return null;
        if (msg.getConversation() != null) {
            return msg.getConversation();
        }
        if (msg.getExtendedTextMessage() != null && msg.getExtendedTextMessage().getText() != null) {
            return msg.getExtendedTextMessage().getText();
        }
        return null;
    }

    private void sendTriageMenu(String whatsappNumber) {
        String menu = "Olá! Para iniciarmos seu atendimento, escolha uma das opções abaixo:\n" +
                "1 - Fiscal\n" +
                "2 - DP (Departamento Pessoal)\n" +
                "3 - Contábil\n" +
                "4 - Societário";
        evolutionClient.sendTextMessage(whatsappNumber, menu);
    }

    private void handleTriageInput(Ticket ticket, String input) {
        String cleanInput = input.trim();
        Sector selectedSector = null;

        if ("1".equals(cleanInput)) {
            selectedSector = Sector.FISCAL;
        } else if ("2".equals(cleanInput)) {
            selectedSector = Sector.DEPARTAMENTO_PESSOAL;
        } else if ("3".equals(cleanInput)) {
            selectedSector = Sector.CONTABIL;
        } else if ("4".equals(cleanInput)) {
            selectedSector = Sector.SOCIETARIO;
        }

        if (selectedSector != null) {
            ticketService.updateSector(ticket.getId(), selectedSector);

            String friendlyName = getSectorFriendlyName(selectedSector);
            String confirmationMessage = String.format(
                    "Entendi! Você foi encaminhado para o setor de %s. Aguarde que logo um atendente irá falar com você.",
                    friendlyName
            );
            evolutionClient.sendTextMessage(ticket.getWhatsappNumber(), confirmationMessage);
        } else {
            // Opção inválida, envia novamente o menu
            String invalidMessage = "Opção inválida. Por favor digite o número correspondente ao setor desejado:\n" +
                    "1 - Fiscal\n" +
                    "2 - DP (Departamento Pessoal)\n" +
                    "3 - Contábil\n" +
                    "4 - Societário";
            evolutionClient.sendTextMessage(ticket.getWhatsappNumber(), invalidMessage);
        }
    }

    private String getSectorFriendlyName(Sector sector) {
        return switch (sector) {
            case FISCAL -> "Fiscal";
            case DEPARTAMENTO_PESSOAL -> "DP (Departamento Pessoal)";
            case CONTABIL -> "Contábil";
            case SOCIETARIO -> "Societário";
        };
    }
}
