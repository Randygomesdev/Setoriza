# 🛡️ Relatório de Análise de Segurança e Vulnerabilidades — Setoriza

Este relatório documenta um checkup completo de segurança realizado na infraestrutura e nos microsserviços do **Setoriza**, classificando possíveis vulnerabilidades por níveis de criticidade e propondo soluções de correção práticas e de nível de produção.

---

## 📊 Resumo de Vulnerabilidades

| ID | Vulnerabilidade | Área | Criticidade | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Ausência de Validação de Autenticidade no Webhook da Evolution API | Backend (`ticket-service`) | 🔴 **Crítico** | **Pendente** |
| **SEC-02** | Exposição de Chaves Secretas e Credenciais Padrão no Código | Geral (Configurações) | 🔴 **Crítico** | **Pendente (Config)** |
| **SEC-03** | Handshake de WebSocket Desprotegido contra DoS/Ataque de Conexão | Backend (`ticket-service`) | 🟡 **Médio** | **Pendente** |
| **SEC-04** | Configuração Permissiva de CORS (`*`) com Credenciais | Gateway (`gateway-service`) | 🟡 **Médio** | **Pendente (Config)** |
| **SEC-05** | Ausência de Limitação de Requisições por Rota (Login Brute Force) | Gateway (`gateway-service`) | 🟡 **Médio** | **Pendente (Config)** |
| **SEC-06** | Exposição Pública de Documentação de API (`Swagger-UI`/`Actuator`) | Gateway / Microsserviços | 🟢 **Baixo** | **Pendente (Config)** |

---

## 🔴 Vulnerabilidades Críticas (High / Critical)

