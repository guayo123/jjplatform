package com.jjplatform.api.dto;

import lombok.Data;

/** Public-ish card of an academy mate, shown when tapping a name in a ranking. */
@Data
public class StudentCardDto {
    private Long id;
    private String name;
    private String nickname;
    private String belt;
    private Integer stripes;
    private Integer age;
    private Double weight;
    private String photoUrl;
}
