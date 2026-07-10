package br.com.innkercode.ticket.service;

import br.com.innkercode.ticket.client.EvolutionClient;
import br.com.innkercode.ticket.domain.entity.Client;
import br.com.innkercode.ticket.domain.entity.ClientContact;
import br.com.innkercode.ticket.domain.entity.Sector;
import br.com.innkercode.ticket.domain.entity.Ticket;
import br.com.innkercode.ticket.domain.model.MessageType;
import br.com.innkercode.ticket.domain.model.SenderType;
import br.com.innkercode.ticket.domain.model.TicketStatus;
import br.com.innkercode.ticket.domain.repository.ClientContactRepository;
import br.com.innkercode.ticket.domain.repository.ClientRepository;
import br.com.innkercode.ticket.domain.repository.SectorRepository;
import br.com.innkercode.ticket.dto.webhook.WebhookPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatbotService {

    private final TicketService ticketService;
    private final MessageService messageService;
    private final EvolutionClient evolutionClient;
    private final S3Service s3Service;
    
    private final ClientRepository clientRepository;
    private final ClientContactRepository clientContactRepository;
    private final SectorRepository sectorRepository;

    @Value("${whatsapp.evolution.apikey}")
    private String apiKey;

    private final RestClient restClient = RestClient.create();

    public void processIncomingWebhook(WebhookPayload payload) {
        if (payload == null || payload.getData() == null || payload.getData().getKey() == null) {
            log.warn("Payload de webhook inválido recebido.");
            return;
        }

        log.info("Processando webhook da Evolution API: Evento={}, ID={}, Remetente={}", 
                payload.getEvent(), 
                payload.getData().getKey().getId(), 
                payload.getData().getKey().getRemoteJid());

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

        String remoteJid = payload.getData().getKey().getRemoteJid();
        if (remoteJid == null || remoteJid.isBlank()) {
            log.warn("Mensagem sem JID de remetente.");
            return;
        }

        if (remoteJid.contains("@g.us")) {
            log.debug("Ignorando mensagem de grupo: {}", remoteJid);
            return;
        }

        String senderNumber = remoteJid.contains("@") ? remoteJid.split("@")[0] : remoteJid;

        // Determinar o tipo da mensagem e conteúdo
        MessageType messageType = MessageType.TEXTO;
        String content = extractTextContent(payload.getData().getMessage());

        // Verificar se é uma mensagem de mídia
        String mediaUrl = handleMediaMessage(payload.getData(), payload.getData().getMessage());
        if (mediaUrl != null) {
            content = mediaUrl;
            messageType = determineMessageType(payload.getData().getMessage());
        }

        if (content == null || content.isBlank()) {
            log.info("Mensagem recebida sem conteúdo de texto direto e sem mídia válida.");
            content = "[Mensagem não suportada]";
        }

        String clientName = payload.getData().getPushName();

        // 1. Verificar se o número de WhatsApp pertence a algum contato já cadastrado
        Optional<ClientContact> contactOpt = clientContactRepository.findByWhatsappNumber(senderNumber);

        if (contactOpt.isEmpty()) {
            // Caso não tenha vínculo cadastrado
            handleUnknownContact(senderNumber, clientName, messageType, content);
        } else {
            // Caso já tenha vínculo cadastrado
            ClientContact contact = contactOpt.get();
            handleKnownContact(contact, messageType, content, clientName);
        }
    }

    private void handleUnknownContact(String senderNumber, String clientName, MessageType messageType, String content) {
        Optional<Ticket> activeTicketOpt = ticketService.getActiveTicketByWhatsappNumber(senderNumber);

        if (activeTicketOpt.isEmpty()) {
            // Primeiro contato deste número: inicia identificação pedindo CNPJ
            Ticket ticket = ticketService.createIdentificationTicket(senderNumber, clientName);
            messageService.saveMessage(ticket, SenderType.CLIENTE, messageType, content);
            
            sendCnpjRequest(ticket);
        } else {
            Ticket ticket = activeTicketOpt.get();
            messageService.saveMessage(ticket, SenderType.CLIENTE, messageType, content);

            if (ticket.getStatus() == TicketStatus.IDENTIFICACAO_CNPJ) {
                if (messageType == MessageType.TEXTO) {
                    handleCnpjInput(ticket, content, clientName);
                } else {
                    String botMsg = "Por favor, informe o CNPJ da sua empresa (somente números) em formato de texto para podermos identificar seu cadastro.";
                    messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, botMsg);
                    evolutionClient.sendTextMessage(ticket.getWhatsappNumber(), botMsg);
                }
            } else {
                log.warn("Ticket {} de número desconhecido está em status inesperado: {}", ticket.getId(), ticket.getStatus());
            }
        }
    }

    private void handleKnownContact(ClientContact contact, MessageType messageType, String content, String clientName) {
        Optional<Ticket> activeTicketOpt = ticketService.getActiveTicketByWhatsappNumber(contact.getWhatsappNumber());

        if (activeTicketOpt.isEmpty()) {
            // Abre novo ticket direto em TRIAGEM associado à empresa do contato
            Ticket ticket = ticketService.createTriageTicket(contact.getWhatsappNumber(), clientName, contact.getClient().getId());
            messageService.saveMessage(ticket, SenderType.CLIENTE, messageType, content);

            sendTriageMenu(ticket, contact.getClient().getCompanyName());
        } else {
            Ticket ticket = activeTicketOpt.get();
            messageService.saveMessage(ticket, SenderType.CLIENTE, messageType, content);

            if (ticket.getStatus() == TicketStatus.TRIAGEM) {
                if (messageType == MessageType.TEXTO) {
                    handleTriageInput(ticket, content);
                } else {
                    String botMsg = "Por favor, digite apenas o número da opção desejada para direcionarmos seu contato.";
                    messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, botMsg);
                    evolutionClient.sendTextMessage(ticket.getWhatsappNumber(), botMsg);
                }
            } else {
                log.info("Ticket {} ativo em status {}, mensagem recebida.", ticket.getId(), ticket.getStatus());
            }
        }
    }

    private void sendCnpjRequest(Ticket ticket) {
        String msg = "Olá! Não identifiquei o seu número em nosso cadastro de atendimentos.\n\n" +
                     "Por favor, digite o *CNPJ da sua empresa* (somente números) para que eu possa localizar o seu cadastro:";
        messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, msg);
        evolutionClient.sendTextMessage(ticket.getWhatsappNumber(), msg);
    }

    private void handleCnpjInput(Ticket ticket, String input, String pushName) {
        String cleanCnpj = input.replaceAll("\\D", ""); // Apenas números
        log.info("Processando tentativa de identificação por CNPJ: '{}' para o ticket {}", cleanCnpj, ticket.getId());

        Optional<Client> clientOpt = clientRepository.findByCnpj(cleanCnpj);

        if (clientOpt.isPresent()) {
            Client client = clientOpt.get();
            log.info("Empresa cadastrada identificada: {} (ID: {})", client.getCompanyName(), client.getId());

            // 1. Criar o vínculo do contato
            ClientContact newContact = ClientContact.builder()
                    .client(client)
                    .whatsappNumber(ticket.getWhatsappNumber())
                    .contactName(pushName != null ? pushName : "Funcionário")
                    .build();
            clientContactRepository.save(newContact);

            // 2. Promover ticket para TRIAGEM e associar cliente
            ticketService.promoteToTriage(ticket.getId(), client.getId());

            // 3. Enviar mensagem de sucesso e menu de triagem
            sendTriageMenu(ticket, client.getCompanyName());
        } else {
            log.warn("CNPJ {} não cadastrado no sistema.", cleanCnpj);
            String errorMsg = "⚠️ Desculpe, não localizei nenhuma empresa cadastrada com o CNPJ informado.\n\n" +
                              "Por favor, verifique o número e digite novamente (somente números), ou entre em contato com nosso suporte administrativo para atualizar o cadastro.";
            messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, errorMsg);
            evolutionClient.sendTextMessage(ticket.getWhatsappNumber(), errorMsg);
        }
    }

    private void sendTriageMenu(Ticket ticket, String companyName) {
        List<Sector> activeSectors = sectorRepository.findByActiveTrue();

        if (activeSectors.isEmpty()) {
            String errorMsg = "Olá! Identificamos a empresa " + companyName + ".\n\n" +
                              "Infelizmente não há nenhum setor de atendimento configurado no momento. Por favor, aguarde ou fale com o administrador.";
            messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, errorMsg);
            evolutionClient.sendTextMessage(ticket.getWhatsappNumber(), errorMsg);
            return;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("Empresa *").append(companyName).append("* identificada com sucesso! Seu número foi vinculado ao cadastro.\n\n");
        sb.append("Para iniciarmos seu atendimento, escolha uma das opções de setores abaixo:\n");
        
        for (int i = 0; i < activeSectors.size(); i++) {
            sb.append(i + 1).append(" - ").append(activeSectors.get(i).getFriendlyName()).append("\n");
        }

        String triageMsg = sb.toString();
        messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, triageMsg);
        evolutionClient.sendTextMessage(ticket.getWhatsappNumber(), triageMsg);
    }

    private void handleTriageInput(Ticket ticket, String input) {
        List<Sector> activeSectors = sectorRepository.findByActiveTrue();
        String cleanInput = input.trim();
        int option = -1;

        try {
            option = Integer.parseInt(cleanInput);
        } catch (NumberFormatException e) {
            // Não é um número válido
        }

        if (option >= 1 && option <= activeSectors.size()) {
            Sector selectedSector = activeSectors.get(option - 1);
            ticketService.updateSector(ticket.getId(), selectedSector);

            String confirmationMessage = String.format(
                    "Entendi! Você foi encaminhado para o setor de *%s*. Aguarde que logo um atendente irá falar com você.",
                    selectedSector.getFriendlyName()
            );
            messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, confirmationMessage);
            evolutionClient.sendTextMessage(ticket.getWhatsappNumber(), confirmationMessage);
        } else {
            // Entrada inválida, reenviar menu
            sendInvalidOptionMenu(ticket, activeSectors);
        }
    }

    private void sendInvalidOptionMenu(Ticket ticket, List<Sector> activeSectors) {
        StringBuilder sb = new StringBuilder();
        sb.append("❌ Opção inválida. Por favor, digite apenas o número correspondente ao setor desejado:\n\n");
        for (int i = 0; i < activeSectors.size(); i++) {
            sb.append(i + 1).append(" - ").append(activeSectors.get(i).getFriendlyName()).append("\n");
        }
        String invalidMsg = sb.toString();
        messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, invalidMsg);
        evolutionClient.sendTextMessage(ticket.getWhatsappNumber(), invalidMsg);
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

    private MessageType determineMessageType(WebhookPayload.WebhookMessage msg) {
        if (msg == null) return MessageType.TEXTO;
        if (msg.getImageMessage() != null) return MessageType.IMAGEM;
        if (msg.getAudioMessage() != null || msg.getVideoMessage() != null || msg.getDocumentMessage() != null) {
            return MessageType.DOCUMENTO;
        }
        return MessageType.TEXTO;
    }

    private String handleMediaMessage(Object messageData, WebhookPayload.WebhookMessage msg) {
        if (msg == null) return null;

        Map<String, Object> media = null;
        if (msg.getImageMessage() != null) {
            media = msg.getImageMessage();
        } else if (msg.getAudioMessage() != null) {
            media = msg.getAudioMessage();
        } else if (msg.getVideoMessage() != null) {
            media = msg.getVideoMessage();
        } else if (msg.getDocumentMessage() != null) {
            media = msg.getDocumentMessage();
        }

        if (media == null) {
            return null;
        }

        try {
            log.info("Mídia encontrada no payload (chaves: {}). Buscando Base64 no WhatsApp Gateway...", media.keySet());
            Object mKey = media.get("mediaKey");
            if (mKey != null) {
                log.info("mediaKey type: {}, value: {}", mKey.getClass().getName(), mKey);
            } else {
                log.warn("mediaKey is NULL!");
            }
            String base64Data = evolutionClient.getBase64FromMediaMessage(messageData);
            if (base64Data == null || base64Data.isBlank()) {
                return null;
            }

            byte[] fileBytes;
            if (base64Data.contains("base64,")) {
                String base64Str = base64Data.split("base64,")[1];
                fileBytes = java.util.Base64.getDecoder().decode(base64Str.trim());
            } else {
                fileBytes = java.util.Base64.getDecoder().decode(base64Data.trim());
            }

            if (fileBytes != null && fileBytes.length > 0) {
                String originalFilename = media.get("fileName") != null ? (String) media.get("fileName") : null;
                String contentType = media.get("mimetype") != null ? (String) media.get("mimetype") : "application/octet-stream";

                if (originalFilename == null) {
                    String extension = "";
                    if (contentType.contains("audio/ogg") || contentType.contains("audio/opus") || contentType.contains("ogg")) {
                        extension = ".ogg";
                    } else if (contentType.contains("audio/mp4") || contentType.contains("audio/m4a") || contentType.contains("m4a")) {
                        extension = ".m4a";
                    } else if (contentType.contains("audio/mpeg") || contentType.contains("audio/mp3") || contentType.contains("mp3")) {
                        extension = ".mp3";
                    } else if (contentType.contains("video/mp4")) {
                        extension = ".mp4";
                    } else if (contentType.contains("image/jpeg")) {
                        extension = ".jpg";
                    } else if (contentType.contains("image/png")) {
                        extension = ".png";
                    } else if (contentType.contains("application/pdf")) {
                        extension = ".pdf";
                    }
                    originalFilename = "media_" + UUID.randomUUID() + extension;
                }

                return s3Service.uploadFile(originalFilename, fileBytes, contentType);
            }
        } catch (Exception e) {
            log.error("Erro ao transferir mídia do gateway para o MinIO S3", e);
        }
        return null;
    }
}
