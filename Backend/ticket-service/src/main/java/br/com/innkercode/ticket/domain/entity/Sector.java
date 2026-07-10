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

    @Column(name = "auto_close_enabled", nullable = false)
    @Builder.Default
    private boolean autoCloseEnabled = false;

    @Column(name = "auto_close_timeout_minutes", nullable = false)
    @Builder.Default
    private Integer autoCloseTimeoutMinutes = 60;

    @Column(name = "auto_close_warning_minutes", nullable = false)
    @Builder.Default
    private Integer autoCloseWarningMinutes = 45;

    @Column(name = "auto_close_warning_message", nullable = false, length = 500)
    @Builder.Default
    private String autoCloseWarningMessage = "Olá! Notamos que você não respondeu há algum tempo. Para manter nossa fila organizada, este atendimento será encerrado automaticamente em breve caso não haja retorno.";
}
