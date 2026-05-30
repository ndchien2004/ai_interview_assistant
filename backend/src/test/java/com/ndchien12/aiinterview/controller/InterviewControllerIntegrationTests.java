package com.ndchien12.aiinterview.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ndchien12.aiinterview.entity.Resume;
import com.ndchien12.aiinterview.entity.ResumeStatus;
import com.ndchien12.aiinterview.entity.Role;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.repository.ResumeRepository;
import com.ndchien12.aiinterview.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InterviewControllerIntegrationTests {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResumeRepository resumeRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void createSaveAndEvaluateInterviewFromResume() throws Exception {
        TestUser testUser = createUserAndToken();
        Resume resume = createResume(testUser.user(), ResumeStatus.READY);

        MvcResult createResult = mockMvc.perform(post("/api/interviews")
                        .header("Authorization", "Bearer " + testUser.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "resumeId": "%s",
                                  "targetRole": "Full-stack Developer",
                                  "seniority": "Junior",
                                  "questionCount": 5,
                                  "focusAreas": ["Spring Boot", "React"]
                                }
                                """.formatted(resume.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.targetRole").value("Full-stack Developer"))
                .andExpect(jsonPath("$.questions.length()").value(5))
                .andExpect(jsonPath("$.generationMode").value("HYBRID"))
                .andExpect(jsonPath("$.questions[0].expectedSignals").isArray())
                .andReturn();

        JsonNode created = objectMapper.readTree(createResult.getResponse().getContentAsString());
        String sessionId = created.get("id").asText();
        String firstQuestionId = created.get("questions").get(0).get("id").asText();
        assertThat(created.get("questions").toString()).contains("Spring Boot");

        mockMvc.perform(put("/api/interviews/{id}/answers", sessionId)
                        .header("Authorization", "Bearer " + testUser.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "answers": [
                                    {
                                      "questionId": "%s",
                                      "response": "I would explain the architecture, tradeoffs, and measured outcome."
                                    }
                                  ]
                                }
                                """.formatted(firstQuestionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answers[0].response").isNotEmpty());

        MvcResult evaluationResult = mockMvc.perform(post("/api/interviews/{id}/evaluate", sessionId)
                        .header("Authorization", "Bearer " + testUser.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "answers": [
                                    {
                                      "questionId": "%s",
                                      "response": "I would explain the architecture, tradeoffs, and measured outcome."
                                    }
                                  ]
                                }
                                """.formatted(firstQuestionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalScore").isNumber())
                .andExpect(jsonPath("$.evaluationMode").value("FALLBACK"))
                .andExpect(jsonPath("$.provider").value("LOCAL"))
                .andExpect(jsonPath("$.model").value("local"))
                .andExpect(jsonPath("$.perQuestionFeedback.length()").value(5))
                .andExpect(jsonPath("$.perQuestionFeedback[0].questionId").value(firstQuestionId))
                .andReturn();

        String evaluationId = objectMapper.readTree(evaluationResult.getResponse().getContentAsString()).get("id").asText();
        mockMvc.perform(get("/api/interviews/evaluations/{id}", evaluationId)
                        .header("Authorization", "Bearer " + testUser.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value(sessionId))
                .andExpect(jsonPath("$.evaluationMode").value("FALLBACK"))
                .andExpect(jsonPath("$.perQuestionFeedback.length()").value(5));
    }

    @Test
    void evaluateRequiresAuthentication() throws Exception {
        TestUser testUser = createUserAndToken();
        Resume resume = createResume(testUser.user(), ResumeStatus.READY);

        MvcResult createResult = mockMvc.perform(post("/api/interviews")
                        .header("Authorization", "Bearer " + testUser.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "resumeId": "%s",
                                  "targetRole": "Backend Developer",
                                  "seniority": "Junior",
                                  "questionCount": 3,
                                  "focusAreas": ["Spring Boot"]
                                }
                                """.formatted(resume.getId())))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText();
        mockMvc.perform(post("/api/interviews/{id}/evaluate", sessionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "answers": []
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createRejectsFailedResume() throws Exception {
        TestUser testUser = createUserAndToken();
        Resume resume = createResume(testUser.user(), ResumeStatus.FAILED);

        mockMvc.perform(post("/api/interviews")
                        .header("Authorization", "Bearer " + testUser.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "resumeId": "%s",
                                  "targetRole": "Backend Developer",
                                  "seniority": "Junior",
                                  "questionCount": 5,
                                  "focusAreas": []
                                }
                                """.formatted(resume.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Resume must be fixed before creating an interview"));
    }

    private Resume createResume(User user, ResumeStatus status) {
        Resume resume = new Resume();
        resume.setUser(user);
        resume.setFileName("resume.pdf");
        resume.setFileSize(1024);
        resume.setContentType("application/pdf");
        resume.setParsedText("""
                Full-stack developer with React, Next.js, Spring Boot, PostgreSQL, Docker, JWT authentication,
                REST APIs, production deployment, testing, and AI interview assistant project experience.
                """);
        resume.setSummary("Full-stack developer with React, Spring Boot, PostgreSQL, and AI workflow experience.");
        resume.setSkills(new ArrayList<>(java.util.List.of("React", "Spring Boot", "PostgreSQL")));
        resume.setRoleSignals(new ArrayList<>(java.util.List.of("Full-stack")));
        resume.setSenioritySignals(new ArrayList<>(java.util.List.of("Junior")));
        resume.setProjectHighlights(new ArrayList<>(java.util.List.of("AI Interview Assistant")));
        resume.setWarnings(new ArrayList<>());
        resume.setStatus(status);
        return resumeRepository.save(resume);
    }

    private TestUser createUserAndToken() throws Exception {
        String email = "interview-%s@example.com".formatted(UUID.randomUUID());
        String password = "Password123!";

        User user = new User();
        user.setName("Interview User");
        user.setEmail(email);
        user.setHeadline("Interview candidate");
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(Role.USER);
        User savedUser = userRepository.save(user);

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s",
                                  "password": "%s"
                                }
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn();

        return new TestUser(savedUser, objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText());
    }

    private record TestUser(User user, String token) {
    }
}
