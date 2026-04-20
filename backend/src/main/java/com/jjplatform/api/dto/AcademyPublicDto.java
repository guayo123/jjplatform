package com.jjplatform.api.dto;

import lombok.Data;

import java.time.LocalTime;
import java.util.List;

@Data
public class AcademyPublicDto {
    private Long id;
    private String name;
    private String description;
    private String address;
    private String phone;
    private String logoUrl;
    private String whatsapp;
    private String instagram;
    private List<ScheduleDto> schedules;
    private List<PhotoDto> photos;
    private List<TournamentSummaryDto> tournaments;
    private List<PlanDto> plans;

    @Data
    public static class PlanDto {
        private Long id;
        private String name;
        private String description;
        private Integer price;
        private String features;
        private Integer displayOrder;
    }

    @Data
    public static class ScheduleDto {
        private Long id;
        private String dayOfWeek;
        private LocalTime startTime;
        private LocalTime endTime;
        private String className;
    }

    @Data
    public static class PhotoDto {
        private Long id;
        private String url;
        private String caption;
    }

    @Data
    public static class TournamentSummaryDto {
        private Long id;
        private String name;
        private String date;
        private String status;
        private int participantCount;
    }
}
