package com.ndchien12.aiinterview.service;

import com.ndchien12.aiinterview.dto.course.CourseDetailResponse;
import com.ndchien12.aiinterview.dto.course.CourseImportRequest;
import com.ndchien12.aiinterview.dto.course.CourseImportResponse;
import com.ndchien12.aiinterview.dto.course.CourseImportRowError;
import com.ndchien12.aiinterview.dto.course.CourseProgressResponse;
import com.ndchien12.aiinterview.dto.course.CourseRequest;
import com.ndchien12.aiinterview.dto.course.CourseSummaryResponse;
import com.ndchien12.aiinterview.dto.course.QuestionRequest;
import com.ndchien12.aiinterview.dto.course.QuestionResponse;
import com.ndchien12.aiinterview.dto.course.SectionRequest;
import com.ndchien12.aiinterview.dto.course.SectionResponse;
import com.ndchien12.aiinterview.dto.course.TopicProgressResponse;
import com.ndchien12.aiinterview.entity.Course;
import com.ndchien12.aiinterview.entity.CourseSection;
import com.ndchien12.aiinterview.entity.ImportDelimiterMode;
import com.ndchien12.aiinterview.entity.PracticeConfidence;
import com.ndchien12.aiinterview.entity.PracticeQuestion;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.entity.UserQuestionProgress;
import com.ndchien12.aiinterview.exception.ApiException;
import com.ndchien12.aiinterview.repository.CourseRepository;
import com.ndchien12.aiinterview.repository.CourseSectionRepository;
import com.ndchien12.aiinterview.repository.PracticeQuestionRepository;
import com.ndchien12.aiinterview.repository.UserQuestionProgressRepository;
import com.ndchien12.aiinterview.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CourseService {
    private final CourseRepository courseRepository;
    private final CourseSectionRepository sectionRepository;
    private final PracticeQuestionRepository questionRepository;
    private final UserQuestionProgressRepository progressRepository;
    private final UserRepository userRepository;

    public CourseService(
            CourseRepository courseRepository,
            CourseSectionRepository sectionRepository,
            PracticeQuestionRepository questionRepository,
            UserQuestionProgressRepository progressRepository,
            UserRepository userRepository
    ) {
        this.courseRepository = courseRepository;
        this.sectionRepository = sectionRepository;
        this.questionRepository = questionRepository;
        this.progressRepository = progressRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<CourseSummaryResponse> listActiveCourses() {
        return courseRepository.findByActiveTrueOrderByTitleAsc().stream()
                .map(course -> CourseSummaryResponse.from(course, questionRepository.countByCourseAndActiveTrue(course)))
                .toList();
    }

    @Transactional(readOnly = true)
    public CourseDetailResponse getCourse(String slug) {
        Course course = findActiveCourse(slug);
        List<PracticeQuestion> questions = questionRepository.findByCourseAndActiveTrueOrderBySortOrderAsc(course);
        Map<UUID, List<QuestionResponse>> questionsBySection = questions.stream()
                .collect(Collectors.groupingBy(
                        question -> question.getSection().getId(),
                        Collectors.mapping(QuestionResponse::from, Collectors.toList())
                ));

        List<SectionResponse> sections = sectionRepository.findByCourseOrderBySortOrderAsc(course).stream()
                .map(section -> SectionResponse.from(
                        section,
                        questionsBySection.getOrDefault(section.getId(), List.of())
                ))
                .toList();

        return CourseDetailResponse.from(course, questions.size(), sections);
    }

    @Transactional(readOnly = true)
    public CourseProgressResponse getProgress(String slug, String email) {
        Course course = findActiveCourse(slug);
        User user = findUser(email);
        List<PracticeQuestion> questions = questionRepository.findByCourseAndActiveTrueOrderBySortOrderAsc(course);
        List<UserQuestionProgress> progress = progressRepository.findByUserAndQuestionCourseSlug(user, slug);
        Map<UUID, UserQuestionProgress> progressByQuestion = progress.stream()
                .collect(Collectors.toMap(item -> item.getQuestion().getId(), item -> item));

        long attempted = progress.size();
        long mastered = progress.stream().filter(UserQuestionProgress::isMastered).count();
        int masteryPercentage = questions.isEmpty() ? 0 : Math.round((mastered * 100f) / questions.size());
        double averageConfidence = progress.stream()
                .mapToInt(item -> confidenceScore(item.getConfidence()))
                .average()
                .orElse(0);

        Map<String, List<PracticeQuestion>> byTopic = questions.stream()
                .collect(Collectors.groupingBy(PracticeQuestion::getTopic));
        List<TopicProgressResponse> topics = byTopic.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    long topicAttempted = entry.getValue().stream()
                            .filter(question -> progressByQuestion.containsKey(question.getId()))
                            .count();
                    long topicMastered = entry.getValue().stream()
                            .map(question -> progressByQuestion.get(question.getId()))
                            .filter(item -> item != null && item.isMastered())
                            .count();
                    return new TopicProgressResponse(entry.getKey(), entry.getValue().size(), topicAttempted, topicMastered);
                })
                .toList();

        return new CourseProgressResponse(slug, questions.size(), attempted, mastered, masteryPercentage, averageConfidence, topics);
    }

    @Transactional
    public CourseImportResponse importQuestions(String slug, CourseImportRequest request) {
        Course course = findActiveCourse(slug);
        ImportDelimiterMode delimiterMode = request.delimiterMode() == null
                ? ImportDelimiterMode.AUTO
                : request.delimiterMode();
        String topic = request.topic().trim();
        List<ImportedRow> rows = new ArrayList<>();
        List<CourseImportRowError> invalidRows = new ArrayList<>();
        int skippedBlankRows = parseImportRows(request.content(), delimiterMode, rows, invalidRows);

        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Import content does not contain any valid flashcards");
        }

        CourseSection section = findOrCreateImportSection(course, topic);
        int nextSortOrder = Math.toIntExact(questionRepository.countByCourse(course)) + 1;
        List<QuestionResponse> createdQuestions = new ArrayList<>();

        for (ImportedRow row : rows) {
            PracticeQuestion question = new PracticeQuestion();
            question.setCourse(course);
            question.setSection(section);
            question.setQuestion(row.question());
            question.setShortAnswer(row.answer());
            question.setDetailedAnswer(row.answer());
            question.setKeyPoints(new ArrayList<>(List.of(row.answer())));
            question.setCommonMistakes(new ArrayList<>(List.of("Marking the card as mastered before you can recall the answer.")));
            question.setDifficulty(request.difficulty());
            question.setTopic(topic);
            question.setTags(new ArrayList<>(List.of("imported", "user-flashcard")));
            question.setCodeSnippet(null);
            question.setActive(true);
            question.setSortOrder(nextSortOrder++);
            createdQuestions.add(QuestionResponse.from(questionRepository.save(question)));
        }

        return new CourseImportResponse(
                createdQuestions.size(),
                skippedBlankRows + invalidRows.size(),
                invalidRows,
                createdQuestions
        );
    }

    @Transactional
    public CourseDetailResponse createCourse(CourseRequest request) {
        if (courseRepository.existsBySlug(request.slug())) {
            throw new ApiException(HttpStatus.CONFLICT, "Course slug already exists");
        }

        Course course = new Course();
        applyCourseRequest(course, request);
        Course saved = courseRepository.save(course);
        return CourseDetailResponse.from(saved, 0, List.of());
    }

    @Transactional
    public CourseDetailResponse updateCourse(UUID id, CourseRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Course not found"));
        applyCourseRequest(course, request);
        return getCourseForAdmin(courseRepository.save(course));
    }

    @Transactional
    public void deleteCourse(UUID id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Course not found"));
        course.setActive(false);
        courseRepository.save(course);
    }

    @Transactional
    public SectionResponse createSection(UUID courseId, SectionRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Course not found"));
        CourseSection section = new CourseSection();
        section.setCourse(course);
        section.setSlug(request.slug());
        section.setTitle(request.title());
        section.setDescription(request.description());
        section.setSortOrder(request.sortOrder());
        CourseSection saved = sectionRepository.save(section);
        return SectionResponse.from(saved, List.of());
    }

    @Transactional
    public QuestionResponse createQuestion(QuestionRequest request) {
        PracticeQuestion question = new PracticeQuestion();
        applyQuestionRequest(question, request);
        return QuestionResponse.from(questionRepository.save(question));
    }

    @Transactional
    public QuestionResponse updateQuestion(UUID id, QuestionRequest request) {
        PracticeQuestion question = questionRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Question not found"));
        applyQuestionRequest(question, request);
        return QuestionResponse.from(questionRepository.save(question));
    }

    @Transactional
    public void deleteQuestion(UUID id) {
        PracticeQuestion question = questionRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Question not found"));
        question.setActive(false);
        questionRepository.save(question);
    }

    private CourseDetailResponse getCourseForAdmin(Course course) {
        List<SectionResponse> sections = sectionRepository.findByCourseOrderBySortOrderAsc(course).stream()
                .map(section -> SectionResponse.from(section, List.of()))
                .toList();
        return CourseDetailResponse.from(course, questionRepository.countByCourse(course), sections);
    }

    private void applyCourseRequest(Course course, CourseRequest request) {
        course.setSlug(request.slug().trim().toLowerCase());
        course.setTitle(request.title().trim());
        course.setDescription(request.description().trim());
        course.setActive(request.active());
    }

    private void applyQuestionRequest(PracticeQuestion question, QuestionRequest request) {
        Course course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Course not found"));
        CourseSection section = sectionRepository.findById(request.sectionId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Section not found"));

        if (!section.getCourse().getId().equals(course.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Section does not belong to course");
        }

        question.setCourse(course);
        question.setSection(section);
        question.setQuestion(request.question().trim());
        question.setShortAnswer(request.shortAnswer().trim());
        question.setDetailedAnswer(request.detailedAnswer().trim());
        question.setKeyPoints(cleanList(request.keyPoints()));
        question.setCommonMistakes(cleanList(request.commonMistakes()));
        question.setDifficulty(request.difficulty());
        question.setTopic(request.topic().trim());
        question.setTags(cleanList(request.tags()));
        question.setCodeSnippet(request.codeSnippet());
        question.setActive(request.active());
        question.setSortOrder(request.sortOrder());
    }

    private int parseImportRows(
            String content,
            ImportDelimiterMode delimiterMode,
            List<ImportedRow> rows,
            List<CourseImportRowError> invalidRows
    ) {
        String[] lines = content.replace("\r\n", "\n").replace('\r', '\n').split("\n", -1);
        int blankRows = 0;

        for (int index = 0; index < lines.length; index++) {
            String raw = lines[index];
            if (raw.trim().isBlank()) {
                blankRows++;
                continue;
            }

            String delimiter = delimiterFor(raw, delimiterMode);
            if (delimiter == null) {
                invalidRows.add(new CourseImportRowError(index + 1, raw, "No supported delimiter found"));
                continue;
            }

            int delimiterIndex = raw.indexOf(delimiter);
            String question = raw.substring(0, delimiterIndex).trim();
            String answer = raw.substring(delimiterIndex + delimiter.length()).trim();

            if (question.isBlank() || answer.isBlank()) {
                invalidRows.add(new CourseImportRowError(index + 1, raw, "Question and answer are required"));
                continue;
            }

            rows.add(new ImportedRow(question, answer));
        }

        return blankRows;
    }

    private String delimiterFor(String row, ImportDelimiterMode delimiterMode) {
        return switch (delimiterMode) {
            case TAB -> row.contains("\t") ? "\t" : null;
            case PIPE -> row.contains("|") ? "|" : null;
            case COMMA -> row.contains(",") ? "," : null;
            case AUTO -> {
                if (row.contains("\t")) {
                    yield "\t";
                }
                if (row.contains("|")) {
                    yield "|";
                }
                yield row.contains(",") ? "," : null;
            }
        };
    }

    private CourseSection findOrCreateImportSection(Course course, String topic) {
        String slug = slugify(topic);
        return sectionRepository.findByCourseAndSlug(course, slug)
                .orElseGet(() -> {
                    CourseSection section = new CourseSection();
                    section.setCourse(course);
                    section.setSlug(slug);
                    section.setTitle(topic);
                    section.setDescription("Imported flashcards for " + topic + ".");
                    int nextOrder = sectionRepository.findByCourseOrderBySortOrderAsc(course).stream()
                            .mapToInt(CourseSection::getSortOrder)
                            .max()
                            .orElse(0) + 1;
                    section.setSortOrder(nextOrder);
                    return sectionRepository.save(section);
                });
    }

    private String slugify(String value) {
        String slug = value.trim().toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return slug.isBlank() ? "imported-flashcards" : slug;
    }

    private List<String> cleanList(List<String> values) {
        if (values == null) {
            return new ArrayList<>();
        }
        return values.stream()
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private Course findActiveCourse(String slug) {
        Course course = courseRepository.findBySlug(slug)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Course not found"));
        if (!course.isActive()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Course not found");
        }
        return course;
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private int confidenceScore(PracticeConfidence confidence) {
        return switch (confidence) {
            case AGAIN -> 1;
            case HARD -> 2;
            case GOOD -> 3;
            case MASTERED -> 4;
        };
    }

    private record ImportedRow(String question, String answer) {
    }
}
