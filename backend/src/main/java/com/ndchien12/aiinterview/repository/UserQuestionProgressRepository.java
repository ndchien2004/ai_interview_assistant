package com.ndchien12.aiinterview.repository;

import com.ndchien12.aiinterview.entity.PracticeQuestion;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.entity.UserQuestionProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserQuestionProgressRepository extends JpaRepository<UserQuestionProgress, UUID> {
    Optional<UserQuestionProgress> findByUserAndQuestion(User user, PracticeQuestion question);

    List<UserQuestionProgress> findByUserAndQuestionCourseSlug(User user, String courseSlug);

    long countByUserAndQuestionCourseSlug(User user, String courseSlug);

    long countByUserAndQuestionCourseSlugAndMasteredTrue(User user, String courseSlug);
}
