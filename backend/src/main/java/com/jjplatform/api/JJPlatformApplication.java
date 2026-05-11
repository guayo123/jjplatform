package com.jjplatform.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class JJPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(JJPlatformApplication.class, args);
    }
}
