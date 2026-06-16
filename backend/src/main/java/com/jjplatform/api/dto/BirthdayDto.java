package com.jjplatform.api.dto;

import lombok.Data;

/** A classmate's birthday within the current month — for the "Cumpleaños del mes" card in the portal. */
@Data
public class BirthdayDto {
    private Long id;
    private String name;
    private String photoUrl;
    /** Day of month (1–31). The year is deliberately omitted so the card never reveals age. */
    private int day;
    private int month;
}
