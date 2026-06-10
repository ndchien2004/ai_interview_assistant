package com.ndchien12.aiinterview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "practice_sessions")
public class PracticeSession {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private PracticeSessionStatus status = PracticeSessionStatus.IN_PROGRESS;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private PracticeSessionMode mode = PracticeSessionMode.FLASHCARD;

    @Column(name = "topic_filter", length = 120)
    private String topicFilter;

    @Column(name = "deck_filter", length = 140)
    private String deckFilter;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty_filter", length = 40)
    private QuestionDifficulty difficultyFilter;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_filter", length = 40)
    private FlashcardStatusFilter statusFilter = FlashcardStatusFilter.ALL;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        if (mode == null) {
            mode = PracticeSessionMode.FLASHCARD;
        }
        if (statusFilter == null) {
            statusFilter = FlashcardStatusFilter.ALL;
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }

    public PracticeSessionStatus getStatus() {
        return status;
    }

    public void setStatus(PracticeSessionStatus status) {
        this.status = status;
    }

    public PracticeSessionMode getMode() {
        return mode;
    }

    public void setMode(PracticeSessionMode mode) {
        this.mode = mode;
    }

    public String getTopicFilter() {
        return topicFilter;
    }

    public void setTopicFilter(String topicFilter) {
        this.topicFilter = topicFilter;
    }

    public String getDeckFilter() {
        return deckFilter;
    }

    public void setDeckFilter(String deckFilter) {
        this.deckFilter = deckFilter;
    }

    public QuestionDifficulty getDifficultyFilter() {
        return difficultyFilter;
    }

    public void setDifficultyFilter(QuestionDifficulty difficultyFilter) {
        this.difficultyFilter = difficultyFilter;
    }

    public FlashcardStatusFilter getStatusFilter() {
        return statusFilter;
    }

    public void setStatusFilter(FlashcardStatusFilter statusFilter) {
        this.statusFilter = statusFilter;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }
}
