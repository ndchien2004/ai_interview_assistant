package com.ndchien12.aiinterview.repository;

import com.ndchien12.aiinterview.entity.Course;
import com.ndchien12.aiinterview.entity.CourseSection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CourseSectionRepository extends JpaRepository<CourseSection, UUID> {
    List<CourseSection> findByCourseOrderBySortOrderAsc(Course course);

    List<CourseSection> findByCourseAndActiveTrueOrderBySortOrderAsc(Course course);

    Optional<CourseSection> findByCourseAndSlug(Course course, String slug);

    Optional<CourseSection> findByCourseAndSlugAndActiveTrue(Course course, String slug);

    boolean existsByCourseAndSlug(Course course, String slug);
}
