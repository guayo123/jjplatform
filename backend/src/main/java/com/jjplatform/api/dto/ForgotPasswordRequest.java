package com.jjplatform.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Payload for the "forgot password" flow. Only the email is needed: if it matches an
 * existing account we email a fresh temporary password; otherwise we respond the same
 * way to avoid revealing which emails are registered.
 */
@Data
public class ForgotPasswordRequest {

    @Email
    @NotBlank(message = "El correo es obligatorio")
    private String email;
}
