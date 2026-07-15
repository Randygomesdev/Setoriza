package br.com.innkercode.ticket.dto;

import java.util.List;

public record DashboardSlaMetricsResponse(
        Double overallAvgResponseTimeSeconds,
        Double overallPercentageWithinSla,
        Double overallAvgResolutionTimeSeconds,
        List<SectorSlaMetricResponse> sectorMetrics
) {}