### SEC-01: Ausência de Validação de Autenticidade no Webhook da Evolution API
* **Descrição:** A rota de recebimento de webhooks do WhatsApp `/api/v1/webhooks/evolution` está liberada no API Gateway e não possui nenhuma validação de token ou assinatura na entrada do controlador [WebhookController.java](file:///C:/Projects/Setoriza/Backend/ticket-service/src/main/java/br/com/innkercode/ticket/controller/WebhookController.java).
* **Impacto:** Qualquer usuário externo na internet pode forjar requisições HTTP `POST` enviando payloads JSON maliciosos simulando mensagens de clientes, alterando o status de chats reais, criando chamados falsos na fila ou injetando mensagens de sistema inexistentes no histórico de atendimentos.
* **Sugestão de Correção:** Como a Evolution API é registrada enviando a chave de API nos cabeçalhos (`"headers": {"apikey": "chave"}`), devemos validar esse token no cabeçalho `apikey` do webhook:
```java
    @PostMapping("/evolution")
    public ResponseEntity<Void> receiveEvolutionWebhook(
            @RequestHeader(value = "apikey", required = false) String incomingApiKey,
            @RequestBody WebhookPayload payload
    ) {
        if (incomingApiKey == null || !incomingApiKey.equals(expectedApiKey)) {
            log.warn("Tentativa de chamada de webhook não autorizada com apikey inválida.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // Processar normalmente
    }
```

---

### SEC-02: Exposição de Chaves Secretas e Credenciais Padrão no Código
* **Descrição:** Chaves secretas JWT (`sua_chave_secreta_minimo_256_bits`) e senhas padrão de infraestrutura (PostgreSQL, Redis e MinIO) estão expostas diretamente nos arquivos de configuração `application.yml` dos microsserviços.
* **Impacto:** Caso as chaves padrão não sejam substituídas em ambiente produtivo, um atacante pode assinar seus próprios tokens JWT administrativos (`ADMIN` ou `MASTER`) e assumir controle total de todas as APIs downstream.
* **Sugestão de Correção:**
  1. Garantir que as senhas e secrets em produção sejam obtidos exclusivamente através de variáveis de ambiente do sistema (`${JWT_SECRET}`, `${DB_PASSWORD}`) sem fallbacks padrão expostos na nuvem.
  2. Gerar chaves aleatórias de 256 bits no momento da implantação da nuvem.

---

## 🟡 Vulnerabilidades Médias (Medium)

### SEC-03: Handshake de WebSocket Desprotegido contra DoS
* **Descrição:** No arquivo [WebSocketConfig.java](file:///C:/Projects/Setoriza/Backend/ticket-service/src/main/java/br/com/innkercode/ticket/config/WebSocketConfig.java), o interceptador do handshake `/ws` sempre retorna `true` mesmo se o token JWT de parâmetro de query estiver ausente ou incorreto. Embora a conexão seja fechada logo após pelo interceptador do STOMP, o handshake TCP/HTTP é concluído com sucesso.
* **Impacto:** Um atacante pode realizar um ataque de negação de serviço (DoS) abrindo milhares de handshakes HTTP WebSocket falsos, saturando a fila de threads de conexões ativas do servidor de aplicação (Tomcat/Netty) sem precisar fornecer credenciais válidas.
* **Sugestão de Correção:** Realizar a validação inicial do token JWT diretamente no handshake interceptor antes de permitir a conexão do socket ser aceita:
```java
            @Override
            public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                           WebSocketHandler wsHandler, Map<String, Object> attributes) {
                if (request instanceof ServletServerHttpRequest servletRequest) {
                    String token = servletRequest.getServletRequest().getParameter("token");
                    if (token == null || token.isBlank() || !isValidJwt(token)) {
                        response.setStatusCode(HttpStatus.UNAUTHORIZED);
                        return false; // Rejeita a conexão imediatamente no handshake
                    }
                    attributes.put("token", token);
                }
                return true;
            }
```

---

### SEC-04: Configuração Permissiva de CORS (`*`) com Credenciais
* **Descrição:** O arquivo `application.yml` do Gateway-service possui a diretiva `allowedOriginPatterns: "*"` em conjunto com `allowCredentials: true`.
* **Impacto:** Em produção, se a autenticação utilizasse cookies de sessão, sites de terceiros maliciosos poderiam realizar requisições não autorizadas enviando as credenciais do usuário logado (ataques CSRF). Como o sistema usa autenticação via cabeçalho JWT customizado (`Authorization: Bearer`), o risco é atenuado, mas a configuração expõe o fluxo de dados internos da API a requisições de origens não catalogadas.
* **Sugestão de Correção:** Substituir o caractere coringa `*` em ambientes produtivos por uma lista estrita de domínios confiáveis do frontend:
```yaml
corsConfigurations:
  '[/**]':
    allowedOrigins: "https://setoriza.suaempresa.com.br"
    allowCredentials: true
```

---

### SEC-05: Ausência de Limitação de Requisições por Rota (Login Brute Force)
* **Descrição:** A limitação de requisições global (`replenishRate: 20`, `burstCapacity: 40`) está aplicada uniformemente a todas as rotas do gateway, inclusive no endpoint de autenticação `/api/v1/auth/login`.
* **Impacto:** Ataques de força bruta (brute-force) em senhas de colaboradores tornam-se viáveis, já que o limite global permite até 20 tentativas por segundo por IP, o que facilita a quebra de credenciais fracas.
* **Sugestão de Correção:** Isolar a rota de login no Gateway-service e aplicar filtros de rate limit muito mais estritos (ex: máximo de 5 requisições por minuto por IP):
```yaml
        - id: auth_login
          uri: ${AUTH_SERVICE_URL}
          predicates:
            - Path=/api/v1/auth/login
          filters:
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 1
                redis-rate-limiter.burstCapacity: 3
                key-resolver: "#{@ipKeyResolver}"
```

---

## 🟢 Vulnerabilidades Baixas (Low)

### SEC-06: Exposição Pública de Documentação de API (`Swagger` / `Actuator`)
* **Descrição:** Caminhos como `/v3/api-docs` e `/swagger-ui` estão listados como caminhos públicos no Gateway (`PUBLIC_PATHS`), ficando acessíveis sem qualquer autenticação.
* **Impacto:** Um invasor pode mapear todos os endpoints existentes no backend, modelos de banco de dados e formatos de parâmetros facilitando a descoberta de falhas mais complexas de exploração.
* **Sugestão de Correção:** Desativar a geração do Swagger em produção (`springdoc.api-docs.enabled: false`) ou restringir o acesso a esses caminhos no Gateway a endereços IP de VPN ou intranet corporativa.
