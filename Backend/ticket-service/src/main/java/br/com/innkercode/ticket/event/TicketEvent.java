package br.com.innkercode.ticket.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketEvent {
    private String type; // Ex: "TICKET_CREATED", "TICKET_UPDATED", "MESSAGE_RECEIVED"
    private String ticketId;
    private Object payload;
}
