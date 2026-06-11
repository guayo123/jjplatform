package com.jjplatform.api.dto;

import lombok.Data;

/** One row of the academy training leaderboard (week sessions + day streak). */
@Data
public class LeaderboardEntryDto {
    private Long studentId;
    private String name;
    private String photoUrl;
    /** Sessions logged in the current ISO week. */
    private int thisWeekCount;
    /** Current consecutive-day streak (with the today-in-progress grace). */
    private int currentStreak;
}
