package com.ndchien12.aiinterview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.util.UUID;

@Entity
@Table(
        name = "practice_session_questions",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"session_id", "question_id"}),
                @UniqueConstraint(columnNames = {"session_id", "position"})
        }
)
public class PracticeSessionQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private PracticeSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    private PracticeQuestion question;

    @Column(nullable = false)
    private int position;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public PracticeSession getSession() {
        return session;
    }

    public void setSession(PracticeSession session) {
        this.session = session;
    }

    public PracticeQuestion getQuestion() {
        return question;
    }

    public void setQuestion(PracticeQuestion question) {
        this.question = question;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }
}
