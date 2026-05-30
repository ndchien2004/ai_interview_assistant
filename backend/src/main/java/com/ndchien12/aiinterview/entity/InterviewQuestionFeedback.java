package com.ndchien12.aiinterview.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
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
@Table(name = "interview_question_feedback")
public class InterviewQuestionFeedback {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluation_id", nullable = false)
    private InterviewEvaluation evaluation;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "question_prompt", columnDefinition = "TEXT", nullable = false)
    private String questionPrompt = "";

    @Column(name = "answer_text", columnDefinition = "TEXT", nullable = false)
    private String answerText = "";

    @Column(nullable = false)
    private int score;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String rationale = "";

    @ElementCollection
    @CollectionTable(name = "interview_question_feedback_missing_signals", joinColumns = @JoinColumn(name = "feedback_id"))
    @Column(name = "missing_signal", columnDefinition = "TEXT", nullable = false)
    private List<String> missingSignals = new ArrayList<>();

    @Column(name = "suggested_answer", columnDefinition = "TEXT", nullable = false)
    private String suggestedAnswer = "";

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    public UUID getId() {
        return id;
    }

    public InterviewEvaluation getEvaluation() {
        return evaluation;
    }

    public void setEvaluation(InterviewEvaluation evaluation) {
        this.evaluation = evaluation;
    }

    public UUID getQuestionId() {
        return questionId;
    }

    public void setQuestionId(UUID questionId) {
        this.questionId = questionId;
    }

    public String getQuestionPrompt() {
        return questionPrompt;
    }

    public void setQuestionPrompt(String questionPrompt) {
        this.questionPrompt = questionPrompt;
    }

    public String getAnswerText() {
        return answerText;
    }

    public void setAnswerText(String answerText) {
        this.answerText = answerText;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public String getRationale() {
        return rationale;
    }

    public void setRationale(String rationale) {
        this.rationale = rationale;
    }

    public List<String> getMissingSignals() {
        return missingSignals;
    }

    public void setMissingSignals(List<String> missingSignals) {
        this.missingSignals = missingSignals;
    }

    public String getSuggestedAnswer() {
        return suggestedAnswer;
    }

    public void setSuggestedAnswer(String suggestedAnswer) {
        this.suggestedAnswer = suggestedAnswer;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
