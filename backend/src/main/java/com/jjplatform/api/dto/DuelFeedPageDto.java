package com.jjplatform.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

/**
 * One page of the academy feed. {@code nextCursor} is an opaque token the client echoes back to
 * fetch the next (older) page; {@code null} means there are no more rows.
 */
@Data
@AllArgsConstructor
public class DuelFeedPageDto {
    private List<DuelDto> items;
    private String nextCursor;
}
