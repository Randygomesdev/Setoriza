package br.com.innkercode.gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@Component
public class JwtGlobalFilter implements GlobalFilter, Ordered {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${gateway.public-paths:/api/v1/auth/login,/api/v1/auth/register,/api/v1/auth/forgot-password,/api/v1/auth/reset-password,/api/v1/auth/oauth2,/login/oauth2,/oauth2,/v3/api-docs,/swagger-ui,/api/v1/webhooks}")
    private List<String> publicPaths;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        String token = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else if (path != null && path.startsWith("/api/v1/ws")) {
            token = request.getQueryParams().getFirst("token");
        }

        if (token == null || token.isBlank()) {
            log.warn("Gateway: requisição sem token JWT para {}", path);
            return unauthorizedResponse(exchange);
        }

        try {
            Claims claims = extractClaims(token);
            String userId = claims.get("userId", String.class);
            String role   = claims.get("role", String.class);
            String email  = claims.getSubject();
            String sectors = claims.get("sectors", String.class);

            log.debug("Gateway: token válido para usuário {} com role {}", email, role);

            ServerHttpRequest mutatedRequest = request.mutate()
                    .header("X-User-Id",      userId != null ? userId : "")
                    .header("X-User-Role",    role   != null ? role   : "")
                    .header("X-User-Email",   email  != null ? email  : "")
                    .header("X-User-Sectors", sectors != null ? sectors : "")
                    .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build());

        } catch (Exception e) {
            log.warn("Gateway: token JWT inválido ou expirado para {}: {}", path, e.getMessage());
            return unauthorizedResponse(exchange);
        }
    }

    private boolean isPublicPath(String path) {
        return publicPaths.stream().anyMatch(path::startsWith);
    }

    private Mono<Void> unauthorizedResponse(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add("Content-Type", "application/json");
        var body = response.bufferFactory()
                .wrap("{\"status\":401,\"message\":\"Token de autenticação ausente ou inválido.\"}".getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(body));
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
