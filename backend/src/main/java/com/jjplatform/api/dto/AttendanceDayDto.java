package com.jjplatform.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Admin view of one day: each class of the weekly grid with who came / who reserved and didn't, plus free sessions. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceDayDto {
    private String date;
    private List<ClassDay> classes;
    private List<AttendanceDto> free;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassDay {
        private Long scheduleId;
        private String className;
        private String startTime;
        private String endTime;
        private String professorName;
        private Integer capacity;
        private List<AttendanceDto> attendees;
        /** Reserved this occurrence but never checked in. */
        private List<ReservationRosterDto> noShows;
    }
}
