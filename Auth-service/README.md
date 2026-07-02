# Auth Service

Microsserviço de autenticação reutilizável construído com Spring Boot 3, Spring Security 6, JWT e OAuth2 (Google). Integre em qualquer projeto que precise de autenticação de usuários sem precisar reconstruir do zero.

## Funcionalidades

- Autenticação via JWT (token de acesso com expiração configurável)
- Login com Google via OAuth2
- Registro e login com e-mail e senha
- Redefinição de senha por e-mail (SMTP)
- Controle de acesso por papéis (`ADMIN`, `USER`)
- Migrações de banco de dados com Flyway
- Documentação Swagger em `/api/v1/swagger-ui.html`

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Linguagem | Java 21 |
| Framework | Spring Boot 3.4 |
| Segurança | Spring Security 6 + JJWT 0.12.6 |
| OAuth2 | Google |
| Banco de dados | PostgreSQL + Flyway |
| E-mail | Spring Mail (SMTP) |
| Documentação | SpringDoc OpenAPI 2.7 |

## Como usar

### 1. Pré-requisitos

- Java 21+
- Maven 3.9+
- PostgreSQL
- Credenciais Google OAuth2 (opcional)
- Credenciais SMTP (opcional, necessário para redefinição de senha)

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```properties
SERVER_PORT=8081

# Banco de dados
AUTH_DB_URL=jdbc:postgresql://localhost:5432/auth_db
AUTH_DB_USERNAME=seu_usuario
AUTH_DB_PASSWORD=sua_senha

# JWT
JWT_SECRET=sua_chave_secreta_minimo_256_bits
JWT_EXPIRATION=86400000

# Google OAuth2 (opcional)
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret

# E-mail / SMTP (opcional, necessário para redefinição de senha)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seu_email@gmail.com
MAIL_PASSWORD=sua_app_password
```

### 3. Executar

```bash
mvn spring-boot:run
```

O serviço iniciará em `http://localhost:8081/api/v1`.

## Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/register` | Registrar novo usuário |
| POST | `/auth/login` | Autenticar e receber JWT |
| POST | `/auth/forgot-password` | Enviar e-mail de redefinição de senha |
| POST | `/auth/reset-password` | Redefinir senha com token |
| POST | `/auth/exchange` | Trocar código OAuth2 por JWT |
| GET | `/users/{id}` | Buscar usuário por ID (autenticado) |

## Personalizando os papéis (Roles)

Por padrão, o serviço vem com dois papéis: `ADMIN` e `USER`. Para estendê-los no seu projeto, adicione constantes ao `UserRole.java` e crie uma nova migração Flyway se precisar de uma constraint no banco.

## Estrutura do projeto

```
src/main/java/br/com/innkercode/auth/
├── config/          # SecurityConfig, CORS
├── controller/      # AuthController, UserController
├── domain/
│   ├── entity/      # User, PasswordResetToken
│   └── model/       # UserRole
├── dto/             # DTOs de requisição e resposta
├── exception/       # GlobalExceptionHandler
├── repository/      # UserRepository, PasswordResetTokenRepository
├── security/        # JwtService, JwtAuthenticationFilter, handlers OAuth2
└── service/         # AuthService, EmailService, OAuth2TokenExchangeService
```

## Licença

MIT — livre para usar e adaptar em qualquer projeto.

---

Desenvolvido por [Innker Code](https://github.com/randygomesdev)
