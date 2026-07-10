package br.com.innkercode.ticket.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "sectors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sector extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private String friendlyName;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "sla_limit_minutes", nullable = false)
    @Builder.Default
    private Integer slaLimitMinutes = 15;
}
