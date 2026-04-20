package com.jjplatform.api.controller;

import com.jjplatform.api.dto.CreateUserRequest;
import com.jjplatform.api.dto.UserDto;
import com.jjplatform.api.service.SecurityHelper;
import com.jjplatform.api.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final SecurityHelper securityHelper;

    @GetMapping
    public ResponseEntity<List<UserDto>> list() {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(userService.getUsersByAcademy(academyId));
    }

    @PostMapping
    public ResponseEntity<UserDto> create(@Valid @RequestBody CreateUserRequest request) {
        Long academyId = securityHelper.getCurrentAcademyId();
        UserDto created = userService.createStaffUser(request, academyId);
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/{id}/toggle-active")
    public ResponseEntity<UserDto> toggleActive(@PathVariable Long id) {
        Long academyId = securityHelper.getCurrentAcademyId();
        UserDto updated = userService.toggleActiveStaff(id, academyId);
        return ResponseEntity.ok(updated);
    }
}

