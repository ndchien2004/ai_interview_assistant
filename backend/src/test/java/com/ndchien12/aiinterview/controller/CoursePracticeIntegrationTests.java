package com.ndchien12.aiinterview.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ndchien12.aiinterview.entity.Course;
import com.ndchien12.aiinterview.entity.Role;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.repository.CourseRepository;
import com.ndchien12.aiinterview.repository.PracticeQuestionRepository;
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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CoursePracticeIntegrationTests {

    private static final String JAVA_CORE_SLUG = "java-core-interview-mastery";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private PracticeQuestionRepository practiceQuestionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void javaCoreCourseSeedCreatesBaseAndImportedQuestions() {
        Course course = courseRepository.findBySlug(JAVA_CORE_SLUG).orElseThrow();

        assertThat(course.getTitle()).isEqualTo("Java Core Interview Mastery");
        assertThat(practiceQuestionRepository.countByCourseAndActiveTrue(course)).isEqualTo(202);
        assertThat(practiceQuestionRepository.findByCourseAndTopicAndActiveTrueOrderBySortOrderAsc(
                course,
                "Imported Java Core VI"
        )).hasSize(102);
    }

    @Test
    void authenticatedUserCanReadCourseAndProgress() throws Exception {
        String token = registerUserAndToken();

        MvcResult coursesResult = mockMvc.perform(get("/api/courses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode coursesJson = objectMapper.readTree(coursesResult.getResponse().getContentAsString());
        boolean hasJavaCoreCourse = false;
        for (JsonNode courseJson : coursesJson) {
            if (JAVA_CORE_SLUG.equals(courseJson.get("slug").asText())
                    && courseJson.get("questionCount").asInt() == 202) {
                hasJavaCoreCourse = true;
                break;
            }
        }
        assertThat(hasJavaCoreCourse).isTrue();

        mockMvc.perform(get("/api/courses/{slug}", JAVA_CORE_SLUG)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sections.length()").value(12))
                .andExpect(jsonPath("$.questionCount").value(202));

        mockMvc.perform(get("/api/courses/{slug}/progress", JAVA_CORE_SLUG)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalQuestions").value(202))
                .andExpect(jsonPath("$.attemptedQuestions").value(0));
    }

    @Test
    void userCanCreatePracticeSessionAndSubmitAttempt() throws Exception {
        String token = registerUserAndToken();

        MvcResult sessionResult = mockMvc.perform(post("/api/practice-sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "courseSlug": "%s"
                                }
                                """.formatted(JAVA_CORE_SLUG)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.nextQuestion.id").isNotEmpty())
                .andReturn();

        JsonNode sessionJson = objectMapper.readTree(sessionResult.getResponse().getContentAsString());
        String sessionId = sessionJson.get("id").asText();
        String questionId = sessionJson.get("nextQuestion").get("id").asText();

        mockMvc.perform(post("/api/practice-sessions/{id}/attempts", sessionId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "questionId": "%s",
                                  "answerText": "Java compiles to bytecode that runs on the JVM.",
                                  "confidence": "GOOD"
                                }
                                """.formatted(questionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attempts.length()").value(1));

        mockMvc.perform(get("/api/courses/{slug}/progress", JAVA_CORE_SLUG)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attemptedQuestions").value(1));
    }

    @Test
    void userCanStudyFlashcardsWithAgainAndMasteredResults() throws Exception {
        String token = registerUserAndToken();

        MvcResult sessionResult = mockMvc.perform(post("/api/practice-sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "courseSlug": "%s",
                                  "mode": "FLASHCARD"
                                }
                                """.formatted(JAVA_CORE_SLUG)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mode").value("FLASHCARD"))
                .andExpect(jsonPath("$.nextQuestion.id").isNotEmpty())
                .andReturn();

        JsonNode sessionJson = objectMapper.readTree(sessionResult.getResponse().getContentAsString());
        String sessionId = sessionJson.get("id").asText();
        String questionId = sessionJson.get("nextQuestion").get("id").asText();

        mockMvc.perform(post("/api/practice-sessions/{id}/attempts", sessionId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "questionId": "%s",
                                  "confidence": "AGAIN"
                                }
                                """.formatted(questionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("FLASHCARD"));

        mockMvc.perform(get("/api/courses/{slug}/progress", JAVA_CORE_SLUG)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attemptedQuestions").value(1))
                .andExpect(jsonPath("$.masteredQuestions").value(0));
    }

    @Test
    void userCanImportFlashcardsIntoCourse() throws Exception {
        String token = registerUserAndToken();
        Course course = createImportCourse();

        mockMvc.perform(post("/api/courses/{slug}/imports", course.getSlug())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "topic": "Imported Java",
                                  "difficulty": "BEGINNER",
                                  "delimiterMode": "AUTO",
                                  "content": "What is JVM?\\tJava Virtual Machine\\nBroken row\\nWhat is JDK? | Java Development Kit"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.importedCount").value(2))
                .andExpect(jsonPath("$.invalidRows.length()").value(1))
                .andExpect(jsonPath("$.createdQuestions[0].question").value("What is JVM?"));

        mockMvc.perform(get("/api/courses/{slug}", course.getSlug())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questionCount").value(2))
                .andExpect(jsonPath("$.sections[0].title").value("Imported Java"));
    }

    @Test
    void importRejectsInvalidOnlyContent() throws Exception {
        String token = registerUserAndToken();
        Course course = createImportCourse();

        mockMvc.perform(post("/api/courses/{slug}/imports", course.getSlug())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "topic": "Imported Java",
                                  "difficulty": "BEGINNER",
                                  "delimiterMode": "AUTO",
                                  "content": "No delimiter here\\nStill broken"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Import content does not contain any valid flashcards"));
    }

    @Test
    void importedFlashcardsCanStartFlashcardSession() throws Exception {
        String token = registerUserAndToken();
        Course course = createImportCourse();

        mockMvc.perform(post("/api/courses/{slug}/imports", course.getSlug())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "topic": "Imported Java",
                                  "difficulty": "BEGINNER",
                                  "delimiterMode": "PIPE",
                                  "content": "What is JRE? | Java Runtime Environment"
                                }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/practice-sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "courseSlug": "%s",
                                  "mode": "FLASHCARD"
                                }
                                """.formatted(course.getSlug())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nextQuestion.question").value("What is JRE?"));
    }

    @Test
    void flashcardSessionCompletesWhenEveryQuestionIsMastered() throws Exception {
        String token = registerUserAndToken();
        Course course = courseRepository.findBySlug(JAVA_CORE_SLUG).orElseThrow();
        int totalQuestions = Math.toIntExact(practiceQuestionRepository.countByCourseAndActiveTrue(course));

        MvcResult sessionResult = mockMvc.perform(post("/api/practice-sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "courseSlug": "%s",
                                  "mode": "FLASHCARD"
                                }
                                """.formatted(JAVA_CORE_SLUG)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode sessionJson = objectMapper.readTree(sessionResult.getResponse().getContentAsString());
        String sessionId = sessionJson.get("id").asText();

        for (int i = 0; i < totalQuestions; i++) {
            JsonNode nextQuestion = sessionJson.get("nextQuestion");
            assertThat(nextQuestion == null || nextQuestion.isNull()).isFalse();

            sessionResult = mockMvc.perform(post("/api/practice-sessions/{id}/attempts", sessionId)
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "questionId": "%s",
                                      "confidence": "MASTERED"
                                    }
                                    """.formatted(nextQuestion.get("id").asText())))
                    .andExpect(status().isOk())
                    .andReturn();
            sessionJson = objectMapper.readTree(sessionResult.getResponse().getContentAsString());
        }

        assertThat(sessionJson.get("nextQuestion").isNull()).isTrue();
        assertThat(sessionJson.get("status").asText()).isEqualTo("COMPLETED");

        mockMvc.perform(get("/api/courses/{slug}/progress", JAVA_CORE_SLUG)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.masteredQuestions").value(totalQuestions))
                .andExpect(jsonPath("$.masteryPercentage").value(100));
    }

    @Test
    void practiceRequiresAuthenticationAndAdminRequiresAdminRole() throws Exception {
        mockMvc.perform(post("/api/practice-sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "courseSlug": "%s"
                                }
                                """.formatted(JAVA_CORE_SLUG)))
                .andExpect(status().isUnauthorized());

        String userToken = registerUserAndToken();
        Course course = courseRepository.findBySlug(JAVA_CORE_SLUG).orElseThrow();

        mockMvc.perform(post("/api/admin/courses")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Denied Course",
                                  "slug": "denied-course-%s",
                                  "description": "Should be forbidden",
                                  "active": true
                                }
                                """.formatted(course.getId())))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanCreateUpdateAndDeleteQuestion() throws Exception {
        String adminToken = createAdminAndToken();

        MvcResult courseResult = mockMvc.perform(get("/api/courses/{slug}", JAVA_CORE_SLUG)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode courseJson = objectMapper.readTree(courseResult.getResponse().getContentAsString());
        String courseId = courseJson.get("id").asText();
        String sectionId = courseJson.get("sections").get(0).get("id").asText();

        MvcResult createResult = mockMvc.perform(post("/api/admin/questions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(questionPayload(courseId, sectionId, "Explain Java records.", "INTERMEDIATE")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.question").value("Explain Java records."))
                .andReturn();

        String questionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(put("/api/admin/questions/{id}", questionId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(questionPayload(courseId, sectionId, "Explain Java records and immutability.", "ADVANCED")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.difficulty").value("ADVANCED"));

        mockMvc.perform(delete("/api/admin/questions/{id}", questionId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    private String questionPayload(String courseId, String sectionId, String question, String difficulty) {
        return """
                {
                  "courseId": "%s",
                  "sectionId": "%s",
                  "question": "%s",
                  "shortAnswer": "Records are concise carriers for immutable data.",
                  "detailedAnswer": "A record creates a final class with final components, accessors, equals, hashCode, and toString.",
                  "keyPoints": ["immutable data", "generated methods"],
                  "commonMistakes": ["Treating records as mutable entities"],
                  "difficulty": "%s",
                  "topic": "Java Basics and Syntax",
                  "tags": ["java-core", "records"],
                  "codeSnippet": "record UserDto(String name) {}",
                  "active": true,
                  "sortOrder": 101
                }
                """.formatted(courseId, sectionId, question, difficulty);
    }

    private Course createImportCourse() {
        Course course = new Course();
        course.setTitle("Import Course");
        course.setSlug("import-course-%s".formatted(UUID.randomUUID()));
        course.setDescription("Course used for import integration tests.");
        course.setActive(true);
        return courseRepository.save(course);
    }

    private String registerUserAndToken() throws Exception {
        String email = "user-%s@example.com".formatted(UUID.randomUUID());

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Course User",
                                  "email": "%s",
                                  "password": "password123"
                                }
                                """.formatted(email)))
                .andExpect(status().isCreated())
                .andReturn();

        return tokenFrom(result);
    }

    private String createAdminAndToken() throws Exception {
        String email = "admin-%s@example.com".formatted(UUID.randomUUID());
        String password = "password123";

        User user = new User();
        user.setName("Admin User");
        user.setEmail(email);
        user.setHeadline("Course admin");
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(Role.ADMIN);
        userRepository.save(user);

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

        return tokenFrom(result);
    }

    private String tokenFrom(MvcResult result) throws Exception {
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("token").asText();
    }
}
