package com.jjplatform.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** One dated occurrence of a recurring class, with reservation state for the requesting student. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpcomingClassDto {
    private Long scheduleId;
    private String classDate;     // ISO yyyy-MM-dd
    private String dayOfWeek;
    private String startTime;     // HH:mm
    private String endTime;       // HH:mm
    private String className;
    private String professorName;
    private Integer capacity;     // null = unlimited
    private int reservedCount;
    private Integer spotsLeft;    // null = unlimited
    private boolean mineReserved;
}
