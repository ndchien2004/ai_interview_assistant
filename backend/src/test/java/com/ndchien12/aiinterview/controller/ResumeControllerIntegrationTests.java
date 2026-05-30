package com.ndchien12.aiinterview.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ndchien12.aiinterview.entity.Role;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.repository.UserRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.ByteArrayOutputStream;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ResumeControllerIntegrationTests {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void authenticatedUserCanUploadReadUpdateAndDeleteResume() throws Exception {
        String token = registerUserAndToken();

        MvcResult uploadResult = mockMvc.perform(multipart("/api/resumes")
                        .file(pdfFile("resume.pdf", """
                                Full-stack Java developer with React, Next.js, Spring Boot, PostgreSQL, Docker,
                                REST APIs, JWT authentication, JUnit, and deployment experience. Built interview
                                tooling, dashboards, and production-style backend services.
                                """))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileName").value("resume.pdf"))
                .andExpect(jsonPath("$.status").value("NEEDS_REVIEW"))
                .andExpect(jsonPath("$.parsedText").isNotEmpty())
                .andExpect(jsonPath("$.skills[0]").isNotEmpty())
                .andReturn();

        String resumeId = objectMapper.readTree(uploadResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(get("/api/resumes")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(resumeId));

        mockMvc.perform(put("/api/resumes/{id}", resumeId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fileName": "edited-resume.pdf",
                                  "parsedText": "Edited resume text with Java, Spring Boot, React, and PostgreSQL experience.",
                                  "summary": "Edited summary",
                                  "skills": ["Java", "Spring Boot"],
                                  "roleSignals": ["Backend"],
                                  "senioritySignals": ["Junior"],
                                  "projectHighlights": ["Interview Assistant"],
                                  "warnings": []
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value("edited-resume.pdf"))
                .andExpect(jsonPath("$.skills[0]").value("Java"));

        mockMvc.perform(delete("/api/resumes/{id}", resumeId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/resumes/{id}", resumeId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void uploadRejectsNonPdfAndOversizedFile() throws Exception {
        String token = registerUserAndToken();

        mockMvc.perform(multipart("/api/resumes")
                        .file(new MockMultipartFile("file", "resume.txt", "text/plain", "hello".getBytes()))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Please upload a PDF resume"));

        mockMvc.perform(multipart("/api/resumes")
                        .file(new MockMultipartFile(
                                "file",
                                "large.pdf",
                                "application/pdf",
                                new byte[(5 * 1024 * 1024) + 1]
                        ))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Resume file must be smaller than 5MB"));
    }

    @Test
    void userCannotReadAnotherUsersResume() throws Exception {
        String ownerToken = registerUserAndToken();
        String otherToken = registerUserAndToken();

        MvcResult uploadResult = mockMvc.perform(multipart("/api/resumes")
                        .file(pdfFile("owner.pdf", """
                                Backend Java engineer with Spring Boot, PostgreSQL, Docker, REST APIs, JWT,
                                testing, deployment, and interview assistant project experience.
                                """))
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isCreated())
                .andReturn();

        String resumeId = objectMapper.readTree(uploadResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(get("/api/resumes/{id}", resumeId)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void uploadRequiresAuthentication() throws Exception {
        mockMvc.perform(multipart("/api/resumes")
                        .file(pdfFile("resume.pdf", "Java developer with Spring Boot and React experience.")))
                .andExpect(status().isUnauthorized());
    }

    private MockMultipartFile pdfFile(String filename, String text) throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                content.setLeading(16);
                content.newLineAtOffset(50, 740);
                for (String line : text.strip().split("\\R")) {
                    content.showText(line.trim());
                    content.newLine();
                }
                content.endText();
            }
            document.save(output);
            return new MockMultipartFile("file", filename, "application/pdf", output.toByteArray());
        }
    }

    private String registerUserAndToken() throws Exception {
        String email = uniqueEmail();
        String password = "Password123!";

        User user = new User();
        user.setName("Resume User");
        user.setEmail(email);
        user.setHeadline("Resume user");
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(Role.USER);
        userRepository.save(user);

        MvcResult result = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s",
                                  "password": "%s"
                                }
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("token").asText();
    }

    private String uniqueEmail() {
        return "resume-%s@example.com".formatted(UUID.randomUUID());
    }
}
