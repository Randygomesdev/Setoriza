package br.com.innkercode.ticket.dto;

import br.com.innkercode.ticket.domain.model.MessageType;
import br.com.innkercode.ticket.domain.model.SenderType;
import java.time.LocalDateTime;
import java.util.UUID;

public record MessageResponse(
        UUID id,
        UUID ticketId,
        SenderType senderType,
        MessageType messageType,
        String content,
        LocalDateTime sentAt
) {}
