package com.jjplatform.api.dto;

import lombok.Data;

/** One row of the academy duel ranking: a student's win/loss record across completed duels. */
@Data
public class DuelRankingDto {
    private Long studentId;
    private String name;
    private String photoUrl;
    private int wins;
    private int losses;
    private int draws;
}
