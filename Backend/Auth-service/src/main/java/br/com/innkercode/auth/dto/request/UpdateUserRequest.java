package br.com.innkercode.auth.dto.request;

import br.com.innkercode.auth.domain.model.UserRole;

public record UpdateUserRequest(
        String name,
        String email,
        UserRole role,
        String sectors
) {}
