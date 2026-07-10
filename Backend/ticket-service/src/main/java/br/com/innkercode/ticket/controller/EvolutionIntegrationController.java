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

    @Value("${setoriza.base-url:http://localhost:8080}")
    private String setorizaBaseUrl;

    @SuppressWarnings("unchecked")
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
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
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(evolutionClient.createInstance());
    }

    @GetMapping("/qrcode")
    public ResponseEntity<Map<String, Object>> getQrCode(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(evolutionClient.getQrCode());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
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
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }
        String serverUrl = payload.get("serverUrl");
        if (serverUrl == null || serverUrl.isBlank()) {
            serverUrl = "http://localhost:8080";
        }
        return ResponseEntity.ok(evolutionClient.registerWebhook(serverUrl));
    }
}
