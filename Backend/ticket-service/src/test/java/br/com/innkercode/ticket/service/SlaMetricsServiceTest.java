package br.com.innkercode.ticket.service;

import br.com.innkercode.ticket.domain.entity.Sector;
import br.com.innkercode.ticket.domain.entity.Ticket;
import br.com.innkercode.ticket.domain.entity.TicketSectorHistory;
import br.com.innkercode.ticket.domain.repository.SectorRepository;
import br.com.innkercode.ticket.domain.repository.TicketRepository;
import br.com.innkercode.ticket.domain.repository.TicketSectorHistoryRepository;
import br.com.innkercode.ticket.dto.DashboardSlaMetricsResponse;
import br.com.innkercode.ticket.dto.SectorSlaMetricResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SlaMetricsServiceTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private SectorRepository sectorRepository;

    @Mock
    private TicketSectorHistoryRepository ticketSectorHistoryRepository;

    @InjectMocks
    private SlaMetricsService slaMetricsService;

    private Sector sector1;
    private Sector sector2;
    private UUID sectorId1;
    private UUID sectorId2;

    @BeforeEach
    void setUp() {
        sectorId1 = UUID.randomUUID();
        sectorId2 = UUID.randomUUID();

        sector1 = Sector.builder()
                .id(sectorId1)
                .name("FISCAL")
                .friendlyName("Fiscal")
                .slaLimitMinutes(15)
                .build();

        sector2 = Sector.builder()
                .id(sectorId2)
                .name("CONTABIL")
                .friendlyName("Contábil")
                .slaLimitMinutes(30)
                .build();
    }

    @Test
    void testGetDashboardSlaMetrics_EmptyData() {
        when(ticketRepository.findAll()).thenReturn(List.of());
        when(sectorRepository.findAll()).thenReturn(List.of(sector1, sector2));
        when(ticketSectorHistoryRepository.findAll()).thenReturn(List.of());

        DashboardSlaMetricsResponse metrics = slaMetricsService.getDashboardSlaMetrics();

        assertNotNull(metrics);
        assertEquals(0.0, metrics.overallAvgResponseTimeSeconds());
        assertEquals(0.0, metrics.overallPercentageWithinSla());
        assertEquals(0.0, metrics.overallAvgResolutionTimeSeconds());
        assertEquals(2, metrics.sectorMetrics().size());

        SectorSlaMetricResponse metric1 = metrics.sectorMetrics().stream()
                .filter(m -> m.sectorId().equals(sectorId1))
                .findFirst().orElseThrow();
        assertNull(metric1.avgResponseTimeSeconds());
        assertNull(metric1.avgResolutionTimeSeconds());
        assertNull(metric1.percentageWithinSla());
    }

    @Test
    void testGetDashboardSlaMetrics_WithData() {
        LocalDateTime now = LocalDateTime.now();

        // Ticket 1: Claimed in 10 minutes (within SLA limit of 15 min), resolved in 30 minutes
        Ticket t1 = Ticket.builder()
                .id(UUID.randomUUID())
                .sector(sector1)
                .queuedAt(now.minusMinutes(30))
                .claimedAt(now.minusMinutes(20))
                .resolvedAt(now)
                .build();

        // Ticket 2: Claimed in 20 minutes (exceeds SLA limit of 15 min), not resolved
        Ticket t2 = Ticket.builder()
                .id(UUID.randomUUID())
                .sector(sector1)
                .queuedAt(now.minusMinutes(40))
                .claimedAt(now.minusMinutes(20))
                .build();

        when(ticketRepository.findAll()).thenReturn(List.of(t1, t2));
        when(sectorRepository.findAll()).thenReturn(List.of(sector1, sector2));

        // Histories
        // H1 for t1: entered 30m ago, claimed 20m ago, resolved now (stayed in sector 1)
        TicketSectorHistory h1 = TicketSectorHistory.builder()
                .ticket(t1)
                .sector(sector1)
                .enteredAt(now.minusMinutes(30))
                .claimedAt(now.minusMinutes(20))
                .resolvedAt(now)
                .slaLimitMinutes(15)
                .build();

        // H2 for t2: entered 40m ago, claimed 20m ago (stayed in sector 1)
        TicketSectorHistory h2 = TicketSectorHistory.builder()
                .ticket(t2)
                .sector(sector1)
                .enteredAt(now.minusMinutes(40))
                .claimedAt(now.minusMinutes(20))
                .slaLimitMinutes(15)
                .build();

        when(ticketSectorHistoryRepository.findAll()).thenReturn(List.of(h1, h2));

        DashboardSlaMetricsResponse metrics = slaMetricsService.getDashboardSlaMetrics();

        assertNotNull(metrics);
        // Overall average response: (10m + 20m) / 2 = 15 minutes = 900 seconds
        assertEquals(900.0, metrics.overallAvgResponseTimeSeconds());
        // Overall within SLA: t1 is within 15 min, t2 is not -> 50%
        assertEquals(50.0, metrics.overallPercentageWithinSla());
        // Overall resolution time: only t1 is resolved, duration = 30 minutes = 1800 seconds
        assertEquals(1800.0, metrics.overallAvgResolutionTimeSeconds());

        // Sector 1 Metrics
        SectorSlaMetricResponse s1Metric = metrics.sectorMetrics().stream()
                .filter(m -> m.sectorId().equals(sectorId1))
                .findFirst().orElseThrow();

        assertEquals(900.0, s1Metric.avgResponseTimeSeconds()); // 15 mins avg
        assertEquals(1800.0, s1Metric.avgResolutionTimeSeconds()); // 30 mins
        assertEquals(50.0, s1Metric.percentageWithinSla()); // 1 of 2 within SLA
        assertEquals(2L, s1Metric.totalTicketsHandled());

        // Sector 2 Metrics
        SectorSlaMetricResponse s2Metric = metrics.sectorMetrics().stream()
                .filter(m -> m.sectorId().equals(sectorId2))
                .findFirst().orElseThrow();
        assertNull(s2Metric.avgResponseTimeSeconds());
        assertNull(s2Metric.avgResolutionTimeSeconds());
        assertNull(s2Metric.percentageWithinSla());
        assertEquals(0L, s2Metric.totalTicketsHandled());
    }
}
