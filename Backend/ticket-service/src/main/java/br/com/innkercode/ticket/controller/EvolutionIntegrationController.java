package br.com.innkercode.ticket.controller;

import br.com.innkercode.ticket.client.EvolutionClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/tickets/integration")
@RequiredArgsConstructor
@Slf4j
public class EvolutionIntegrationController {

    private final EvolutionClient evolutionClient;
    private final br.com.innkercode.ticket.domain.repository.WhatsAppConfigRepository whatsAppConfigRepository;
    private static final java.util.UUID GLOBAL_CONFIG_ID = java.util.UUID.fromString("00000000-0000-0000-0000-000000000000");

    @Value("${setoriza.base-url:http://localhost:8080}")
    private String setorizaBaseUrl;

    @SuppressWarnings("unchecked")
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if (!"MASTER".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }
        Map<String, Object> connectionState = evolutionClient.getConnectionState();
        
        if (connectionState != null && connectionState.containsKey("instance")) {
            Map<String, Object> instanceMap = (Map<String, Object>) connectionState.get("instance");
            if (instanceMap != null && "open".equals(instanceMap.get("state"))) {
                try {
                    log.info("Aparelho conectado. Registrando webhook silenciosamente para: {}", setorizaBaseUrl);
                    evolutionClient.registerWebhook(setorizaBaseUrl);
                } catch (Exception e) {
                    log.error("Erro ao registrar webhook automatico", e);
                }
            }
        }

        java.util.Map<String, Object> response = new java.util.HashMap<>(connectionState);
        response.put("configuredInstanceName", evolutionClient.getInstanceName());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/instance")
    public ResponseEntity<Map<String, Object>> createInstance(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if (!"MASTER".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(evolutionClient.createInstance());
    }

    @GetMapping("/qrcode")
    public ResponseEntity<Map<String, Object>> getQrCode(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if (!"MASTER".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(evolutionClient.getQrCode());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if (!"MASTER".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }
        evolutionClient.logoutInstance();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> registerWebhook(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestBody Map<String, String> payload
    ) {
        if (!"MASTER".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }
        String serverUrl = payload.get("serverUrl");
        if (serverUrl == null || serverUrl.isBlank()) {
            serverUrl = "http://localhost:8080";
        }
        return ResponseEntity.ok(evolutionClient.registerWebhook(serverUrl));
    }

    @GetMapping("/config")
    public ResponseEntity<br.com.innkercode.ticket.domain.entity.WhatsAppConfig> getConfig(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if (!"MASTER".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }
        br.com.innkercode.ticket.domain.entity.WhatsAppConfig config = whatsAppConfigRepository.findById(GLOBAL_CONFIG_ID)
                .orElseGet(() -> br.com.innkercode.ticket.domain.entity.WhatsAppConfig.builder()
                        .id(GLOBAL_CONFIG_ID)
                        .apiType(br.com.innkercode.ticket.domain.model.WhatsAppApiType.EVOLUTION)
                        .build());
        return ResponseEntity.ok(config);
    }

    @PutMapping("/config")
    public ResponseEntity<br.com.innkercode.ticket.domain.entity.WhatsAppConfig> updateConfig(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestBody br.com.innkercode.ticket.domain.entity.WhatsAppConfig newConfig
    ) {
        if (!"MASTER".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }
        br.com.innkercode.ticket.domain.entity.WhatsAppConfig config = whatsAppConfigRepository.findById(GLOBAL_CONFIG_ID)
                .orElseGet(() -> br.com.innkercode.ticket.domain.entity.WhatsAppConfig.builder()
                        .id(GLOBAL_CONFIG_ID)
                        .build());
        
        config.setApiType(newConfig.getApiType());
        config.setMetaPhoneNumberId(newConfig.getMetaPhoneNumberId());
        config.setMetaAccessToken(newConfig.getMetaAccessToken());
        config.setMetaWabaId(newConfig.getMetaWabaId());
        config.setMetaVerifyToken(newConfig.getMetaVerifyToken());

        return ResponseEntity.ok(whatsAppConfigRepository.save(config));
    }

    @PostMapping("/test-meta")
    public ResponseEntity<java.util.Map<String, Object>> testMetaConnection(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if (!"MASTER".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }
        
        br.com.innkercode.ticket.domain.entity.WhatsAppConfig config = whatsAppConfigRepository.findById(GLOBAL_CONFIG_ID)
                .orElse(null);
                
        if (config == null || config.getMetaPhoneNumberId() == null || config.getMetaAccessToken() == null ||
            config.getMetaPhoneNumberId().isBlank() || config.getMetaAccessToken().isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of(
                    "success", false,
                    "message", "Credenciais da Meta não configuradas no banco de dados."
            ));
        }

        try {
            org.springframework.web.client.RestClient testClient = org.springframework.web.client.RestClient.builder()
                    .baseUrl("https://graph.facebook.com/v19.0")
                    .build();

            String jsonResponse = testClient.get()
                    .uri("/{phoneNumberId}", config.getMetaPhoneNumberId())
                    .header("Authorization", "Bearer " + config.getMetaAccessToken())
                    .retrieve()
                    .body(String.class);

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            java.util.Map<?, ?> response = mapper.readValue(jsonResponse, java.util.Map.class);

            if (response != null && response.containsKey("id")) {
                return ResponseEntity.ok(java.util.Map.of(
                        "success", true,
                        "message", "Conexão validada com sucesso!",
                        "details", response
                ));
            } else {
                return ResponseEntity.ok(java.util.Map.of(
                        "success", false,
                        "message", "A Meta respondeu, mas não retornou os dados esperados do telefone."
                ));
            }
        } catch (Exception e) {
            log.error("Erro ao testar conexão com a Meta API", e);
            return ResponseEntity.ok(java.util.Map.of(
                    "success", false,
                    "message", "Falha de autenticação com a Meta API: " + e.getMessage()
            ));
        }
    }
}
