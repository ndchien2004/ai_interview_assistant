package com.ndchien12.aiinterview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "interview_questions")
public class InterviewQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private InterviewSession session;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String prompt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private InterviewQuestionCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private InterviewQuestionDifficulty difficulty;

    @ElementCollection
    private List<String> expectedSignals = new ArrayList<>();

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    public UUID getId() {
        return id;
    }

    public InterviewSession getSession() {
        return session;
    }

    public void setSession(InterviewSession session) {
        this.session = session;
    }

    public String getPrompt() {
        return prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public InterviewQuestionCategory getCategory() {
        return category;
    }

    public void setCategory(InterviewQuestionCategory category) {
        this.category = category;
    }

    public InterviewQuestionDifficulty getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(InterviewQuestionDifficulty difficulty) {
        this.difficulty = difficulty;
    }

    public List<String> getExpectedSignals() {
        return expectedSignals;
    }

    public void setExpectedSignals(List<String> expectedSignals) {
        this.expectedSignals = expectedSignals;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
