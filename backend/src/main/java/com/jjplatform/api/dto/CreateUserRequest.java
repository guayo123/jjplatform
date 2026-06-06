package com.jjplatform.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CreateUserRequest {

    @Email
    @NotBlank
    private String email;

    @NotNull
    @Pattern(regexp = "ENCARGADO", message = "Solo se pueden crear usuarios con rol ENCARGADO desde aquí. Los profesores se gestionan desde la pantalla de Profesores.")
    private String role;
}
