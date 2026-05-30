package com.ndchien12.aiinterview.repository;

import com.ndchien12.aiinterview.entity.InterviewQuestion;
import com.ndchien12.aiinterview.entity.InterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InterviewQuestionRepository extends JpaRepository<InterviewQuestion, UUID> {
    List<InterviewQuestion> findBySessionOrderBySortOrderAsc(InterviewSession session);
}
