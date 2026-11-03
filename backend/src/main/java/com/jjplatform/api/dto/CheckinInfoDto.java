package com.jjplatform.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * What the check-in page shows after scanning the academy QR: the classes running now (none = free
 * session) and the profiles this login can mark present (own + wards) in that academy.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckinInfoDto {
    private Long academyId;
    private String academyName;
    private String academyLogoUrl;
    private List<ClassOption> classes;
    private List<Profile> profiles;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassOption {
        private Long scheduleId;
        private String className;
        private String startTime;
        private String endTime;
        private String professorName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Profile {
        private Long studentId;
        private String name;
        private String photoUrl;
        /** True when this profile is the login's own record (not a ward). */
        private boolean self;
        /** Schedule ids (and 0 for the free session) this profile is already marked present for today. */
        private List<Long> checkedIn;
    }
}
