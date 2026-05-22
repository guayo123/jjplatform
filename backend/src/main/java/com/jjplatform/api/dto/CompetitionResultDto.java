package com.jjplatform.api.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class CompetitionResultDto {
    private Long id;
    private Long studentDisciplineId;
    private String tournamentName;
    private LocalDate date;
    private String placement;
    private String category;
    private String beltAtCompetition;
    private Integer stripesAtCompetition;
    private String notes;
}
