package br.com.innkercode.ticket.dto;

import java.util.UUID;

public record SectorSlaMetricResponse(
        UUID sectorId,
        String sectorName,
        String friendlyName,
        Integer slaLimitMinutes,
        Double avgResponseTimeSeconds,
        Double avgResolutionTimeSeconds,
        Double percentageWithinSla,
        Long totalTicketsHandled
) {}
