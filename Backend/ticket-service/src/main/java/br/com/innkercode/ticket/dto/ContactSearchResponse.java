package br.com.innkercode.ticket.dto;

import java.util.UUID;

public record ContactSearchResponse(
    UUID id,
    String contactName,
    String whatsappNumber,
    String companyName,
    String tradeName
) {}
