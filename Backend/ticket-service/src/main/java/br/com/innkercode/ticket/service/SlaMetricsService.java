package br.com.innkercode.ticket.service;

import br.com.innkercode.ticket.domain.entity.Sector;
import br.com.innkercode.ticket.domain.entity.Ticket;
import br.com.innkercode.ticket.domain.entity.TicketSectorHistory;
import br.com.innkercode.ticket.domain.repository.SectorRepository;
import br.com.innkercode.ticket.domain.repository.TicketRepository;
import br.com.innkercode.ticket.domain.repository.TicketSectorHistoryRepository;
import br.com.innkercode.ticket.dto.DashboardSlaMetricsResponse;
import br.com.innkercode.ticket.dto.SectorSlaMetricResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SlaMetricsService {

    private final TicketRepository ticketRepository;
    private final SectorRepository sectorRepository;
    private final TicketSectorHistoryRepository ticketSectorHistoryRepository;

    public DashboardSlaMetricsResponse getDashboardSlaMetrics() {
        log.info("Calculando métricas de SLA do dashboard");

        // 1. Métricas gerais dos Tickets
        List<Ticket> allTickets = ticketRepository.findAll();
        
        List<Ticket> claimedTickets = allTickets.stream()
                .filter(t -> t.getQueuedAt() != null && t.getClaimedAt() != null)
                .toList();

        List<Ticket> resolvedTickets = allTickets.stream()
                .filter(t -> t.getQueuedAt() != null && t.getResolvedAt() != null)
                .toList();

        double overallAvgResponseTime = 0.0;
        double overallPercentageWithinSla = 0.0;
        double overallAvgResolutionTime = 0.0;

        if (!claimedTickets.isEmpty()) {
            double totalResponseSeconds = 0.0;
            long withinSlaCount = 0;

            for (Ticket t : claimedTickets) {
                long responseSeconds = Duration.between(t.getQueuedAt(), t.getClaimedAt()).getSeconds();
                totalResponseSeconds += responseSeconds;

                // Considera o SLA do setor atual do ticket, se houver, senão assume padrão de 15 minutos
                int slaLimitMinutes = (t.getSector() != null) ? t.getSector().getSlaLimitMinutes() : 15;
                if (responseSeconds <= (slaLimitMinutes * 60L)) {
                    withinSlaCount++;
                }
            }

            overallAvgResponseTime = totalResponseSeconds / claimedTickets.size();
            overallPercentageWithinSla = ((double) withinSlaCount / claimedTickets.size()) * 100.0;
        }

        if (!resolvedTickets.isEmpty()) {
            double totalResolutionSeconds = 0.0;
            for (Ticket t : resolvedTickets) {
                totalResolutionSeconds += Duration.between(t.getQueuedAt(), t.getResolvedAt()).getSeconds();
            }
            overallAvgResolutionTime = totalResolutionSeconds / resolvedTickets.size();
        }

        // 2. Métricas individuais por Setor (usando TicketSectorHistory)
        List<Sector> sectors = sectorRepository.findAll();
        List<TicketSectorHistory> allHistories = ticketSectorHistoryRepository.findAll();

        Map<UUID, List<TicketSectorHistory>> historiesBySector = allHistories.stream()
                .collect(Collectors.groupingBy(h -> h.getSector().getId()));

        List<SectorSlaMetricResponse> sectorMetrics = new ArrayList<>();

        for (Sector sector : sectors) {
            List<TicketSectorHistory> sectorHistories = historiesBySector.getOrDefault(sector.getId(), List.of());

            List<TicketSectorHistory> claimedHistories = sectorHistories.stream()
                    .filter(h -> h.getClaimedAt() != null)
                    .toList();

            List<TicketSectorHistory> resolvedHistories = sectorHistories.stream()
                    .filter(h -> h.getResolvedAt() != null)
                    .toList();

            Double avgResponse = null;
            Double avgResolution = null;
            Double pctWithinSla = null;

            if (!claimedHistories.isEmpty()) {
                double totalResponse = 0.0;
                long withinSla = 0;

                for (TicketSectorHistory h : claimedHistories) {
                    long responseSec = Duration.between(h.getEnteredAt(), h.getClaimedAt()).getSeconds();
                    totalResponse += responseSec;

                    if (responseSec <= (h.getSlaLimitMinutes() * 60L)) {
                        withinSla++;
                    }
                }
                avgResponse = totalResponse / claimedHistories.size();
                pctWithinSla = ((double) withinSla / claimedHistories.size()) * 100.0;
            }

            if (!resolvedHistories.isEmpty()) {
                double totalResolution = 0.0;
                for (TicketSectorHistory h : resolvedHistories) {
                    totalResolution += Duration.between(h.getEnteredAt(), h.getResolvedAt()).getSeconds();
                }
                avgResolution = totalResolution / resolvedHistories.size();
            }

            sectorMetrics.add(new SectorSlaMetricResponse(
                    sector.getId(),
                    sector.getName(),
                    sector.getFriendlyName(),
                    sector.getSlaLimitMinutes(),
                    avgResponse,
                    avgResolution,
                    pctWithinSla,
                    (long) sectorHistories.size()
            ));
        }

        return new DashboardSlaMetricsResponse(
                overallAvgResponseTime,
                overallPercentageWithinSla,
                overallAvgResolutionTime,
                sectorMetrics
        );
    }
}
