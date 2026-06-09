package com.ndchien12.aiinterview.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ndchien12.aiinterview.entity.Course;
import com.ndchien12.aiinterview.entity.Role;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.repository.CourseRepository;
import com.ndchien12.aiinterview.repository.CourseSectionRepository;
import com.ndchien12.aiinterview.repository.PracticeQuestionRepository;
import com.ndchien12.aiinterview.repository.UserQuestionProgressRepository;
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
import org.springframework.transaction.annotation.Transactional;

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

    private static final String QUESTION_BANK_SLUG = "java-fullstack-cv-interview-bank";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private CourseSectionRepository sectionRepository;

    @Autowired
    private PracticeQuestionRepository practiceQuestionRepository;

    @Autowired
    private UserQuestionProgressRepository progressRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @Transactional
    void javaFullstackQuestionBankSeedCreatesQuestions() {
        Course course = courseRepository.findBySlug(QUESTION_BANK_SLUG).orElseThrow();

        assertThat(course.getTitle()).isEqualTo("Java Full-stack");
        assertThat(practiceQuestionRepository.countByCourseAndActiveTrue(course)).isEqualTo(20);
        assertThat(practiceQuestionRepository.findByCourseAndTopicAndActiveTrueOrderBySortOrderAsc(
                course,
                "Spring Boot"
        )).hasSize(2);
        assertThat(practiceQuestionRepository.findByCourseAndActiveTrueOrderBySortOrderAsc(course).getFirst().getOptions()).hasSize(4);
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
            if (QUESTION_BANK_SLUG.equals(courseJson.get("slug").asText())
                    && courseJson.get("questionCount").asInt() == 20) {
                hasJavaCoreCourse = true;
                break;
            }
        }
        assertThat(hasJavaCoreCourse).isTrue();

        mockMvc.perform(get("/api/courses/{slug}", QUESTION_BANK_SLUG)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sections.length()").value(10))
                .andExpect(jsonPath("$.questionCount").value(20))
                .andExpect(jsonPath("$.sections[0].questions[0].options.length()").value(4))
                .andExpect(jsonPath("$.sections[0].questions[0].correctOptionIndex").value(0));

        mockMvc.perform(get("/api/courses/{slug}/progress", QUESTION_BANK_SLUG)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalQuestions").value(20))
                .andExpect(jsonPath("$.attemptedQuestions").value(0))
                .andExpect(jsonPath("$.dueQuestions").value(0))
                .andExpect(jsonPath("$.learningQuestions").value(0))
                .andExpect(jsonPath("$.streakDays").value(0))
                .andExpect(jsonPath("$.topics[0].masteryPercentage").value(0));
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
                                """.formatted(QUESTION_BANK_SLUG)))
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

        mockMvc.perform(get("/api/courses/{slug}/progress", QUESTION_BANK_SLUG)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attemptedQuestions").value(1))
                .andExpect(jsonPath("$.learningQuestions").value(1))
                .andExpect(jsonPath("$.streakDays").value(1));

        mockMvc.perform(get("/api/courses/{slug}/progress/questions", QUESTION_BANK_SLUG)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].questionId").value(questionId))
                .andExpect(jsonPath("$[0].confidence").value("GOOD"))
                .andExpect(jsonPath("$[0].attemptCount").value(1));

        mockMvc.perform(get("/api/courses/{slug}/questions", QUESTION_BANK_SLUG)
                        .queryParam("status", "LEARNING")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void userCanCreateCoreStudyModes() throws Exception {
        String token = registerUserAndToken();

        mockMvc.perform(post("/api/practice-sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "courseSlug": "%s",
                                  "mode": "LEARN"
                                }
                                """.formatted(QUESTION_BANK_SLUG)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mode").value("LEARN"))
                .andExpect(jsonPath("$.nextQuestion.id").isNotEmpty());

        MvcResult testResult = mockMvc.perform(post("/api/practice-sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "courseSlug": "%s",
                                  "mode": "TEST"
                                }
                                """.formatted(QUESTION_BANK_SLUG)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mode").value("TEST"))
                .andReturn();
        JsonNode testSession = objectMapper.readTree(testResult.getResponse().getContentAsString());
        String testSessionId = testSession.get("id").asText();
        String firstQuestionId = testSession.get("nextQuestion").get("id").asText();

        MvcResult secondTestResult = mockMvc.perform(post("/api/practice-sessions/{id}/attempts", testSessionId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "questionId": "%s",
                                  "answerText": "self checked",
                                  "confidence": "GOOD"
                                }
                                """.formatted(firstQuestionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("TEST"))
                .andReturn();
        JsonNode secondTestSession = objectMapper.readTree(secondTestResult.getResponse().getContentAsString());
        assertThat(secondTestSession.get("nextQuestion").get("id").asText()).isNotEqualTo(firstQuestionId);

        MvcResult reviewDueResult = mockMvc.perform(post("/api/practice-sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "courseSlug": "%s",
                                  "mode": "REVIEW_DUE"
                                }
                                """.formatted(QUESTION_BANK_SLUG)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mode").value("REVIEW_DUE"))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andReturn();
        JsonNode reviewDueSession = objectMapper.readTree(reviewDueResult.getResponse().getContentAsString());
        assertThat(reviewDueSession.get("nextQuestion").isNull()).isTrue();
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
                                """.formatted(QUESTION_BANK_SLUG)))
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

        mockMvc.perform(get("/api/courses/{slug}/progress", QUESTION_BANK_SLUG)
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
    void userCanCreateLearningCourseDeckAndImportIntoDeck() throws Exception {
        String token = registerUserAndToken();
        String courseSlug = "hoc-on-thi-toan-%s".formatted(UUID.randomUUID());

        mockMvc.perform(post("/api/courses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Học ôn thi toán",
                                  "slug": "%s",
                                  "description": "Học phần ôn tập toán.",
                                  "active": true
                                }
                                """.formatted(courseSlug)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value(courseSlug));

        mockMvc.perform(post("/api/courses/{slug}/decks", courseSlug)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Đại số",
                                  "slug": "dai-so",
                                  "description": "Bộ thẻ đại số.",
                                  "sortOrder": 1
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("dai-so"));

        mockMvc.perform(post("/api/courses/{slug}/decks/{deckSlug}/imports/json", courseSlug, "dai-so")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sections": [
                                    {
                                      "title": "Mẫu",
                                      "questions": [
                                        {
                                          "question": "2 + 2 bằng mấy?",
                                          "options": ["4", "3", "5", "22"],
                                          "correctAnswer": "A",
                                          "explanation": "2 + 2 = 4.",
                                          "difficulty": "BEGINNER",
                                          "tags": ["math"]
                                        }
                                      ]
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.importedCount").value(1));

        Course course = courseRepository.findBySlug(courseSlug).orElseThrow();
        assertThat(practiceQuestionRepository.countBySectionAndActiveTrue(
                sectionRepository.findByCourseAndSlug(course, "dai-so").orElseThrow()
        )).isEqualTo(1);

        mockMvc.perform(get("/api/courses/{slug}/questions", courseSlug)
                        .queryParam("deckSlug", "dai-so")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].topic").value("Đại số"));
    }

    @Test
    void userCanUpdateAndDeleteLearningCourseAndDeck() throws Exception {
        String token = registerUserAndToken();
        String courseSlug = "crud-course-%s".formatted(UUID.randomUUID());
        String updatedCourseSlug = courseSlug + "-updated";

        mockMvc.perform(post("/api/courses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "CRUD Course",
                                  "slug": "%s",
                                  "description": "Course before edit.",
                                  "active": true
                                }
                                """.formatted(courseSlug)))
                .andExpect(status().isCreated());

        mockMvc.perform(put("/api/courses/{slug}", courseSlug)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "CRUD Course Edited",
                                  "slug": "%s",
                                  "description": "Course after edit.",
                                  "active": true
                                }
                                """.formatted(updatedCourseSlug)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value(updatedCourseSlug))
                .andExpect(jsonPath("$.title").value("CRUD Course Edited"));

        mockMvc.perform(post("/api/courses/{slug}/decks", updatedCourseSlug)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Deck A",
                                  "slug": "deck-a",
                                  "description": "Deck before edit.",
                                  "sortOrder": 1
                                }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(put("/api/courses/{slug}/decks/{deckSlug}", updatedCourseSlug, "deck-a")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Deck B",
                                  "slug": "deck-b",
                                  "description": "Deck after edit.",
                                  "sortOrder": 2
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("deck-b"))
                .andExpect(jsonPath("$.title").value("Deck B"));

        mockMvc.perform(delete("/api/courses/{slug}/decks/{deckSlug}", updatedCourseSlug, "deck-b")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/courses/{slug}", updatedCourseSlug)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sections.length()").value(0));

        Course course = courseRepository.findBySlug(updatedCourseSlug).orElseThrow();
        assertThat(sectionRepository.findByCourseAndSlug(course, "deck-b").orElseThrow().isActive()).isFalse();

        mockMvc.perform(delete("/api/courses/{slug}", updatedCourseSlug)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        assertThat(courseRepository.findBySlug(updatedCourseSlug).orElseThrow().isActive()).isFalse();
    }

    @Test
    void userCanUpdateQuestionInsideDeck() throws Exception {
        String token = registerUserAndToken();
        String courseSlug = "edit-question-course-%s".formatted(UUID.randomUUID());

        mockMvc.perform(post("/api/courses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Edit Question Course",
                                  "slug": "%s",
                                  "description": "Course for editing deck questions.",
                                  "active": true
                                }
                                """.formatted(courseSlug)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/courses/{slug}/decks", courseSlug)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Deck A",
                                  "slug": "deck-a",
                                  "description": "Deck for editing.",
                                  "sortOrder": 1
                                }
                                """))
                .andExpect(status().isCreated());

        MvcResult importResult = mockMvc.perform(post("/api/courses/{slug}/decks/{deckSlug}/imports/json", courseSlug, "deck-a")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sections": [
                                    {
                                      "title": "Sample",
                                      "questions": [
                                        {
                                          "question": "Old question?",
                                          "options": ["A1", "B1", "C1", "D1"],
                                          "correctAnswer": "A",
                                          "explanation": "Old explanation.",
                                          "difficulty": "BEGINNER",
                                          "tags": ["edit"]
                                        }
                                      ]
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();

        String questionId = objectMapper.readTree(importResult.getResponse().getContentAsString())
                .get("createdQuestions")
                .get(0)
                .get("id")
                .asText();

        mockMvc.perform(put("/api/courses/{slug}/decks/{deckSlug}/questions/{questionId}", courseSlug, "deck-a", questionId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "question": "Updated question?",
                                  "options": ["A2", "B2", "C2", "D2"],
                                  "correctOptionIndex": 2,
                                  "explanation": "Updated explanation."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.question").value("Updated question?"))
                .andExpect(jsonPath("$.shortAnswer").value("C2"))
                .andExpect(jsonPath("$.correctOptionIndex").value(2))
                .andExpect(jsonPath("$.explanation").value("Updated explanation."));
    }

    @Test
    void matchModeRecordsLightProgressWithoutMastering() throws Exception {
        String token = registerUserAndToken();

        MvcResult sessionResult = mockMvc.perform(post("/api/study-sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "courseSlug": "%s",
                                  "deckSlug": "java-core",
                                  "mode": "MATCH"
                                }
                                """.formatted(QUESTION_BANK_SLUG)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mode").value("MATCH"))
                .andExpect(jsonPath("$.deckSlug").value("java-core"))
                .andReturn();

        JsonNode sessionJson = objectMapper.readTree(sessionResult.getResponse().getContentAsString());
        String sessionId = sessionJson.get("id").asText();
        String questionId = sessionJson.get("nextQuestion").get("id").asText();

        mockMvc.perform(post("/api/study-sessions/{id}/matches", sessionId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "questionIds": ["%s"],
                                  "mistakeCount": 0,
                                  "timeSpentSeconds": 12
                                }
                                """.formatted(questionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        mockMvc.perform(get("/api/courses/{slug}/progress/questions", QUESTION_BANK_SLUG)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].questionId").value(questionId))
                .andExpect(jsonPath("$[0].confidence").value("GOOD"))
                .andExpect(jsonPath("$[0].mastered").value(false));
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
        Course course = courseRepository.findBySlug(QUESTION_BANK_SLUG).orElseThrow();
        int totalQuestions = Math.toIntExact(practiceQuestionRepository.countByCourseAndActiveTrue(course));

        MvcResult sessionResult = mockMvc.perform(post("/api/practice-sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "courseSlug": "%s",
                                  "mode": "FLASHCARD"
                                }
                                """.formatted(QUESTION_BANK_SLUG)))
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

        mockMvc.perform(get("/api/courses/{slug}/progress", QUESTION_BANK_SLUG)
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
                                """.formatted(QUESTION_BANK_SLUG)))
                .andExpect(status().isUnauthorized());

        String userToken = registerUserAndToken();
        Course course = courseRepository.findBySlug(QUESTION_BANK_SLUG).orElseThrow();

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

        MvcResult courseResult = mockMvc.perform(get("/api/courses/{slug}", QUESTION_BANK_SLUG)
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
                  "topic": "Java Core Foundations",
                  "tags": ["java", "records"],
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
        String password = "Password123!";

        User user = new User();
        user.setName("Course User");
        user.setEmail(email);
        user.setHeadline("Course user");
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(Role.USER);
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

    private String createAdminAndToken() throws Exception {
        String email = "admin-%s@example.com".formatted(UUID.randomUUID());
        String password = "Password123!";

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
