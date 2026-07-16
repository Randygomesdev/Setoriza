package br.com.innkercode.ticket.domain.entity;

import br.com.innkercode.ticket.domain.model.WhatsAppApiType;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "whatsapp_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhatsAppConfig {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "api_type", nullable = false)
    private WhatsAppApiType apiType;

    @Column(name = "meta_phone_number_id")
    private String metaPhoneNumberId;

    @Column(name = "meta_access_token")
    private String metaAccessToken;

    @Column(name = "meta_waba_id")
    private String metaWabaId;

    @Column(name = "meta_verify_token")
    private String metaVerifyToken;
}
