package com.ndchien12.aiinterview.repository;

import com.ndchien12.aiinterview.entity.InterviewAnswer;
import com.ndchien12.aiinterview.entity.InterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InterviewAnswerRepository extends JpaRepository<InterviewAnswer, UUID> {
    List<InterviewAnswer> findBySessionOrderByCreatedAtAsc(InterviewSession session);

    void deleteBySession(InterviewSession session);
}
