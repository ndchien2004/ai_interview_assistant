package com.ndchien12.aiinterview.repository;

import com.ndchien12.aiinterview.entity.InterviewSession;
import com.ndchien12.aiinterview.entity.InterviewTranscriptMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InterviewTranscriptMessageRepository extends JpaRepository<InterviewTranscriptMessage, UUID> {
    List<InterviewTranscriptMessage> findBySessionOrderBySortOrderAsc(InterviewSession session);

    void deleteBySession(InterviewSession session);
}
