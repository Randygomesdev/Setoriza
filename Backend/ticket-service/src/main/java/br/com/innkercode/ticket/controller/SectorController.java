package br.com.innkercode.ticket.controller;

import br.com.innkercode.ticket.domain.entity.Sector;
import br.com.innkercode.ticket.domain.repository.SectorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/sectors")
@RequiredArgsConstructor
@Slf4j
public class SectorController {

    private final SectorRepository sectorRepository;

    @GetMapping
    public ResponseEntity<List<Sector>> getAll(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        log.info("Listando setores. Solicitante role: {}", userRole);
        if (userRole == null || userRole.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(sectorRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Sector> create(
            @RequestBody Sector sector,
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        log.info("Criando novo setor: {}. Solicitante role: {}", sector.getName(), userRole);
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        sector.setId(null);
        return ResponseEntity.ok(sectorRepository.save(sector));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Sector> update(
            @PathVariable UUID id,
            @RequestBody Sector sectorDetails,
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        log.info("Atualizando setor ID: {}. Solicitante role: {}", id, userRole);
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Sector sector = sectorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Setor não encontrado"));
        sector.setName(sectorDetails.getName());
        sector.setFriendlyName(sectorDetails.getFriendlyName());
        sector.setActive(sectorDetails.isActive());
        if (sectorDetails.getSlaLimitMinutes() != null) {
            sector.setSlaLimitMinutes(sectorDetails.getSlaLimitMinutes());
        }
        return ResponseEntity.ok(sectorRepository.save(sector));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        log.info("Desativando setor ID (soft delete): {}. Solicitante role: {}", id, userRole);
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Sector sector = sectorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Setor não encontrado"));
        sector.setActive(false);
        sectorRepository.save(sector);
        return ResponseEntity.ok().build();
    }
}
