package com.ndchien12.aiinterview.controller;

import com.ndchien12.aiinterview.dto.practice.CreatePracticeSessionRequest;
import com.ndchien12.aiinterview.dto.practice.PracticeSessionResponse;
import com.ndchien12.aiinterview.dto.practice.SubmitAttemptRequest;
import com.ndchien12.aiinterview.dto.practice.SubmitMatchRequest;
import com.ndchien12.aiinterview.dto.practice.SubmitTestRequest;
import com.ndchien12.aiinterview.service.PracticeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/practice-sessions")
public class PracticeController {
    private final PracticeService practiceService;

    public PracticeController(PracticeService practiceService) {
        this.practiceService = practiceService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PracticeSessionResponse createSession(
            @Valid @RequestBody CreatePracticeSessionRequest request,
            Authentication authentication
    ) {
        return practiceService.createSession(request, authentication.getName());
    }

    @GetMapping("/{id}")
    public PracticeSessionResponse getSession(@PathVariable UUID id, Authentication authentication) {
        return practiceService.getSession(id, authentication.getName());
    }

    @PostMapping("/{id}/attempts")
    public PracticeSessionResponse submitAttempt(
            @PathVariable UUID id,
            @Valid @RequestBody SubmitAttemptRequest request,
            Authentication authentication
    ) {
        return practiceService.submitAttempt(id, request, authentication.getName());
    }

    @PostMapping("/{id}/matches")
    public PracticeSessionResponse submitMatch(
            @PathVariable UUID id,
            @Valid @RequestBody SubmitMatchRequest request,
            Authentication authentication
    ) {
        return practiceService.submitMatch(id, request, authentication.getName());
    }

    @PostMapping("/{id}/submit")
    public PracticeSessionResponse submitTest(
            @PathVariable UUID id,
            @Valid @RequestBody SubmitTestRequest request,
            Authentication authentication
    ) {
        return practiceService.submitTest(id, request, authentication.getName());
    }
}
