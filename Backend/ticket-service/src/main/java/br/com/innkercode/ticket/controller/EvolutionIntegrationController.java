package br.com.innkercode.ticket.controller;

import br.com.innkercode.ticket.client.EvolutionClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/tickets/integration")
@RequiredArgsConstructor
@Slf4j
public class EvolutionIntegrationController {

    private final EvolutionClient evolutionClient;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(evolutionClient.getConnectionState());
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
}
