package br.com.innkercode.ticket.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "client_contacts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientContact extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Client client;

    @Column(name = "whatsapp_number", nullable = false, unique = true)
    private String whatsappNumber;

    @Column(name = "contact_name", nullable = false)
    private String contactName;
}
