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
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "resumes")
public class Resume {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "file_name", nullable = false, length = 260)
    private String fileName;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    @Column(name = "content_type", nullable = false, length = 120)
    private String contentType;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private Instant uploadedAt;

    @Column(name = "parsed_text", columnDefinition = "TEXT", nullable = false)
    private String parsedText = "";

    @Column(columnDefinition = "TEXT", nullable = false)
    private String summary = "";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ResumeStatus status = ResumeStatus.PROCESSING;

    @Column(name = "parse_error", columnDefinition = "TEXT")
    private String parseError;

    @ElementCollection
    private List<String> skills = new ArrayList<>();

    @ElementCollection
    private List<String> roleSignals = new ArrayList<>();

    @ElementCollection
    private List<String> senioritySignals = new ArrayList<>();

    @ElementCollection
    private List<String> projectHighlights = new ArrayList<>();

    @ElementCollection
    @Column(columnDefinition = "TEXT")
    private List<String> warnings = new ArrayList<>();

    @PrePersist
    void onCreate() {
        uploadedAt = Instant.now();
        if (status == null) {
            status = ResumeStatus.PROCESSING;
        }
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public long getFileSize() {
        return fileSize;
    }

    public void setFileSize(long fileSize) {
        this.fileSize = fileSize;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }

    public String getParsedText() {
        return parsedText;
    }

    public void setParsedText(String parsedText) {
        this.parsedText = parsedText;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public ResumeStatus getStatus() {
        return status;
    }

    public void setStatus(ResumeStatus status) {
        this.status = status;
    }

    public String getParseError() {
        return parseError;
    }

    public void setParseError(String parseError) {
        this.parseError = parseError;
    }

    public List<String> getSkills() {
        return skills;
    }

    public void setSkills(List<String> skills) {
        this.skills = skills;
    }

    public List<String> getRoleSignals() {
        return roleSignals;
    }

    public void setRoleSignals(List<String> roleSignals) {
        this.roleSignals = roleSignals;
    }

    public List<String> getSenioritySignals() {
        return senioritySignals;
    }

    public void setSenioritySignals(List<String> senioritySignals) {
        this.senioritySignals = senioritySignals;
    }

    public List<String> getProjectHighlights() {
        return projectHighlights;
    }

    public void setProjectHighlights(List<String> projectHighlights) {
        this.projectHighlights = projectHighlights;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }
}
