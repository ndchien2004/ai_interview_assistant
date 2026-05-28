package com.ndchien12.aiinterview.entity;

import jakarta.persistence.CollectionTable;
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
@Table(name = "practice_questions")
public class PracticeQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private CourseSection section;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String question;

    @Column(name = "short_answer", nullable = false, columnDefinition = "TEXT")
    private String shortAnswer;

    @Column(name = "detailed_answer", nullable = false, columnDefinition = "TEXT")
    private String detailedAnswer;

    @Column(name = "code_snippet", columnDefinition = "TEXT")
    private String codeSnippet;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private QuestionDifficulty difficulty;

    @Column(nullable = false, length = 120)
    private String topic;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @ElementCollection
    @CollectionTable(name = "practice_question_key_points", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "key_point", nullable = false, columnDefinition = "TEXT")
    private List<String> keyPoints = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "practice_question_mistakes", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "mistake", nullable = false, columnDefinition = "TEXT")
    private List<String> commonMistakes = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "practice_question_tags", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "tag", nullable = false, length = 80)
    private List<String> tags = new ArrayList<>();

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }

    public CourseSection getSection() {
        return section;
    }

    public void setSection(CourseSection section) {
        this.section = section;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public String getShortAnswer() {
        return shortAnswer;
    }

    public void setShortAnswer(String shortAnswer) {
        this.shortAnswer = shortAnswer;
    }

    public String getDetailedAnswer() {
        return detailedAnswer;
    }

    public void setDetailedAnswer(String detailedAnswer) {
        this.detailedAnswer = detailedAnswer;
    }

    public String getCodeSnippet() {
        return codeSnippet;
    }

    public void setCodeSnippet(String codeSnippet) {
        this.codeSnippet = codeSnippet;
    }

    public QuestionDifficulty getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(QuestionDifficulty difficulty) {
        this.difficulty = difficulty;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public List<String> getKeyPoints() {
        return keyPoints;
    }

    public void setKeyPoints(List<String> keyPoints) {
        this.keyPoints = keyPoints;
    }

    public List<String> getCommonMistakes() {
        return commonMistakes;
    }

    public void setCommonMistakes(List<String> commonMistakes) {
        this.commonMistakes = commonMistakes;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }
}
