package com.ndchien12.aiinterview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 180)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(length = 240)
    private String headline;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "date_of_birth_set_at")
    private Instant dateOfBirthSetAt;

    @Column(name = "name_change_count", nullable = false, columnDefinition = "integer default 0")
    private int nameChangeCount = 0;

    @Column(name = "name_last_changed_at")
    private Instant nameLastChangedAt;

    @Column(name = "avatar_url", columnDefinition = "TEXT")
    private String avatarUrl;

    @Column(name = "avatar_public_id", length = 360)
    private String avatarPublicId;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider", nullable = false, length = 40, columnDefinition = "varchar(40) default 'LOCAL'")
    private AuthProvider authProvider = AuthProvider.LOCAL;

    @Column(name = "password_set", nullable = false, columnDefinition = "boolean default true")
    private boolean passwordSet = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Role role = Role.USER;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        email = normalizeEmail(email);
        applyDefaults();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
        email = normalizeEmail(email);
        applyDefaults();
    }

    private void applyDefaults() {
        if (authProvider == null) {
            authProvider = AuthProvider.LOCAL;
        }
        if (role == null) {
            role = Role.USER;
        }
    }

    private String normalizeEmail(String value) {
        return value == null ? null : value.trim().toLowerCase();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = normalizeEmail(email);
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getHeadline() {
        return headline;
    }

    public void setHeadline(String headline) {
        this.headline = headline;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public Instant getDateOfBirthSetAt() {
        return dateOfBirthSetAt;
    }

    public void setDateOfBirthSetAt(Instant dateOfBirthSetAt) {
        this.dateOfBirthSetAt = dateOfBirthSetAt;
    }

    public int getNameChangeCount() {
        return nameChangeCount;
    }

    public void setNameChangeCount(int nameChangeCount) {
        this.nameChangeCount = nameChangeCount;
    }

    public Instant getNameLastChangedAt() {
        return nameLastChangedAt;
    }

    public void setNameLastChangedAt(Instant nameLastChangedAt) {
        this.nameLastChangedAt = nameLastChangedAt;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getAvatarPublicId() {
        return avatarPublicId;
    }

    public void setAvatarPublicId(String avatarPublicId) {
        this.avatarPublicId = avatarPublicId;
    }

    public AuthProvider getAuthProvider() {
        return authProvider;
    }

    public void setAuthProvider(AuthProvider authProvider) {
        this.authProvider = authProvider;
    }

    public boolean isPasswordSet() {
        return passwordSet;
    }

    public void setPasswordSet(boolean passwordSet) {
        this.passwordSet = passwordSet;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
