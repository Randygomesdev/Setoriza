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

import br.com.innkercode.auth.dto.request.CreateUserRequest;
import br.com.innkercode.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
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
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserResponse response = authService.createUser(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('MASTER', 'ADMIN')")
    @Operation(summary = "Listar todos os usuários", description = "Retorna a lista de todos os usuários do sistema. Requer role MASTER ou ADMIN.")
    public ResponseEntity<List<UserResponse>> getAll() {
        List<User> users = userRepository.findAll();
        List<UserResponse> response = users.stream()
                .map(user -> new UserResponse(
                        user.getId(),
                        user.getName(),
                        user.getEmail(),
                        user.getPictureUrl(),
                        user.getRole().name(),
                        user.getSectors()
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
                user.getSectors()
        ));
    }
}
