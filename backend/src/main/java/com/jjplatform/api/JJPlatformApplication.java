package com.jjplatform.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
public class JJPlatformApplication {

    /**
     * The academies operate in Chile: "today", "this month", stored timestamps and the cron jobs
     * (payment reminders at 10:00, duel expiry at 03:00) must follow Chilean time, DST included.
     * Without this the server runs on the host's zone (UTC on Railway, 3 h ahead).
     */
    static final String ZONE = "America/Santiago";

    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone(ZONE));
        SpringApplication.run(JJPlatformApplication.class, args);
    }
}
