package br.com.innkercode.auth.service;

import br.com.innkercode.auth.exception.EmailException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String mailFrom;

    public void sendPasswordResetEmail(String to, String name, String token) {
        try {
            String resetUrl = "http://localhost:5173/reset-password?token=" + token;

            Context context = new Context();
            context.setVariable("name", name);
            context.setVariable("resetUrl", resetUrl);

            String htmlContent = templateEngine.process("password-reset", context);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true,  "UTF-8");

            helper.setFrom(mailFrom);
            helper.setTo(to);
            helper.setSubject("Setoriza - Recuperação de Senha");
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("E-mail HTML de recuperação enviado para: {}", to);
        } catch (MessagingException e) {
            log.error("Falha ao enviar e-mail HTML para: {}", to, e);
            throw new EmailException("Não foi possível enviar o e-mail de recuperação. Tente novamente mais tarde.", e);
        }
    }

    public void sendNewUserTemporaryPasswordEmail(String to, String name, String temporaryPassword) {
        try {
            String loginUrl = "http://localhost:5173/login";

            Context context = new Context();
            context.setVariable("name", name);
            context.setVariable("email", to);
            context.setVariable("temporaryPassword", temporaryPassword);
            context.setVariable("loginUrl", loginUrl);

            String htmlContent = templateEngine.process("new-user-welcome", context);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailFrom);
            helper.setTo(to);
            helper.setSubject("Setoriza - Sua Conta foi Criada!");
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("E-mail HTML de boas-vindas com senha provisória enviado para: {}", to);
        } catch (MessagingException e) {
            log.error("Falha ao enviar e-mail de boas-vindas para: {}", to, e);
            // Don't throw exception to block user creation in case SMTP is not working during testing
        }
    }
}
