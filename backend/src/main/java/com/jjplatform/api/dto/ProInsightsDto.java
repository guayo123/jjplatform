package com.jjplatform.api.dto;

import lombok.Data;

/**
 * Premium-only "you vs your academy" snapshot. Reuses the leaderboard aggregation: how the student's
 * weekly training and streak compare to the academy average, plus their rank/percentile.
 */
@Data
public class ProInsightsDto {
    private int yourThisWeek;          // your sessions this week
    private double academyAvgThisWeek; // academy average sessions this week
    private int yourStreak;            // your current day-streak
    private double academyAvgStreak;   // academy average streak
    private int rank;                  // 1-based position by sessions this week
    private int totalStudents;         // active students with activity in the window
    private int percentile;            // 0-100; how many peers you're at or above
}
