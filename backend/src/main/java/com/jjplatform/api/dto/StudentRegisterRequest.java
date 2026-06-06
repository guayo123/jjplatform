package com.jjplatform.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Payload for student self-registration. The RUT and email must match an existing
 * student record on the platform before an account is created.
 */
@Data
public class StudentRegisterRequest {

    @NotBlank(message = "El RUT es obligatorio")
    private String rut;

    @Email
    @NotBlank(message = "El correo es obligatorio")
    private String email;
}
