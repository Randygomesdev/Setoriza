package br.com.innkercode.ticket.controller;

import br.com.innkercode.ticket.domain.entity.AiConfig;
import br.com.innkercode.ticket.service.AiConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai/config")
@RequiredArgsConstructor
public class AiConfigController {

    private final AiConfigService aiConfigService;

    @GetMapping
    public ResponseEntity<AiConfig> getConfig(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if (!"MASTER".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(aiConfigService.getConfig());
    }

    @PutMapping
    public ResponseEntity<AiConfig> updateConfig(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestBody AiConfig config
    ) {
        if (!"MASTER".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(aiConfigService.updateConfig(config));
    }

    @PostMapping("/test")
    public ResponseEntity<java.util.Map<String, String>> testConnection(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if (!"MASTER".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }
        String result = aiConfigService.testConnection();
        return ResponseEntity.ok(java.util.Map.of("result", result != null ? result : ""));
    }
}
