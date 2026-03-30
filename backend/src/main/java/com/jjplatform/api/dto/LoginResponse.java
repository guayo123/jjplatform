package com.jjplatform.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private String email;
    private Long academyId;
    private String academyName;
    private String role;
}
