package com.jjplatform.api.dto;

import lombok.Data;

import java.util.List;

/** Both academy leaderboards in one payload so the portal can switch tabs without refetching. */
@Data
public class LeaderboardsDto {
    /** 🥋 Arte marcial (BJJ + Kickboxing) — martial training days this week + weekly-goal streak. */
    private List<LeaderboardEntryDto> martial;
    /** 🏋️ Físico (acondicionamiento) — gym sessions this week + weekly-goal streak. */
    private List<LeaderboardEntryDto> conditioning;
}
