package com.ndchien12.aiinterview.repository;

import com.ndchien12.aiinterview.entity.Course;
import com.ndchien12.aiinterview.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CourseRepository extends JpaRepository<Course, UUID> {
    Optional<Course> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Course> findByActiveTrueOrderByTitleAsc();

    @Query("select c from Course c where c.active = true and (c.owner is null or c.owner = :owner) order by c.title asc")
    List<Course> findVisibleDecks(User owner);
}
