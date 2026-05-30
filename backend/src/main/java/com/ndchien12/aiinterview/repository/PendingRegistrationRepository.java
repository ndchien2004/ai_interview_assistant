package com.ndchien12.aiinterview.repository;

import com.ndchien12.aiinterview.entity.PendingRegistration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PendingRegistrationRepository extends JpaRepository<PendingRegistration, UUID> {
    Optional<PendingRegistration> findByEmail(String email);

    void deleteByEmail(String email);
}
