package com.ndchien12.aiinterview.repository;

import com.ndchien12.aiinterview.entity.Course;
import com.ndchien12.aiinterview.entity.PracticeSession;
import com.ndchien12.aiinterview.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PracticeSessionRepository extends JpaRepository<PracticeSession, UUID> {
    List<PracticeSession> findTop10ByUserAndCourseOrderByCreatedAtDesc(User user, Course course);
}
