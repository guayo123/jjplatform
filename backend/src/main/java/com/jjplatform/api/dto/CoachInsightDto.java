package com.jjplatform.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Pro AI-coach analysis: the generated plain-text insight and the day it was produced (null when none yet). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CoachInsightDto {
    private String text;
    private String date;
}
