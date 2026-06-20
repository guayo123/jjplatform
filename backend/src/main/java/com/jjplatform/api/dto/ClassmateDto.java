package com.jjplatform.api.dto;

import lombok.Data;

/** Minimal classmate info for the training-partner picker in the student portal. */
@Data
public class ClassmateDto {
    private Long id;
    private String name;
    private String nickname;
    private String belt;
    private Integer stripes;
    private String photoUrl;
    private Integer age;
}
