package com.jjplatform.api.dto;

import lombok.Data;

/**
 * Aggregated training stats for the portal dashboard / streak header.
 *
 * The "martial" fields (weeklyGoal, thisWeekCount, currentStreak, maxStreak, weeklyGoalMet) describe the
 * 🥋 arte-marcial streak and are kept under their original names so existing consumers keep working. The
 * streak is now WEEKLY-GOAL based: accumulated trained days that grow while you meet your weekly goal and
 * reset to 0 when a completed week misses it — with one forgiven "comodín" week per calendar month.
 */
@Data
public class TrainingSummaryDto {
    // ── 🥋 Arte marcial (BJJ + Kickboxing) — kept under legacy names ──
    /** Martial weekly goal: target training days per week (null = not set → onboarding). */
    private Integer weeklyGoal;
    /** Martial training days in the current ISO week (Mon-Sun). */
    private int thisWeekCount;
    /** Martial streak: accumulated trained days while meeting the weekly goal (resets on a missed week). */
    private int currentStreak;
    /** Best martial streak ever reached. */
    private int maxStreak;
    /** Whether the martial weekly goal is already met this week. */
    private boolean weeklyGoalMet;

    // ── 🏋️ Físico (acondicionamiento) ──
    private Integer conditioningGoal;
    private int conditioningThisWeek;
    private int conditioningStreak;
    private int conditioningMax;
    private boolean conditioningGoalMet;

    // ── 🎟️ Comodín (1 semana perdonada por mes calendario) ──
    /** Comodines left this calendar month (0 or 1). */
    private int comodinLeft;
    /** True when a comodín was already spent this month to keep a streak alive. */
    private boolean comodinUsed;

    // ── Volumen del mes ──
    /** Sessions in the current calendar month. */
    private int monthSessions;
    /** Total minutes trained in the current calendar month. */
    private int monthMinutes;
    /** Total sparring rounds in the current calendar month. */
    private int monthRounds;
}
