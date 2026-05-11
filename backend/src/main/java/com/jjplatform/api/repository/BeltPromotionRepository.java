package com.jjplatform.api.repository;

import com.jjplatform.api.model.BeltPromotion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BeltPromotionRepository extends JpaRepository<BeltPromotion, Long> {
    List<BeltPromotion> findByStudentIdAndAcademyIdOrderByPromotionDateDescIdDesc(Long studentId, Long academyId);
    List<BeltPromotion> findTop5ByAcademyIdOrderByPromotionDateDesc(Long academyId);
    List<BeltPromotion> findByAcademyIdOrderByStudentNameAscPromotionDateDesc(Long academyId);
}
