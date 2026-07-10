# Guia de Configuração de Integrações: Google OAuth2 & SMTP

Este guia explica o passo a passo para configurar as credenciais de **Google OAuth2** (Login com o Google) e **SMTP** (Envio de e-mails para recuperação de senha) no ambiente de desenvolvimento do Setoriza.

> [!NOTE]
> O login convencional (e-mail/senha) já está configurado e funciona sem necessidade de nenhuma ação externa. 
> Credenciais padrão de teste:
> * **E-mail:** `master@setoriza.com`
> * **Senha:** `setoriza123`

---

## 🔐 1. Configuração do Google OAuth2 (Login com o Google)

Para permitir que atendentes façam login utilizando suas contas do Google, siga as instruções abaixo:

1. **Acesse o Console de Desenvolvedores do Google:**
   * Vá para [Google Cloud Console](https://console.cloud.google.com/).
   * Faça login com sua conta do Google.

2. **Crie um Novo Projeto:**
   * Clique no menu de projetos no topo da página e selecione **"Novo Projeto"**.
   * Dê o nome de `Setoriza` e clique em **Criar**.

3. **Configure a Tela de Consentimento OAuth (OAuth Consent Screen):**
   * No menu lateral esquerdo, vá em **APIs e Serviços** > **Tela de consentimento OAuth**.
   * Escolha o Tipo de Usuário **External** (Externo) e clique em **Criar**.
   * Preencha as informações básicas do aplicativo (Nome do app, e-mail de suporte).
   * Prossiga até o final salvando as etapas.

4. **Crie as Credenciais:**
   * No menu lateral esquerdo, clique em **Credenciais**.
   * Clique em **+ Criar Credenciais** no topo e selecione **ID do cliente OAuth**.
   * Em *Tipo de aplicativo*, selecione **Aplicativo da Web**.
   * Em *Origens JavaScript autorizadas*, adicione:
     * `http://localhost:8080`
   * Em *URIs de redirecionamento autorizados*, adicione **exatamente**:
     * `http://localhost:8080/login/oauth2/code/google`
   * Clique em **Criar**.

5. **Copie as Chaves:**
   * Copie o **ID do cliente** e a **Chave secreta do cliente** gerados.

6. **Atualize o arquivo `.env`:**
   * Abra o arquivo [Auth-service/.env](file:///C:/Projects/Setoriza/Backend/Auth-service/.env).
   * Substitua os valores das seguintes chaves:
     ```properties
     GOOGLE_CLIENT_ID=seu_client_id_do_google_aqui
     GOOGLE_CLIENT_SECRET=sua_chave_secreta_do_google_aqui
     ```

---

## ✉️ 2. Configuração do SMTP (Envio de E-mails via Gmail)

Para habilitar o envio de e-mails do sistema (ex: recuperação de senhas) utilizando um servidor de testes do Gmail:

1. **Acesse as Configurações da sua Conta Google:**
   * Acesse [Minha Conta Google - Segurança](https://myaccount.google.com/security).

2. **Ative a Verificação em Duas Etapas:**
   * Na seção *Como você faz login no Google*, certifique-se de que a **Verificação em duas etapas** está **Ativada**.

3. **Gere uma Senha de App (App Password):**
   * Pesquise por **"Senhas de app"** na barra de pesquisa superior ou acesse diretamente [Senhas de app](https://myaccount.google.com/apppasswords).
   * Digite o nome do app (ex: `Setoriza Dev`) e clique em **Criar**.
   * O Google gerará uma senha amarela de **16 caracteres**. Copie esta senha (ela só aparece uma vez).

4. **Atualize o arquivo `.env`:**
   * Abra o arquivo [Auth-service/.env](file:///C:/Projects/Setoriza/Backend/Auth-service/.env).
   * Substitua os valores das seguintes chaves:
     ```properties
     MAIL_HOST=smtp.gmail.com
     MAIL_PORT=587
     MAIL_USERNAME=seu_email@gmail.com
     MAIL_PASSWORD=sua_senha_de_app_de_16_caracteres
     ```

---

## ♻️ Como Aplicar as Alterações
Após salvar o arquivo `.env`, o microsserviço **Auth-service** lerá as credenciais atualizadas no próximo reinício. 
Se o serviço estiver rodando, basta reiniciá-lo executando `mvn spring-boot:run` novamente.
