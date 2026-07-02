# Gateway Service

Microsserviço de API Gateway reutilizável construído com Spring Cloud Gateway. Valida tokens JWT, aplica CORS, rate limiting via Redis e injeta informações do usuário autenticado como headers para os serviços downstream.

## Funcionalidades

- Validação de JWT em todas as rotas protegidas
- Injeção de headers `X-User-Id`, `X-User-Role` e `X-User-Email` para os serviços downstream
- Rate limiting por IP via Redis (proteção contra brute-force e DDoS)
- Configuração de CORS centralizada
- Rotas públicas configuráveis (sem autenticação)
- Actuator com endpoints `health` e `info`

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Linguagem | Java 21 |
| Framework | Spring Boot 3.4 + Spring Cloud Gateway |
| Autenticação | JJWT 0.12.6 |
| Rate Limiting | Redis (Spring Data Redis Reactive) |
| Documentação | Actuator |

## Como usar

### 1. Pré-requisitos

- Java 21+
- Maven 3.9+
- Redis em execução

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```properties
SERVER_PORT=8080

# JWT — deve ser o mesmo segredo do auth-service
JWT_SECRET=sua_chave_secreta_minimo_256_bits

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS — origens permitidas separadas por vírgula
ALLOWED_ORIGINS=http://localhost:5173
```

### 3. Configurar as rotas

No `application.yml`, substitua `routes: []` pelas rotas do seu projeto:

```yaml
routes:
  - id: auth-service
    uri: http://localhost:8081
    predicates:
      - Path=/api/v1/auth/**

  - id: meu-servico
    uri: http://localhost:8082
    predicates:
      - Path=/api/v1/meu-recurso/**
```

### 4. Executar

```bash
mvn spring-boot:run
```

O gateway iniciará em `http://localhost:8080`.

## Rotas públicas

Por padrão as seguintes rotas não exigem JWT:

```
/api/v1/auth/login
/api/v1/auth/register
/api/v1/auth/forgot-password
/api/v1/auth/reset-password
/api/v1/auth/oauth2/**
/login/oauth2/**
/oauth2/**
/v3/api-docs/**
/swagger-ui/**
```

Para adicionar mais rotas públicas, edite a lista `PUBLIC_PATHS` em `JwtGlobalFilter.java`.

## Headers injetados nos serviços downstream

Após validação do JWT, o gateway injeta automaticamente:

| Header | Conteúdo |
|--------|----------|
| `X-User-Id` | UUID do usuário autenticado |
| `X-User-Role` | Role do usuário (ex: `ADMIN`, `USER`) |
| `X-User-Email` | E-mail do usuário autenticado |

## Estrutura do projeto

```
src/main/java/br/com/innkercode/gateway/
├── config/     # RateLimiterConfig (KeyResolver por IP)
└── security/   # JwtGlobalFilter (validação JWT + injeção de headers)
```

## Licença

MIT — livre para usar e adaptar em qualquer projeto.

---

Desenvolvido por [Innker Code](https://github.com/randygomesdev)
