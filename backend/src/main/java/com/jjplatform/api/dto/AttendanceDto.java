package com.jjplatform.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** One attendance record (admin day view, student history, check-in result). scheduleId null = free session. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceDto {
    private Long id;
    private Long studentId;
    private String studentName;
    private String photoUrl;
    private String belt;
    private Long scheduleId;
    private String className;
    private String startTime;
    private String endTime;
    private String date;
    private String checkedInAt;
    private String source;
    /** Only in check-in results: false when the student was already marked for that class. */
    private Boolean created;
}
