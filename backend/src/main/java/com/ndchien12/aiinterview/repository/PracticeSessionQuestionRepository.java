package com.ndchien12.aiinterview.repository;

import com.ndchien12.aiinterview.entity.PracticeSession;
import com.ndchien12.aiinterview.entity.PracticeSessionQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PracticeSessionQuestionRepository extends JpaRepository<PracticeSessionQuestion, UUID> {
    List<PracticeSessionQuestion> findBySessionOrderByPositionAsc(PracticeSession session);
}
