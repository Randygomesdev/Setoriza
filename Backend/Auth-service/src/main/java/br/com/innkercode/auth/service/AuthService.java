package br.com.innkercode.auth.service;

import br.com.innkercode.auth.domain.entity.PasswordResetToken;
import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.UserRole;
import br.com.innkercode.auth.dto.request.AuthenticationRequest;
import br.com.innkercode.auth.dto.request.RegisterRequest;
import br.com.innkercode.auth.dto.request.CreateUserRequest;
import br.com.innkercode.auth.dto.request.ChangePasswordRequest;
import br.com.innkercode.auth.dto.response.AuthenticationResponse;
import br.com.innkercode.auth.dto.response.UserResponse;
import br.com.innkercode.auth.exception.AuthException;
import br.com.innkercode.auth.repository.PasswordResetTokenRepository;
import br.com.innkercode.auth.repository.UserRepository;
import br.com.innkercode.auth.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;

    public AuthenticationResponse register(RegisterRequest request) {
        log.info("Iniciando registro de usuário: {}", request.email());

        if (userRepository.findByEmail(request.email()).isPresent()) {
            log.warn("Tentativa de registro com email já existente: {}", request.email());
            throw new AuthException("Este email já está cadastrado");
        }

        User user = User.builder()
                .name(request.name())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role(UserRole.USER)
                .requirePasswordChange(false)
                .active(true)
                .build();
        userRepository.save(user);
        log.info("Usuário cadastrado com sucesso: {}", request.email());

        String jwtToken = jwtService.generateToken(user);
        return new AuthenticationResponse(
                jwtToken,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getPictureUrl(),
                user.isRequirePasswordChange()
        );
    }

    public UserResponse createUser(CreateUserRequest request) {
        log.info("Iniciando criação administrativa de usuário com role: {}", request.role());

        if (userRepository.findByEmail(request.email()).isPresent()) {
            log.warn("Tentativa de criação com email já existente: {}", request.email());
            throw new AuthException("Este email já está cadastrado");
        }

        String tempPassword = generateTemporaryPassword();

        User user = User.builder()
                .name(request.name())
                .email(request.email())
                .password(passwordEncoder.encode(tempPassword))
                .role(request.role())
                .sectors(request.sectors())
                .requirePasswordChange(true)
                .active(true)
                .build();
        User savedUser = userRepository.save(user);
        log.info("Usuário criado com sucesso administrativamente: {}", request.email());

        emailService.sendNewUserTemporaryPasswordEmail(savedUser.getEmail(), savedUser.getName(), tempPassword);

        return new UserResponse(
                savedUser.getId(),
                savedUser.getName(),
                savedUser.getEmail(),
                savedUser.getPictureUrl(),
                savedUser.getRole().name(),
                savedUser.getSectors(),
                tempPassword,
                savedUser.isActive()
        );
    }

    public UserResponse updateUser(UUID id, br.com.innkercode.auth.dto.request.UpdateUserRequest request) {
        log.info("Atualizando dados do usuário ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new br.com.innkercode.auth.exception.UserNotFoundException("Usuário não encontrado"));

        if (request.name() != null) {
            user.setName(request.name());
        }
        if (request.email() != null && !request.email().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.findByEmail(request.email()).isPresent()) {
                throw new AuthException("Este email já está cadastrado por outro colaborador");
            }
            user.setEmail(request.email());
        }
        if (request.role() != null) {
            user.setRole(request.role());
        }
        if (request.sectors() != null) {
            user.setSectors(request.sectors());
        }

        User updatedUser = userRepository.save(user);
        log.info("Usuário ID: {} atualizado com sucesso", id);

        return new UserResponse(
                updatedUser.getId(),
                updatedUser.getName(),
                updatedUser.getEmail(),
                updatedUser.getPictureUrl(),
                updatedUser.getRole().name(),
                updatedUser.getSectors(),
                null,
                updatedUser.isActive()
        );
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        log.info("Tentativa de login para o usuário: {}", request.email());

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email(),
                        request.password()
                )
        );

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(()-> new AuthException("Usuário não encontrado"));

        log.info("Login realizado com sucesso: {}", request.email());

        String jwtToken = jwtService.generateToken(user);
        return new AuthenticationResponse(
                jwtToken,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getPictureUrl(),
                user.isRequirePasswordChange()
        );
    }

    @Transactional
    public void forgotPassword(String email) {
        log.info("Recebida solicitação de recuperação de senha para: {}", email);

        userRepository.findByEmail(email).ifPresentOrElse(
                user -> {
                    log.info("Usuário localizado. Gerando token de recuperação para: {}", user.getId());

                    tokenRepository.deleteByUser(user);

                    String token = UUID.randomUUID().toString();
                    PasswordResetToken resetToken = PasswordResetToken.builder()
                            .token(token)
                            .user(user)
                            .expiryDate(LocalDateTime.now().plusHours(24))
                            .build();
                    tokenRepository.save(resetToken);
                    log.debug("Token salvo no banco de dados para o usuário: {}", user.getId());

                    emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), token);
                    log.info("E-mail de recuperação enviado com sucesso para: {}", email);
                },
                () -> {
                    log.warn("Solicitação de reset ignorada: Email {} não cadastrado.", email);
                }
        );
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        log.info("Tentativa de reset de senha com token recebido");

        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> {
                    log.error("Token de recuperação inválido utilizado");
                    return new AuthException("Token inválido");
                });
        if (resetToken.isExpired()) {
            log.warn("Token de recuperação expirado para o usuário: {}", resetToken.getUser().getId());
            throw new AuthException("Token expirado");
        }
        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        tokenRepository.delete(resetToken);
        log.info("Senha alterada com sucesso para o usuário: {}", user.getId());
    }

    public void changePassword(User user, ChangePasswordRequest request) {
        log.info("Tentativa de alteração de senha para o usuário ID: {}", user.getId());

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            log.warn("Senha atual incorreta para o usuário ID: {}", user.getId());
            throw new AuthException("Senha atual incorreta");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setRequirePasswordChange(false);
        userRepository.save(user);

        log.info("Senha alterada com sucesso para o usuário ID: {}", user.getId());
    }

    private String generateTemporaryPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$";
        java.security.SecureRandom random = new java.security.SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 8; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
