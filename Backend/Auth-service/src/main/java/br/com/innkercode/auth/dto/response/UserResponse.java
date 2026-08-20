package br.com.innkercode.auth.dto.response;

import java.util.UUID;

public record UserResponse(
    UUID id, 
    String name, 
    String email, 
    String pictureUrl, 
    String role, 
    String sectors, 
    String temporaryPassword,
    Boolean active
) {}
