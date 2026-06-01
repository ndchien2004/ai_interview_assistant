package com.ndchien12.aiinterview.controller;

import com.ndchien12.aiinterview.dto.interview.CreateInterviewRequest;
import com.ndchien12.aiinterview.dto.interview.InterviewEvaluationResponse;
import com.ndchien12.aiinterview.dto.interview.InterviewSessionResponse;
import com.ndchien12.aiinterview.dto.interview.InterviewTranscriptMessageResponse;
import com.ndchien12.aiinterview.dto.interview.RealtimeSessionResponse;
import com.ndchien12.aiinterview.dto.interview.SaveInterviewAnswersRequest;
import com.ndchien12.aiinterview.dto.interview.SaveInterviewTranscriptRequest;
import com.ndchien12.aiinterview.service.InterviewService;
import com.ndchien12.aiinterview.service.RealtimeSessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/interviews")
public class InterviewController {
    private final InterviewService interviewService;
    private final RealtimeSessionService realtimeSessionService;

    public InterviewController(
            InterviewService interviewService,
            RealtimeSessionService realtimeSessionService
    ) {
        this.interviewService = interviewService;
        this.realtimeSessionService = realtimeSessionService;
    }

    @GetMapping
    public List<InterviewSessionResponse> list(Authentication authentication) {
        return interviewService.listSessions(authentication.getName());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InterviewSessionResponse create(
            @Valid @RequestBody CreateInterviewRequest request,
            Authentication authentication
    ) {
        return interviewService.createSession(request, authentication.getName());
    }

    @GetMapping("/{id}")
    public InterviewSessionResponse get(@PathVariable UUID id, Authentication authentication) {
        return interviewService.getSession(id, authentication.getName());
    }

    @PutMapping("/{id}/answers")
    public InterviewSessionResponse saveAnswers(
            @PathVariable UUID id,
            @Valid @RequestBody SaveInterviewAnswersRequest request,
            Authentication authentication
    ) {
        return interviewService.saveAnswers(id, request, authentication.getName());
    }

    @PostMapping("/{id}/evaluate")
    public InterviewEvaluationResponse evaluate(
            @PathVariable UUID id,
            @Valid @RequestBody SaveInterviewAnswersRequest request,
            Authentication authentication
    ) {
        return interviewService.evaluate(id, request, authentication.getName());
    }

    @PostMapping("/{id}/realtime/session")
    public RealtimeSessionResponse createRealtimeSession(@PathVariable UUID id, Authentication authentication) {
        return realtimeSessionService.createRealtimeSession(id, authentication.getName());
    }

    @PutMapping("/{id}/transcript")
    public List<InterviewTranscriptMessageResponse> saveTranscript(
            @PathVariable UUID id,
            @Valid @RequestBody SaveInterviewTranscriptRequest request,
            Authentication authentication
    ) {
        return realtimeSessionService.saveTranscript(id, request, authentication.getName());
    }

    @GetMapping("/evaluations/{id}")
    public InterviewEvaluationResponse getEvaluation(@PathVariable UUID id, Authentication authentication) {
        return interviewService.getEvaluation(id, authentication.getName());
    }

    @GetMapping("/{id}/evaluation")
    public InterviewEvaluationResponse getEvaluationBySession(@PathVariable UUID id, Authentication authentication) {
        return interviewService.getEvaluationBySession(id, authentication.getName());
    }
}
