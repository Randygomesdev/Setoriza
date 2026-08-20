package br.com.innkercode.auth.controller;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.dto.response.UserResponse;
import br.com.innkercode.auth.exception.UserNotFoundException;
import br.com.innkercode.auth.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.innkercode.auth.domain.model.UserRole;
import br.com.innkercode.auth.dto.request.CreateUserRequest;
import br.com.innkercode.auth.dto.request.ChangePasswordRequest;
import br.com.innkercode.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "Dados básicos de usuário para uso interno pelos parceiros")
public class UserController {

    private final UserRepository userRepository;
    private final AuthService authService;

    @PostMapping
    @PreAuthorize("hasAnyRole('MASTER', 'ADMIN')")
    @Operation(summary = "Criar um novo usuário administrativamente", description = "Permite que administradores ou o master criem novos colaboradores ou administradores.")
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Restringe criação de usuários MASTER por administradores normais
        if (currentUser.getRole() == UserRole.ADMIN && request.role() == UserRole.MASTER) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        UserResponse response = authService.createUser(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('MASTER', 'ADMIN', 'USER')")
    @Operation(summary = "Listar todos os usuários", description = "Retorna a lista de todos os usuários do sistema. Requer role MASTER, ADMIN ou USER.")
    public ResponseEntity<List<UserResponse>> getAll(
            @AuthenticationPrincipal User currentUser
    ) {
        List<User> users = userRepository.findAll();
        List<UserResponse> response = users.stream()
                .filter(u -> {
                    if (currentUser != null && currentUser.getRole() == UserRole.ADMIN) {
                        return u.getRole() != UserRole.MASTER;
                    }
                    return true;
                })
                .map(user -> new UserResponse(
                        user.getId(),
                        user.getName(),
                        user.getEmail(),
                        user.getPictureUrl(),
                        user.getRole().name(),
                        user.getSectors(),
                        null,
                        user.isActive()
                ))
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MASTER', 'ADMIN')")
    @Operation(summary = "Buscar usuário por ID", description = "Retorna dados básicos do usuário. Requer role MASTER ou ADMIN.")
    public ResponseEntity<UserResponse> getById(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("Usuário não encontrado"));
        return ResponseEntity.ok(new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPictureUrl(),
                user.getRole().name(),
                user.getSectors(),
                null,
                user.isActive()
        ));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MASTER', 'ADMIN')")
    @Operation(summary = "Atualizar um colaborador cadastrado", description = "Permite alterar nome, papel (role) e setores de um usuário.")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable UUID id,
            @RequestBody br.com.innkercode.auth.dto.request.UpdateUserRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User userToEdit = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("Usuário não encontrado"));

        if (currentUser.getRole() == UserRole.ADMIN) {
            if (userToEdit.getRole() == UserRole.MASTER) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            if (request.role() == UserRole.MASTER) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        UserResponse response = authService.updateUser(id, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/toggle-active")
    @PreAuthorize("hasAnyRole('MASTER', 'ADMIN')")
    @Operation(summary = "Ativar/Desativar colaborador", description = "Altera o status de atividade (active) de um colaborador. Colaboradores inativos não conseguem realizar login.")
    public ResponseEntity<UserResponse> toggleActive(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User userToToggle = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("Usuário não encontrado"));

        // Bloqueia alteração do MASTER por admins comuns
        if (currentUser.getRole() == UserRole.ADMIN && userToToggle.getRole() == UserRole.MASTER) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Evita que o usuário desative a si próprio
        if (currentUser.getId().equals(userToToggle.getId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        userToToggle.setActive(!userToToggle.isActive());
        userRepository.save(userToToggle);

        UserResponse response = new UserResponse(
                userToToggle.getId(),
                userToToggle.getName(),
                userToToggle.getEmail(),
                userToToggle.getPictureUrl(),
                userToToggle.getRole().name(),
                userToToggle.getSectors(),
                null,
                userToToggle.isActive()
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    @Operation(summary = "Alterar senha do usuário logado", description = "Permite que o usuário altere sua própria senha, validando a senha atual. Usado no primeiro acesso ou alteração normal.")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal User user
    ) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        authService.changePassword(user, request);
        return ResponseEntity.ok().build();
    }
}
