package com.ndchien12.aiinterview.repository;

import com.ndchien12.aiinterview.entity.InterviewEvaluation;
import com.ndchien12.aiinterview.entity.InterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface InterviewEvaluationRepository extends JpaRepository<InterviewEvaluation, UUID> {
    Optional<InterviewEvaluation> findBySession(InterviewSession session);
}
