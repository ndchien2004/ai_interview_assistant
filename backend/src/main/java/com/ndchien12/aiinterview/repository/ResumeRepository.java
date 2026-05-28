package com.ndchien12.aiinterview.repository;

import com.ndchien12.aiinterview.entity.Resume;
import com.ndchien12.aiinterview.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ResumeRepository extends JpaRepository<Resume, UUID> {
    List<Resume> findByUserOrderByUploadedAtDesc(User user);

    Optional<Resume> findByIdAndUser(UUID id, User user);
}
