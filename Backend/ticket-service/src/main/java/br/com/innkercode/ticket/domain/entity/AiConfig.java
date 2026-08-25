package br.com.innkercode.ticket.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "ai_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiConfig {

    @Id
    private UUID id;

    @Column(name = "ai_enabled", nullable = false)
    private boolean aiEnabled;

    @Column(name = "auto_triage_enabled", nullable = false)
    private boolean autoTriageEnabled;

    @Column(name = "chatbot_enabled", nullable = false)
    private boolean chatbotEnabled;

    @Column(name = "gemini_api_key")
    private String geminiApiKey;

    @Column(name = "system_prompt", columnDefinition = "TEXT")
    private String systemPrompt;
}
