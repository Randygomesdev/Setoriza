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
    public ResponseEntity<AiConfig> getConfig() {
        return ResponseEntity.ok(aiConfigService.getConfig());
    }

    @PutMapping
    public ResponseEntity<AiConfig> updateConfig(@RequestBody AiConfig config) {
        return ResponseEntity.ok(aiConfigService.updateConfig(config));
    }

    @PostMapping("/test")
    public ResponseEntity<java.util.Map<String, String>> testConnection() {
        String result = aiConfigService.testConnection();
        return ResponseEntity.ok(java.util.Map.of("result", result != null ? result : ""));
    }
}
