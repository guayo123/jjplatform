package com.jjplatform.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Payload for the "forgot password" flow. Requires BOTH the RUT and the email to match an
 * existing student record before a temporary password is issued — the same trust boundary as
 * student self-registration, so a leaked email alone can't trigger a password reset.
 */
@Data
public class ForgotPasswordRequest {

    @NotBlank(message = "El RUT es obligatorio")
    private String rut;

    @Email
    @NotBlank(message = "El correo es obligatorio")
    private String email;
}
