package br.com.innkercode.ticket.dto;

import java.util.UUID;

public record TransferTicketRequest(
        UUID targetSectorId,
        UUID targetAgentId
) {}
