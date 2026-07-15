package br.com.innkercode.ticket.controller;

import br.com.innkercode.ticket.dto.DashboardSlaMetricsResponse;
import br.com.innkercode.ticket.service.SlaMetricsService;
import br.com.innkercode.ticket.service.TicketService;
import br.com.innkercode.ticket.service.MessageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class SlaMetricsControllerTest {

    @Mock
    private SlaMetricsService slaMetricsService;

    @Mock
    private TicketService ticketService;

    @Mock
    private MessageService messageService;

    @InjectMocks
    private TicketController ticketController;

    @Test
    void testGetSlaMetrics_ForbiddenForUser() {
        ResponseEntity<DashboardSlaMetricsResponse> response = ticketController.getSlaMetrics("USER");
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void testGetSlaMetrics_OkForAdmin() {
        DashboardSlaMetricsResponse mockMetrics = new DashboardSlaMetricsResponse(
                450.0, 85.0, 1200.0, List.of()
        );
        when(slaMetricsService.getDashboardSlaMetrics()).thenReturn(mockMetrics);

        ResponseEntity<DashboardSlaMetricsResponse> response = ticketController.getSlaMetrics("ADMIN");
        
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(mockMetrics, response.getBody());
    }

    @Test
    void testGetSlaMetrics_OkForMaster() {
        DashboardSlaMetricsResponse mockMetrics = new DashboardSlaMetricsResponse(
                450.0, 85.0, 1200.0, List.of()
        );
        when(slaMetricsService.getDashboardSlaMetrics()).thenReturn(mockMetrics);

        ResponseEntity<DashboardSlaMetricsResponse> response = ticketController.getSlaMetrics("MASTER");
        
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(mockMetrics, response.getBody());
    }
}
