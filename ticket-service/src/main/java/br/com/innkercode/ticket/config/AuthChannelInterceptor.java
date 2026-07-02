package br.com.innkercode.ticket.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuthChannelInterceptor implements ChannelInterceptor {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            // 1. Obter o token dos cabeçalhos do STOMP CONNECT ou da query string
            String token = accessor.getFirstNativeHeader("Authorization");
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);
            } else {
                token = accessor.getFirstNativeHeader("token");
            }

            // Fallback para cabeçalhos nativos sem prefixo
            if (token == null || token.isBlank()) {
                List<String> nativeToken = accessor.getNativeHeader("token");
                if (nativeToken != null && !nativeToken.isEmpty()) {
                    token = nativeToken.get(0);
                }
            }

            // Se ainda não encontrar, verifica nos atributos da sessão que vieram do handshake
            if (token == null || token.isBlank()) {
                if (accessor.getSessionAttributes() != null) {
                    token = (String) accessor.getSessionAttributes().get("token");
                }
            }

            if (token == null || token.isBlank()) {
                log.warn("WebSocket: Conexão sem token JWT nos cabeçalhos STOMP CONNECT.");
                throw new MessageDeliveryException("Token de autenticação ausente.");
            }

            try {
                Claims claims = Jwts.parser()
                        .verifyWith(getSignInKey())
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();

                String userId = claims.get("userId", String.class);
                String role = claims.get("role", String.class);
                String email = claims.getSubject();

                log.info("WebSocket: Usuário autenticado com sucesso: {} (Role: {})", email, role);

                Principal principal = () -> email;
                
                accessor.setUser(principal);
                
                if (accessor.getSessionAttributes() != null) {
                    accessor.getSessionAttributes().put("userId", userId);
                    accessor.getSessionAttributes().put("userRole", role);
                    accessor.getSessionAttributes().put("userEmail", email);
                }

            } catch (Exception e) {
                log.error("WebSocket: Token JWT inválido ou expirado: {}", e.getMessage());
                throw new MessageDeliveryException("Token de autenticação inválido.");
            }
        }
        return message;
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
