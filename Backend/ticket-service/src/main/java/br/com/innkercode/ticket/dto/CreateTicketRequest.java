package br.com.innkercode.ticket.dto;

import java.util.UUID;

public record CreateTicketRequest(
    String whatsappNumber,
    String clientName,
    UUID sectorId
) {}
