package br.com.innkercode.ticket.service;

import br.com.innkercode.ticket.domain.entity.Client;
import br.com.innkercode.ticket.domain.entity.ClientContact;
import br.com.innkercode.ticket.domain.entity.Sector;
import br.com.innkercode.ticket.domain.entity.Ticket;
import br.com.innkercode.ticket.domain.entity.AiConfig;
import br.com.innkercode.ticket.domain.model.MessageType;
import br.com.innkercode.ticket.domain.model.SenderType;
import br.com.innkercode.ticket.domain.model.TicketStatus;
import br.com.innkercode.ticket.domain.repository.ClientContactRepository;
import br.com.innkercode.ticket.domain.repository.ClientRepository;
import br.com.innkercode.ticket.domain.repository.SectorRepository;
import br.com.innkercode.ticket.dto.webhook.WebhookPayload;
import br.com.innkercode.ticket.client.GeminiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import br.com.innkercode.ticket.util.ImageCompressor;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatbotService {

    private final TicketService ticketService;
    private final MessageService messageService;
    private final WhatsAppGatewayService whatsAppGatewayService;
    private final S3Service s3Service;
    
    private final ClientRepository clientRepository;
    private final ClientContactRepository clientContactRepository;
    private final SectorRepository sectorRepository;
    private final AiConfigService aiConfigService;
    private final GeminiClient geminiClient;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);

    @Value("${whatsapp.evolution.apikey}")
    private String apiKey;

    private final RestClient restClient = RestClient.create();

    public void processIncomingWebhook(WebhookPayload payload) {
        if (payload == null || payload.getData() == null) {
            log.warn("Payload de webhook inválido recebido.");
            return;
        }

        String event = payload.getEvent();

        // 1. Process messages.update (delivery checkmarks)
        if ("messages.update".equals(event)) {
            String keyId = payload.getData().getKeyId();
            String status = payload.getData().getStatus();
            if (keyId != null && status != null) {
                messageService.updateMessageStatus(keyId, status);
            }
            return;
        }

        // 2. Process messages.upsert
        if (payload.getData().getKey() == null) {
            log.warn("Payload de webhook inválido recebido para evento: {}", event);
            return;
        }

        // Intercepta mensagens de protocolo (Edição e Exclusão)
        WebhookPayload.WebhookMessage msg = payload.getData().getMessage();
        if (msg != null && msg.getProtocolMessage() != null) {
            WebhookPayload.ProtocolMessage protocol = msg.getProtocolMessage();
            String originalMsgId = protocol.getKey() != null ? protocol.getKey().getId() : null;
            if (originalMsgId != null) {
                if ("MESSAGE_EDIT".equals(protocol.getType()) || "14".equals(protocol.getType())) {
                    if (protocol.getEditedMessage() != null) {
                        String newContent = extractTextContent(protocol.getEditedMessage());
                        if (newContent != null && !newContent.isBlank()) {
                            log.info("Processando edição de mensagem para o whatsappMsgId original: {}", originalMsgId);
                            messageService.updateEditedMessage(originalMsgId, newContent + " (editada)");
                        }
                    }
                    return; // Consome o webhook, não processa como nova mensagem
                }
                if ("REVOKE".equals(protocol.getType()) || "3".equals(protocol.getType())) {
                    log.info("Processando exclusão de mensagem para o whatsappMsgId original: {}", originalMsgId);
                    messageService.updateEditedMessage(originalMsgId, "🚫 Mensagem apagada");
                    return; // Consome o webhook, não processa como nova mensagem
                }
            }
        }

        log.info("Processando webhook da Evolution API: Evento={}, ID={}, Remetente={}", 
                event, 
                payload.getData().getKey().getId(), 
                payload.getData().getKey().getRemoteJid());

        // Ignorar mensagens enviadas pela própria API (evita loops)
        if (payload.getData().getKey().isFromMe()) {
            log.debug("Ignorando mensagem enviada pela própria API (fromMe = true).");
            return;
        }

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
        String messageId = payload.getData().getKey().getId();

        Optional<ClientContact> contactOpt = clientContactRepository.findByWhatsappNumber(senderNumber);

        if (contactOpt.isEmpty()) {
            // Caso não tenha vínculo cadastrado
            handleUnknownContact(senderNumber, clientName, messageType, content, messageId);
        } else {
            // Caso já tenha vínculo cadastrado
            ClientContact contact = contactOpt.get();
            handleKnownContact(contact, messageType, content, clientName, messageId);
        }
    }

    private void handleUnknownContact(String senderNumber, String clientName, MessageType messageType, String content, String messageId) {
        Optional<Ticket> activeTicketOpt = ticketService.getActiveTicketByWhatsappNumber(senderNumber);

        if (activeTicketOpt.isEmpty()) {
            // Primeiro contato deste número: inicia identificação pedindo CNPJ
            Ticket ticket = ticketService.createIdentificationTicket(senderNumber, clientName);
            messageService.saveMessage(ticket, SenderType.CLIENTE, messageType, content, messageId);
            
            sendCnpjRequest(ticket);
        } else {
            Ticket ticket = activeTicketOpt.get();
            messageService.saveMessage(ticket, SenderType.CLIENTE, messageType, content, messageId);

            if (ticket.getStatus() == TicketStatus.IDENTIFICACAO_CNPJ) {
                if (messageType == MessageType.TEXTO) {
                    handleCnpjInput(ticket, content, clientName);
                } else {
                    String botMsg = "Por favor, informe o CNPJ da sua empresa (somente números) em formato de texto para podermos identificar seu cadastro.";
                    messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, botMsg);
                    whatsAppGatewayService.sendTextMessage(ticket.getWhatsappNumber(), botMsg);
                }
            } else {
                log.warn("Ticket {} de número desconhecido está em status inesperado: {}", ticket.getId(), ticket.getStatus());
            }
        }
    }

    private void handleKnownContact(ClientContact contact, MessageType messageType, String content, String clientName, String messageId) {
        Optional<Ticket> activeTicketOpt = ticketService.getActiveTicketByWhatsappNumber(contact.getWhatsappNumber());

        if (activeTicketOpt.isEmpty()) {
            // Abre novo ticket direto em TRIAGEM associado à empresa do contato
            Ticket ticket = ticketService.createTriageTicket(contact.getWhatsappNumber(), clientName, contact.getClient().getId());
            messageService.saveMessage(ticket, SenderType.CLIENTE, messageType, content, messageId);

            // Agenda a triagem automática para dali a 12 segundos (debounce e simulação humana)
            scheduleInitialTriage(ticket.getId());
        } else {
            Ticket ticket = activeTicketOpt.get();
            messageService.saveMessage(ticket, SenderType.CLIENTE, messageType, content, messageId);

            if (ticket.getStatus() == TicketStatus.TRIAGEM) {
                if (messageType == MessageType.TEXTO) {
                    // Só processamos a resposta se a primeira mensagem de sistema (menu ou confirmação da IA) já tiver sido enviada
                    if (messageService.hasSystemMessage(ticket.getId())) {
                        handleTriageInput(ticket, content);
                    } else {
                        log.info("Mensagem acumulada na janela de debounce de triagem para o ticket {}", ticket.getId());
                    }
                } else {
                    if (messageService.hasSystemMessage(ticket.getId())) {
                        String botMsg = "Por favor, digite apenas o número da opção desejada para direcionarmos seu contato.";
                        messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, botMsg);
                        whatsAppGatewayService.sendTextMessage(ticket.getWhatsappNumber(), botMsg);
                    }
                }
            } else if (ticket.getStatus() == TicketStatus.AGUARDANDO_ATENDIMENTO) {
                if (messageType == MessageType.TEXTO) {
                    handleAwaitingTriageChatbot(ticket, content);
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
        whatsAppGatewayService.sendTextMessage(ticket.getWhatsappNumber(), msg);
    }

    private void handleCnpjInput(Ticket ticket, String input, String pushName) {
        String cleanCnpj = input.replaceAll("\\D", ""); // Apenas números
        log.info("Processando tentativa de identificação por CNPJ: '{}' para o ticket {}", cleanCnpj, ticket.getId());

        Optional<Client> clientOpt = clientRepository.findByCnpj(cleanCnpj);

        if (clientOpt.isPresent()) {
            Client client = clientOpt.get();
            log.info("Empresa cadastrada identificada: {} (ID: {})", client.getTradeName(), client.getId());

            // 1. Criar o vínculo do contato
            ClientContact newContact = ClientContact.builder()
                    .client(client)
                    .whatsappNumber(ticket.getWhatsappNumber())
                    .contactName(pushName != null ? pushName : "Funcionário")
                    .build();
            clientContactRepository.save(newContact);

            // 2. Promover ticket para TRIAGEM e associar cliente
            ticketService.promoteToTriage(ticket.getId(), client.getId());

            // 3. Enviar mensagem de sucesso e agendar a triagem com delay
            String successMsg = String.format("A empresa *%s* foi identificada com sucesso e vinculada ao seu contato.", client.getTradeName());
            messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, successMsg);
            whatsAppGatewayService.sendTextMessage(ticket.getWhatsappNumber(), successMsg);

            scheduleInitialTriage(ticket.getId());
        } else {
            log.warn("CNPJ {} não cadastrado no sistema.", cleanCnpj);
            String errorMsg = "⚠️ Desculpe, não localizei nenhuma empresa cadastrada com o CNPJ informado.\n\n" +
                              "Por favor, verifique o número e digite novamente (somente números), ou entre em contato com nosso suporte administrativo para atualizar o cadastro.";
            messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, errorMsg);
            whatsAppGatewayService.sendTextMessage(ticket.getWhatsappNumber(), errorMsg);
        }
    }

    private void sendTriageMenu(Ticket ticket, String companyName) {
        List<Sector> activeSectors = sectorRepository.findByActiveTrue();

        if (activeSectors.isEmpty()) {
            String errorMsg = "Olá! Identificamos a empresa " + companyName + ".\n\n" +
                              "Infelizmente não há nenhum setor de atendimento configurado no momento. Por favor, aguarde ou fale com o administrador.";
            messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, errorMsg);
            whatsAppGatewayService.sendTextMessage(ticket.getWhatsappNumber(), errorMsg);
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
        whatsAppGatewayService.sendTextMessage(ticket.getWhatsappNumber(), triageMsg);
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
            whatsAppGatewayService.sendTextMessage(ticket.getWhatsappNumber(), confirmationMessage);
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
        whatsAppGatewayService.sendTextMessage(ticket.getWhatsappNumber(), invalidMsg);
    }

    private String extractTextContent(WebhookPayload.WebhookMessage msg) {
        if (msg == null) return null;
        
        // 1. Conversa comum
        if (msg.getConversation() != null) {
            return msg.getConversation();
        }
        
        // 2. Resposta citada (Reply) ou texto estendido
        if (msg.getExtendedTextMessage() != null) {
            String text = msg.getExtendedTextMessage().getText();
            WebhookPayload.ContextInfo contextInfo = msg.getExtendedTextMessage().getContextInfo();
            if (contextInfo != null && contextInfo.getQuotedMessage() != null) {
                String quotedText = extractTextContent(contextInfo.getQuotedMessage());
                if (quotedText != null && !quotedText.isBlank()) {
                    if (quotedText.length() > 60) {
                        quotedText = quotedText.substring(0, 57) + "...";
                    }
                    return "↪️ Resposta a: \"" + quotedText + "\"\n" + (text != null ? text : "");
                }
            }
            if (text != null) {
                return text;
            }
        }
        
        // 3. Reações com emojis
        if (msg.getReactionMessage() != null) {
            String emoji = msg.getReactionMessage().getText();
            if (emoji != null && !emoji.isBlank()) {
                return "Reagiu com " + emoji;
            }
        }
        
        // 4. Edições
        if (msg.getProtocolMessage() != null) {
            WebhookPayload.ProtocolMessage protocol = msg.getProtocolMessage();
            if ("MESSAGE_EDIT".equals(protocol.getType()) || "14".equals(protocol.getType())) {
                if (protocol.getEditedMessage() != null) {
                    String newText = extractTextContent(protocol.getEditedMessage());
                    if (newText != null && !newText.isBlank()) {
                        return newText;
                    }
                }
            }
        }

        // 5. Capturas de mídias e legendas como fallback descritivo
        if (msg.getStickerMessage() != null) {
            return "[Figurinha]";
        }
        if (msg.getImageMessage() != null) {
            String caption = (String) msg.getImageMessage().get("caption");
            return (caption != null && !caption.isBlank()) ? caption : "[Imagem]";
        }
        if (msg.getAudioMessage() != null) {
            return "[Áudio]";
        }
        if (msg.getVideoMessage() != null) {
            String caption = (String) msg.getVideoMessage().get("caption");
            return (caption != null && !caption.isBlank()) ? caption : "[Vídeo]";
        }
        if (msg.getDocumentMessage() != null) {
            String caption = (String) msg.getDocumentMessage().get("caption");
            return (caption != null && !caption.isBlank()) ? caption : "[Documento]";
        }
        
        return null;
    }

    private MessageType determineMessageType(WebhookPayload.WebhookMessage msg) {
        if (msg == null) return MessageType.TEXTO;
        if (msg.getImageMessage() != null || msg.getStickerMessage() != null) return MessageType.IMAGEM;
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
        } else if (msg.getStickerMessage() != null) {
            media = msg.getStickerMessage();
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
            
            // Extrai o ID da mídia do payload (usado pela Meta Cloud API)
            String mediaIdOrUrl = (String) media.get("id");
            
            byte[] fileBytes = whatsAppGatewayService.downloadMedia(messageData, mediaIdOrUrl);

            if (fileBytes != null && fileBytes.length > 0) {
                String originalFilename = media.get("fileName") != null ? (String) media.get("fileName") : null;
                String contentType = media.get("mimetype") != null ? (String) media.get("mimetype") : "application/octet-stream";

                // Compactar imagem se for compatível (JPEG/PNG)
                byte[] processedBytes = ImageCompressor.compressImage(fileBytes, contentType);
                String processedFilename = ImageCompressor.getNewFilename(originalFilename);
                String processedContentType = ImageCompressor.getNewContentType(contentType);

                // Detecta se o vídeo é um GIF animado
                boolean isGif = false;
                if (msg.getVideoMessage() != null) {
                    Object gifVal = media.get("gifPlayback");
                    if (gifVal instanceof Boolean && (Boolean) gifVal) {
                        isGif = true;
                    } else if (gifVal instanceof String && "true".equalsIgnoreCase((String) gifVal)) {
                        isGif = true;
                    }
                }

                if (processedFilename == null) {
                    String extension = "";
                    if (processedContentType.contains("audio/ogg") || processedContentType.contains("audio/opus") || processedContentType.contains("ogg")) {
                        extension = ".ogg";
                    } else if (processedContentType.contains("audio/mp4") || processedContentType.contains("audio/m4a") || processedContentType.contains("m4a")) {
                        extension = ".m4a";
                    } else if (processedContentType.contains("audio/mpeg") || processedContentType.contains("audio/mp3") || processedContentType.contains("mp3")) {
                        extension = ".mp3";
                    } else if (processedContentType.contains("video/mp4")) {
                        extension = ".mp4";
                    } else if (processedContentType.contains("image/jpeg")) {
                        extension = ".jpg";
                    } else if (processedContentType.contains("image/png")) {
                        extension = ".png";
                    } else if (processedContentType.contains("image/webp") || processedContentType.contains("webp")) {
                        extension = ".webp";
                    } else if (processedContentType.contains("application/pdf")) {
                        extension = ".pdf";
                    }
                    String prefix = isGif ? "gif_playback_" : "media_";
                    processedFilename = prefix + UUID.randomUUID() + extension;
                }

                return s3Service.uploadFile(processedFilename, processedBytes, processedContentType);
            }
        } catch (Exception e) {
            log.error("Erro ao transferir mídia do gateway para o MinIO S3", e);
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    @org.springframework.transaction.annotation.Transactional
    public void processIncomingMetaWebhook(Map<String, Object> payload) {
        if (payload == null || !payload.containsKey("entry")) {
            return;
        }

        log.info("Processando webhook da Meta API...");

        try {
            List<Map<String, Object>> entries = (List<Map<String, Object>>) payload.get("entry");
            if (entries == null) return;

            for (Map<String, Object> entry : entries) {
                List<Map<String, Object>> changes = (List<Map<String, Object>>) entry.get("changes");
                if (changes == null) continue;

                for (Map<String, Object> change : changes) {
                    Map<String, Object> value = (Map<String, Object>) change.get("value");
                    if (value == null || !value.containsKey("messages")) continue;

                    // Extrair pushName
                    String pushName = "Cliente WhatsApp";
                    List<Map<String, Object>> contacts = (List<Map<String, Object>>) value.get("contacts");
                    if (contacts != null && !contacts.isEmpty()) {
                        Map<String, Object> contact = contacts.get(0);
                        if (contact.containsKey("profile")) {
                            Map<String, Object> profile = (Map<String, Object>) contact.get("profile");
                            if (profile != null && profile.containsKey("name")) {
                                pushName = (String) profile.get("name");
                            }
                        }
                    }

                    List<Map<String, Object>> messages = (List<Map<String, Object>>) value.get("messages");
                    if (messages == null) continue;

                    for (Map<String, Object> msg : messages) {
                        String sender = (String) msg.get("from");
                        String messageId = (String) msg.get("id");
                        String type = (String) msg.get("type");

                        if (sender == null || messageId == null || type == null) continue;

                        log.info("Mensagem Meta recebida de {} - tipo: {}, id: {}", sender, type, messageId);

                        // Determinar o tipo da mensagem e conteúdo
                        MessageType messageType = MessageType.TEXTO;
                        String content = null;

                        if ("text".equals(type)) {
                            Map<String, Object> textObj = (Map<String, Object>) msg.get("text");
                            if (textObj != null) {
                                content = (String) textObj.get("body");
                            }
                        } else if ("image".equals(type) || "audio".equals(type) || "video".equals(type) || "document".equals(type)) {
                            Map<String, Object> mediaObj = (Map<String, Object>) msg.get(type);
                            if (mediaObj != null) {
                                String mediaId = (String) mediaObj.get("id");
                                String filename = (String) mediaObj.get("filename");
                                String mimeType = (String) mediaObj.get("mime_type");
                                String caption = (String) mediaObj.get("caption");

                                // Mapeia o tipo de mídia
                                messageType = "image".equals(type) ? MessageType.IMAGEM : MessageType.DOCUMENTO;

                                log.info("Mídia Meta encontrada (ID: {}). Baixando e enviando para o S3...", mediaId);
                                
                                byte[] fileBytes = whatsAppGatewayService.downloadMedia(null, mediaId);
                                if (fileBytes != null && fileBytes.length > 0) {
                                    byte[] processedBytes = ImageCompressor.compressImage(fileBytes, mimeType);
                                    String processedFilename = ImageCompressor.getNewFilename(filename != null ? filename : "file");
                                    String processedContentType = ImageCompressor.getNewContentType(mimeType != null ? mimeType : "application/octet-stream");

                                    if (processedFilename == null || processedFilename.isBlank()) {
                                        String extension = "image".equals(type) ? ".jpg" : ".bin";
                                        processedFilename = "media_" + UUID.randomUUID() + extension;
                                    }

                                    content = s3Service.uploadFile(processedFilename, processedBytes, processedContentType);
                                }
                            }
                        }

                        if (content == null || content.isBlank()) {
                            content = "[Mensagem não suportada]";
                        }

                        // Verificar se o número de WhatsApp pertence a algum contato já cadastrado
                        Optional<ClientContact> contactOpt = clientContactRepository.findByWhatsappNumber(sender);

                        if (contactOpt.isEmpty()) {
                            handleUnknownContact(sender, pushName, messageType, content, messageId);
                        } else {
                            ClientContact contact = contactOpt.get();
                            handleKnownContact(contact, messageType, content, pushName, messageId);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Erro ao processar webhook da Meta API", e);
        }
    }

    private void scheduleInitialTriage(UUID ticketId) {
        log.info("Agendando triagem inicial da IA para o ticket {} em 12 segundos...", ticketId);
        scheduler.schedule(() -> {
            try {
                runInitialTriage(ticketId);
            } catch (Exception e) {
                log.error("Erro na triagem inicial agendada para o ticket {}", ticketId, e);
            }
        }, 12, TimeUnit.SECONDS);
    }

    public void runInitialTriage(UUID ticketId) {
        log.info("Iniciando execução da triagem agendada para o ticket {}", ticketId);
        
        Ticket ticket = ticketService.getTicketById(ticketId);
        if (ticket == null) {
            log.warn("Ticket {} não encontrado para execução da triagem.", ticketId);
            return;
        }
        
        if (ticket.getStatus() != TicketStatus.TRIAGEM) {
            log.info("Ticket {} não está mais em status de TRIAGEM. Ignorando triagem.", ticketId);
            return;
        }

        // Verifica se o sistema já enviou alguma mensagem (para evitar duplicidade ou interceptar triagem manual)
        if (messageService.hasSystemMessage(ticketId)) {
            log.info("Menu ou mensagem de sistema já enviada para o ticket {}. Cancelando triagem agendada.", ticketId);
            return;
        }

        List<Sector> activeSectors = sectorRepository.findByActiveTrue();
        if (activeSectors.isEmpty()) {
            log.warn("Nenhum setor ativo configurado no banco. Enviando mensagem de fallback.");
            String companyName = (ticket.getClient() != null) ? ticket.getClient().getTradeName() : ticket.getClientName();
            sendTriageMenu(ticket, companyName);
            return;
        }

        try {
            AiConfig aiConfig = aiConfigService.getConfig();
            if (aiConfig.isAiEnabled() && aiConfig.isAutoTriageEnabled() 
                    && aiConfig.getGeminiApiKey() != null && !aiConfig.getGeminiApiKey().isBlank()) {
                
                // 1. Carregar o histórico de mensagens deste ticket enviadas pelo cliente
                List<br.com.innkercode.ticket.domain.entity.Message> clientMessages = messageService.getMessagesByTicketId(ticketId).stream()
                        .filter(m -> m.getSenderType() == SenderType.CLIENTE)
                        .toList();

                StringBuilder sbText = new StringBuilder();
                for (br.com.innkercode.ticket.domain.entity.Message m : clientMessages) {
                    if (m.getContent() != null && !m.getContent().isBlank() && m.getMessageType() == MessageType.TEXTO) {
                        if (sbText.length() > 0) {
                            sbText.append(". ");
                        }
                        sbText.append(m.getContent());
                    }
                }

                String concatenatedInput = sbText.toString().trim();
                if (!concatenatedInput.isEmpty()) {
                    log.info("Texto acumulado do cliente para triagem da IA: '{}'", concatenatedInput);

                    // 2. Montar o prompt de sistema dinâmico
                    StringBuilder promptBuilder = new StringBuilder();
                    promptBuilder.append("Você é o assistente de triagem do sistema Setoriza. Seu papel é analisar a mensagem de um cliente e classificá-la no setor correto.\n");
                    promptBuilder.append("Os setores ativos no momento são:\n");
                    for (Sector s : activeSectors) {
                        promptBuilder.append("- ").append(s.getName()).append(": ").append(s.getFriendlyName()).append("\n");
                    }
                    promptBuilder.append("\nInstruções:\n");
                    promptBuilder.append("1. Identifique qual setor é o mais adequado. Retorne no campo 'setor' o nome técnico exato (ex: ");
                    if (!activeSectors.isEmpty()) {
                        promptBuilder.append(activeSectors.get(0).getName());
                    }
                    promptBuilder.append(").\n");
                    promptBuilder.append("2. Se a mensagem for vaga (saudações como 'olá', 'bom dia', 'oi') ou não puder ser classificada com alta certeza em um dos setores listados, retorne null no campo 'setor'.\n");
                    promptBuilder.append("3. Retorne a resposta estritamente no formato JSON abaixo:\n");
                    promptBuilder.append("{\n  \"setor\": \"NOME_TECNICO_OU_NULL\",\n  \"justificativa\": \"breve explicação em português\"\n}");

                    // 3. Chamar a API do Gemini
                    String geminiJson = geminiClient.generateContentWithCustomSystem(concatenatedInput, promptBuilder.toString(), "application/json");
                    log.info("Gemini respondeu na classificação: {}", geminiJson);

                    if (geminiJson != null && !geminiJson.isBlank()) {
                        String cleanJson = geminiJson.trim();
                        if (!cleanJson.startsWith("{")) {
                            int startIdx = cleanJson.indexOf("{");
                            int endIdx = cleanJson.lastIndexOf("}");
                            if (startIdx != -1 && endIdx != -1 && endIdx > startIdx) {
                                cleanJson = cleanJson.substring(startIdx, endIdx + 1);
                            }
                        }

                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(cleanJson);
                        if (node.has("setor") && !node.get("setor").isNull()) {
                            String targetSector = node.get("setor").asText().trim();
                            if (!"null".equalsIgnoreCase(targetSector) && !targetSector.isEmpty()) {
                                Optional<Sector> matchedSectorOpt = activeSectors.stream()
                                        .filter(s -> s.getName().equalsIgnoreCase(targetSector))
                                        .findFirst();

                                if (matchedSectorOpt.isPresent()) {
                                    Sector matchedSector = matchedSectorOpt.get();
                                    log.info("Triagem IA direcionou o ticket {} para o setor {}", ticketId, matchedSector.getFriendlyName());
                                    
                                    ticketService.updateSector(ticketId, matchedSector);

                                    String confirmationMessage = String.format(
                                            "Entendi! Encaminhei o seu contato para o setor de *%s*. Aguarde que logo um atendente irá falar com você.",
                                            matchedSector.getFriendlyName()
                                    );
                                    messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, confirmationMessage);
                                    whatsAppGatewayService.sendTextMessage(ticket.getWhatsappNumber(), confirmationMessage);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Falha ao executar classificação inteligente com a IA: {}", e.getMessage(), e);
        }

        // 4. Fallback caso a IA não esteja ativa, dê erro, ou retorne null (não conseguiu classificar)
        log.info("IA de triagem desativada ou ineficaz para o ticket {}. Enviando menu de triagem padrão.", ticketId);
        String companyName = (ticket.getClient() != null) ? ticket.getClient().getTradeName() : ticket.getClientName();
        sendTriageMenu(ticket, companyName);
    }

    private void handleAwaitingTriageChatbot(Ticket ticket, String content) {
        try {
            AiConfig config = aiConfigService.getConfig();
            if (config.isAiEnabled() && config.isChatbotEnabled() 
                    && config.getGeminiApiKey() != null && !config.getGeminiApiKey().isBlank()) {
                
                log.info("Processando mensagem do cliente via Chatbot IA no ticket {} (status AGUARDANDO_ATENDIMENTO)", ticket.getId());
                
                // Carregar histórico de mensagens
                List<br.com.innkercode.ticket.domain.entity.Message> history = messageService.getMessagesByTicketId(ticket.getId());
                StringBuilder contextBuilder = new StringBuilder();
                contextBuilder.append("Histórico recente da conversa com o cliente:\n");
                
                int start = Math.max(0, history.size() - 8);
                for (int i = start; i < history.size(); i++) {
                    br.com.innkercode.ticket.domain.entity.Message m = history.get(i);
                    String label = m.getSenderType() == SenderType.CLIENTE ? "Cliente" : "Atendente Virtual";
                    if (m.getContent() != null && !m.getContent().isBlank() && m.getMessageType() == MessageType.TEXTO) {
                        contextBuilder.append(label).append(": ").append(m.getContent()).append("\n");
                    }
                }
                
                contextBuilder.append("Cliente (nova mensagem): ").append(content).append("\n");
                contextBuilder.append("Atendente Virtual: ");
                
                String reply = geminiClient.generateContent(contextBuilder.toString());
                if (reply != null && !reply.isBlank()) {
                    log.info("Chatbot IA respondeu para o ticket {}: '{}'", ticket.getId(), reply);
                    
                    // Simular um atraso de resposta humano para naturalidade (ex: 2.5 segundos)
                    try {
                        Thread.sleep(2500);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }

                    messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, reply);
                    whatsAppGatewayService.sendTextMessage(ticket.getWhatsappNumber(), reply);
                }
            }
        } catch (Exception e) {
            log.error("Erro no processamento do Chatbot IA no ticket {}: {}", ticket.getId(), e.getMessage(), e);
        }
    }
}
