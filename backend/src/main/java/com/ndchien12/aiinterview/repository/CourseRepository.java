package com.ndchien12.aiinterview.repository;

import com.ndchien12.aiinterview.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CourseRepository extends JpaRepository<Course, UUID> {
    Optional<Course> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Course> findByActiveTrueOrderByTitleAsc();
}
