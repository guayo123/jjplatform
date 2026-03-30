package com.jjplatform.api.service;

import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SecurityHelper {

    private final AcademyRepository academyRepository;

    public User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    public Long getCurrentAcademyId() {
        User user = getCurrentUser();
        // ADMIN/SUPER_ADMIN have their own Academy entity
        if (user.getRole() == User.Role.ADMIN || user.getRole() == User.Role.SUPER_ADMIN) {
            Academy academy = academyRepository.findByUserId(user.getId())
                    .orElseThrow(() -> new IllegalStateException("No academy found for current user"));
            return academy.getId();
        }
        // PROFESOR/ENCARGADO have academyId stored directly on the user
        if (user.getAcademyId() == null) {
            throw new IllegalStateException("No academy assigned to staff user");
        }
        return user.getAcademyId();
    }
}
