package com.jjplatform.api.dto;

import lombok.Data;

/** Aggregated training stats for the portal dashboard / streak header. */
@Data
public class TrainingSummaryDto {
    /** Target sessions per week (null = goal not set yet). */
    private Integer weeklyGoal;
    /** Sessions logged in the current ISO week (Mon-Sun). */
    private int thisWeekCount;
    /** Consecutive calendar days trained, counting up to today (or yesterday if today is unfinished). */
    private int currentStreak;
    /** Longest run of consecutive trained days ever. */
    private int maxStreak;
    /** Whether the weekly goal has already been met this week (for the "meta cumplida" badge). */
    private boolean weeklyGoalMet;
    /** Sessions in the current calendar month. */
    private int monthSessions;
    /** Total minutes trained in the current calendar month. */
    private int monthMinutes;
    /** Total sparring rounds in the current calendar month. */
    private int monthRounds;
}
