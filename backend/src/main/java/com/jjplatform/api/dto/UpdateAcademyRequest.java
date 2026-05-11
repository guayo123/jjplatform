package com.jjplatform.api.dto;

import lombok.Data;

@Data
public class UpdateAcademyRequest {
    private String name;
    private String description;
    private String address;
    private String phone;
    private String whatsapp;
    private String instagram;
    private String wpPhoneNumberId;
    private String wpAccessToken;
    private String wpVerifyToken;
}
