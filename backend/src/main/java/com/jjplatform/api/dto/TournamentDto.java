package com.jjplatform.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class TournamentDto {
    private Long id;

    @NotBlank(message = "Tournament name is required")
    private String name;

    private String description;

    @NotNull(message = "Date is required")
    private LocalDate date;

    private Integer maxParticipants;
    private String status;
    private List<ParticipantDto> participants;
    private List<BracketMatchDto> matches;

    @Data
    public static class ParticipantDto {
        private Long id;
        private Long studentId;
        private String studentName;
        private Integer seed;
    }

    @Data
    public static class BracketMatchDto {
        private Long id;
        private Integer round;
        private Integer matchNumber;
        private ParticipantDto participant1;
        private ParticipantDto participant2;
        private Long winnerId;
    }
}
