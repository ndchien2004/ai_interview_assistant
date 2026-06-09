package com.ndchien12.aiinterview.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ndchien12.aiinterview.entity.Course;
import com.ndchien12.aiinterview.entity.CourseSection;
import com.ndchien12.aiinterview.entity.PracticeQuestion;
import com.ndchien12.aiinterview.entity.QuestionDifficulty;
import com.ndchien12.aiinterview.repository.CourseRepository;
import com.ndchien12.aiinterview.repository.CourseSectionRepository;
import com.ndchien12.aiinterview.repository.PracticeQuestionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class JsonCourseQuestionBankSeeder implements CommandLineRunner {
    private static final String BANK_PATH = "data/java_fullstack_cv_interview_bank.json";

    private final CourseRepository courseRepository;
    private final CourseSectionRepository sectionRepository;
    private final PracticeQuestionRepository questionRepository;
    private final ObjectMapper objectMapper;

    public JsonCourseQuestionBankSeeder(
            CourseRepository courseRepository,
            CourseSectionRepository sectionRepository,
            PracticeQuestionRepository questionRepository,
            ObjectMapper objectMapper
    ) {
        this.courseRepository = courseRepository;
        this.sectionRepository = sectionRepository;
        this.questionRepository = questionRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(String... args) {
        QuestionBank bank = loadBank();
        Course course = courseRepository.findBySlug(bank.slug()).orElseGet(() -> createCourse(bank));
        course.setTitle(bank.title().trim());
        course.setDescription(bank.description().trim());
        course.setActive(true);
        courseRepository.save(course);
        List<PracticeQuestion> existing = questionRepository.findByCourseAndActiveTrueOrderBySortOrderAsc(course);
        Map<String, PracticeQuestion> existingQuestions = existing.stream()
                .collect(Collectors.toMap(PracticeQuestion::getQuestion, question -> question, (left, right) -> left));
        Set<String> seedQuestions = new HashSet<>();

        int sortOrder = Math.toIntExact(questionRepository.countByCourse(course)) + 1;
        for (SectionSeed sectionSeed : bank.sections()) {
            CourseSection section = sectionRepository.findByCourseAndSlug(course, sectionSeed.slug())
                    .orElseGet(() -> createSection(course, sectionSeed));

            for (QuestionSeed questionSeed : sectionSeed.questions()) {
                PracticeQuestion question = existingQuestions.getOrDefault(questionSeed.question(), new PracticeQuestion());
                question.setCourse(course);
                question.setSection(section);
                question.setQuestion(questionSeed.question().trim());
                question.setShortAnswer(questionSeed.options().get(correctOptionIndex(questionSeed.correctAnswer())).trim());
                question.setDetailedAnswer(detailedAnswer(sectionSeed, questionSeed));
                question.setKeyPoints(new ArrayList<>(List.of(question.getShortAnswer())));
                question.setCommonMistakes(defaultMistakes());
                question.setOptions(new ArrayList<>(questionSeed.options()));
                question.setCorrectOptionIndex(correctOptionIndex(questionSeed.correctAnswer()));
                question.setExplanation(questionSeed.explanation().trim());
                question.setDifficulty(questionSeed.difficulty());
                question.setTopic(sectionSeed.title());
                question.setTags(new ArrayList<>(questionSeed.tags()));
                question.setCodeSnippet(blankToNull(questionSeed.codeSnippet()));
                question.setActive(true);
                if (question.getId() == null) {
                    question.setSortOrder(sortOrder++);
                }
                questionRepository.save(question);
                seedQuestions.add(question.getQuestion());
            }
        }

        existing.stream()
                .filter(question -> !seedQuestions.contains(question.getQuestion()))
                .forEach(question -> {
                    question.setActive(false);
                    questionRepository.save(question);
                });
    }

    private QuestionBank loadBank() {
        try {
            ClassPathResource resource = new ClassPathResource(BANK_PATH);
            return objectMapper.readValue(resource.getInputStream(), QuestionBank.class);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load question bank " + BANK_PATH, exception);
        }
    }

    private Course createCourse(QuestionBank bank) {
        Course course = new Course();
        course.setSlug(bank.slug().trim().toLowerCase());
        course.setTitle(bank.title().trim());
        course.setDescription(bank.description().trim());
        course.setActive(true);
        return courseRepository.save(course);
    }

    private CourseSection createSection(Course course, SectionSeed seed) {
        CourseSection section = new CourseSection();
        section.setCourse(course);
        section.setSlug(seed.slug().trim().toLowerCase());
        section.setTitle(seed.title().trim());
        section.setDescription(seed.description().trim());
        section.setSortOrder(seed.sortOrder());
        return sectionRepository.save(section);
    }

    private String detailedAnswer(SectionSeed section, QuestionSeed question) {
        return question.explanation().trim();
    }

    private List<String> defaultMistakes() {
        return List.of(
                "Đọc câu hỏi quá nhanh.",
                "Chọn đáp án quen mắt mà chưa kiểm tra giải thích.",
                "Nhầm giữa khái niệm gần giống nhau."
        );
    }

    private int correctOptionIndex(String correctAnswer) {
        return switch (correctAnswer.trim().toUpperCase()) {
            case "A" -> 0;
            case "B" -> 1;
            case "C" -> 2;
            case "D" -> 3;
            default -> throw new IllegalStateException("correctAnswer must be A, B, C, or D");
        };
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private record QuestionBank(
            String slug,
            String title,
            String description,
            List<SectionSeed> sections
    ) {
    }

    private record SectionSeed(
            String slug,
            String title,
            String description,
            int sortOrder,
            List<QuestionSeed> questions
    ) {
    }

    private record QuestionSeed(
            String question,
            QuestionDifficulty difficulty,
            List<String> options,
            String correctAnswer,
            String explanation,
            List<String> tags,
            String codeSnippet
    ) {
    }
}
