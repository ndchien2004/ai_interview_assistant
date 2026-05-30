package com.ndchien12.aiinterview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "interview_evaluations")
public class InterviewEvaluation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    private InterviewSession session;

    @Column(name = "total_score", nullable = false)
    private int totalScore;

    @Column(name = "technical_score", nullable = false)
    private int technicalScore;

    @Column(name = "communication_score", nullable = false)
    private int communicationScore;

    @Column(name = "experience_score", nullable = false)
    private int experienceScore;

    @Column(name = "problem_solving_score", nullable = false)
    private int problemSolvingScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "evaluation_mode", length = 40)
    private InterviewEvaluationMode evaluationMode = InterviewEvaluationMode.FALLBACK;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private InterviewEvaluationProvider provider = InterviewEvaluationProvider.LOCAL;

    @Column(length = 120)
    private String model = "local";

    @ElementCollection
    @Column(columnDefinition = "TEXT")
    private List<String> strengths = new ArrayList<>();

    @ElementCollection
    @Column(columnDefinition = "TEXT")
    private List<String> weaknesses = new ArrayList<>();

    @ElementCollection
    @Column(columnDefinition = "TEXT")
    private List<String> improvementRoadmap = new ArrayList<>();

    @Column(columnDefinition = "TEXT", nullable = false)
    private String summary = "";

    @OneToMany(mappedBy = "evaluation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InterviewQuestionFeedback> questionFeedback = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public InterviewSession getSession() {
        return session;
    }

    public void setSession(InterviewSession session) {
        this.session = session;
    }

    public int getTotalScore() {
        return totalScore;
    }

    public void setTotalScore(int totalScore) {
        this.totalScore = totalScore;
    }

    public int getTechnicalScore() {
        return technicalScore;
    }

    public void setTechnicalScore(int technicalScore) {
        this.technicalScore = technicalScore;
    }

    public int getCommunicationScore() {
        return communicationScore;
    }

    public void setCommunicationScore(int communicationScore) {
        this.communicationScore = communicationScore;
    }

    public int getExperienceScore() {
        return experienceScore;
    }

    public void setExperienceScore(int experienceScore) {
        this.experienceScore = experienceScore;
    }

    public int getProblemSolvingScore() {
        return problemSolvingScore;
    }

    public void setProblemSolvingScore(int problemSolvingScore) {
        this.problemSolvingScore = problemSolvingScore;
    }

    public InterviewEvaluationMode getEvaluationMode() {
        return evaluationMode;
    }

    public void setEvaluationMode(InterviewEvaluationMode evaluationMode) {
        this.evaluationMode = evaluationMode;
    }

    public InterviewEvaluationProvider getProvider() {
        return provider;
    }

    public void setProvider(InterviewEvaluationProvider provider) {
        this.provider = provider;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public List<String> getStrengths() {
        return strengths;
    }

    public void setStrengths(List<String> strengths) {
        this.strengths = strengths;
    }

    public List<String> getWeaknesses() {
        return weaknesses;
    }

    public void setWeaknesses(List<String> weaknesses) {
        this.weaknesses = weaknesses;
    }

    public List<String> getImprovementRoadmap() {
        return improvementRoadmap;
    }

    public void setImprovementRoadmap(List<String> improvementRoadmap) {
        this.improvementRoadmap = improvementRoadmap;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public List<InterviewQuestionFeedback> getQuestionFeedback() {
        return questionFeedback;
    }

    public void setQuestionFeedback(List<InterviewQuestionFeedback> questionFeedback) {
        this.questionFeedback.clear();
        if (questionFeedback != null) {
            questionFeedback.forEach(this::addQuestionFeedback);
        }
    }

    public void addQuestionFeedback(InterviewQuestionFeedback feedback) {
        feedback.setEvaluation(this);
        this.questionFeedback.add(feedback);
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
