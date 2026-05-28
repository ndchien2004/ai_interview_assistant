package com.ndchien12.aiinterview.repository;

import com.ndchien12.aiinterview.entity.Course;
import com.ndchien12.aiinterview.entity.PracticeQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PracticeQuestionRepository extends JpaRepository<PracticeQuestion, UUID> {
    List<PracticeQuestion> findByCourseAndActiveTrueOrderBySortOrderAsc(Course course);

    long countByCourseAndActiveTrue(Course course);

    long countByCourse(Course course);

    List<PracticeQuestion> findByCourseAndTopicAndActiveTrueOrderBySortOrderAsc(Course course, String topic);
}
