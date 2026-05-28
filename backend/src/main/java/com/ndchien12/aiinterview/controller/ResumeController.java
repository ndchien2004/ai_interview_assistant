package com.ndchien12.aiinterview.controller;

import com.ndchien12.aiinterview.dto.resume.ResumeResponse;
import com.ndchien12.aiinterview.dto.resume.ResumeUpdateRequest;
import com.ndchien12.aiinterview.service.ResumeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {
    private final ResumeService resumeService;

    public ResumeController(ResumeService resumeService) {
        this.resumeService = resumeService;
    }

    @GetMapping
    public List<ResumeResponse> listResumes(Authentication authentication) {
        return resumeService.listResumes(authentication.getName());
    }

    @GetMapping("/{id}")
    public ResumeResponse getResume(@PathVariable UUID id, Authentication authentication) {
        return resumeService.getResume(id, authentication.getName());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResumeResponse uploadResume(
            @RequestPart("file") MultipartFile file,
            Authentication authentication
    ) {
        return resumeService.uploadResume(file, authentication.getName());
    }

    @PutMapping("/{id}")
    public ResumeResponse updateResume(
            @PathVariable UUID id,
            @Valid @RequestBody ResumeUpdateRequest request,
            Authentication authentication
    ) {
        return resumeService.updateResume(id, request, authentication.getName());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteResume(@PathVariable UUID id, Authentication authentication) {
        resumeService.deleteResume(id, authentication.getName());
    }
}
