package com.ndchien12.aiinterview.repository;

import com.ndchien12.aiinterview.entity.InterviewSession;
import com.ndchien12.aiinterview.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InterviewSessionRepository extends JpaRepository<InterviewSession, UUID> {
    List<InterviewSession> findByUserOrderByCreatedAtDesc(User user);

    Optional<InterviewSession> findByIdAndUser(UUID id, User user);
}
