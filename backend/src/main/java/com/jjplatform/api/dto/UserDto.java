package com.jjplatform.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class UserDto {
    private Long id;
    private String email;
    private String role;
    private LocalDateTime createdAt;
}
