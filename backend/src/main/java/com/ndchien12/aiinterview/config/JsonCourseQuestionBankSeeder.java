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
import java.util.HashSet;
import java.util.List;
import java.util.Set;

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
        Set<String> existingQuestions = new HashSet<>();
        questionRepository.findByCourseAndActiveTrueOrderBySortOrderAsc(course)
                .forEach(question -> existingQuestions.add(question.getQuestion()));

        int sortOrder = Math.toIntExact(questionRepository.countByCourse(course)) + 1;
        for (SectionSeed sectionSeed : bank.sections()) {
            CourseSection section = sectionRepository.findByCourseAndSlug(course, sectionSeed.slug())
                    .orElseGet(() -> createSection(course, sectionSeed));

            for (QuestionSeed questionSeed : sectionSeed.questions()) {
                if (existingQuestions.contains(questionSeed.question())) {
                    continue;
                }

                PracticeQuestion question = new PracticeQuestion();
                question.setCourse(course);
                question.setSection(section);
                question.setQuestion(questionSeed.question().trim());
                question.setShortAnswer(questionSeed.answerGuide().trim());
                question.setDetailedAnswer(detailedAnswer(sectionSeed, questionSeed));
                question.setKeyPoints(new ArrayList<>(questionSeed.keyPoints()));
                question.setCommonMistakes(defaultMistakes(sectionSeed.title()));
                question.setDifficulty(questionSeed.difficulty());
                question.setTopic(sectionSeed.title());
                question.setTags(new ArrayList<>(questionSeed.tags()));
                question.setCodeSnippet(blankToNull(questionSeed.codeSnippet()));
                question.setActive(true);
                question.setSortOrder(sortOrder++);
                questionRepository.save(question);
                existingQuestions.add(question.getQuestion());
            }
        }
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
        return "%s In a strong interview answer, define the concept, connect it to the candidate's CV or project work, explain tradeoffs, and close with a concrete production example. Key signals: %s."
                .formatted(question.answerGuide().trim(), String.join(", ", question.keyPoints()));
    }

    private List<String> defaultMistakes(String topic) {
        return List.of(
                "Only giving a memorized definition without a project example.",
                "Skipping tradeoffs, failure modes, or production constraints for " + topic + ".",
                "Not adjusting depth to the target role and seniority."
        );
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
            String answerGuide,
            List<String> keyPoints,
            List<String> tags,
            String codeSnippet
    ) {
    }
}
