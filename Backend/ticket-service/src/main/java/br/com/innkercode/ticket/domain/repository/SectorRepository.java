package br.com.innkercode.ticket.domain.repository;

import br.com.innkercode.ticket.domain.entity.Sector;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SectorRepository extends JpaRepository<Sector, UUID> {
    List<Sector> findByActiveTrue();
    Optional<Sector> findByNameIgnoreCase(String name);
}
