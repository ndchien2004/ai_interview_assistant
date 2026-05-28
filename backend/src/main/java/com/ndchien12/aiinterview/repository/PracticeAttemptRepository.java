package com.ndchien12.aiinterview.repository;

import com.ndchien12.aiinterview.entity.PracticeAttempt;
import com.ndchien12.aiinterview.entity.PracticeSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PracticeAttemptRepository extends JpaRepository<PracticeAttempt, UUID> {
    List<PracticeAttempt> findBySessionOrderByCreatedAtAsc(PracticeSession session);
}
