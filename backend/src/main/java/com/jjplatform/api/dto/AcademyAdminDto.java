package com.jjplatform.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class AcademyAdminDto {
    private Long id;
    private String name;
    private String description;
    private String address;
    private String phone;
    private String adminEmail;
    private int studentCount;
    private boolean active;
    private LocalDateTime createdAt;
}
