package com.ndchien12.aiinterview.service;

import com.ndchien12.aiinterview.dto.course.CourseDetailResponse;
import com.ndchien12.aiinterview.dto.course.CourseImportRequest;
import com.ndchien12.aiinterview.dto.course.CourseImportResponse;
import com.ndchien12.aiinterview.dto.course.CourseImportRowError;
import com.ndchien12.aiinterview.dto.course.CourseProgressResponse;
import com.ndchien12.aiinterview.dto.course.CourseRequest;
import com.ndchien12.aiinterview.dto.course.CourseSummaryResponse;
import com.ndchien12.aiinterview.dto.course.DeckQuestionUpdateRequest;
import com.ndchien12.aiinterview.dto.course.DeckJsonImportRequest;
import com.ndchien12.aiinterview.dto.course.QuestionProgressResponse;
import com.ndchien12.aiinterview.dto.course.QuestionRequest;
import com.ndchien12.aiinterview.dto.course.QuestionResponse;
import com.ndchien12.aiinterview.dto.course.SectionRequest;
import com.ndchien12.aiinterview.dto.course.SectionResponse;
import com.ndchien12.aiinterview.dto.course.TopicProgressResponse;
import com.ndchien12.aiinterview.entity.Course;
import com.ndchien12.aiinterview.entity.CourseSection;
import com.ndchien12.aiinterview.entity.FlashcardStatusFilter;
import com.ndchien12.aiinterview.entity.ImportDelimiterMode;
import com.ndchien12.aiinterview.entity.PracticeConfidence;
import com.ndchien12.aiinterview.entity.PracticeQuestion;
import com.ndchien12.aiinterview.entity.QuestionDifficulty;
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

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
    public List<CourseSummaryResponse> listVisibleDecks(String email) {
        User user = findUser(email);
        return courseRepository.findVisibleDecks(user).stream()
                .map(course -> CourseSummaryResponse.from(course, questionRepository.countByCourseAndActiveTrue(course)))
                .toList();
    }

    @Transactional
    public CourseDetailResponse createDeck(CourseRequest request, String email) {
        return createLearningCourse(request, email);
    }

    @Transactional
    public CourseDetailResponse createLearningCourse(CourseRequest request, String email) {
        User user = findUser(email);
        if (courseRepository.existsBySlug(request.slug())) {
            throw new ApiException(HttpStatus.CONFLICT, "Slug học phần đã tồn tại");
        }

        Course course = new Course();
        applyCourseRequest(course, request);
        course.setOwner(user);
        Course saved = courseRepository.save(course);
        return CourseDetailResponse.from(saved, 0, List.of());
    }

    @Transactional
    public CourseDetailResponse updateLearningCourse(String slug, CourseRequest request, String email) {
        User user = findUser(email);
        Course course = findActiveCourse(slug);
        ensureCanEditDeck(course, user);
        String requestedSlug = request.slug().trim().toLowerCase();
        if (!course.getSlug().equals(requestedSlug) && courseRepository.existsBySlug(requestedSlug)) {
            throw new ApiException(HttpStatus.CONFLICT, "Course slug already exists");
        }

        applyCourseRequest(course, request);
        Course saved = courseRepository.save(course);
        return getCourse(saved.getSlug());
    }

    @Transactional
    public void deleteLearningCourse(String slug, String email) {
        User user = findUser(email);
        Course course = findActiveCourse(slug);
        ensureCanEditDeck(course, user);
        course.setActive(false);
        courseRepository.save(course);
    }

    @Transactional
    public SectionResponse createDeckSection(String courseSlug, SectionRequest request, String email) {
        User user = findUser(email);
        Course course = findActiveCourse(courseSlug);
        ensureCanEditDeck(course, user);
        String slug = request.slug().trim().toLowerCase();
        if (sectionRepository.existsByCourseAndSlug(course, slug)) {
            throw new ApiException(HttpStatus.CONFLICT, "Slug bộ thẻ đã tồn tại trong học phần này");
        }

        CourseSection section = new CourseSection();
        section.setCourse(course);
        section.setSlug(slug);
        section.setTitle(request.title().trim());
        section.setDescription(request.description().trim());
        section.setSortOrder(request.sortOrder() > 0 ? request.sortOrder() : nextSectionSortOrder(course));
        section.setActive(true);
        CourseSection saved = sectionRepository.save(section);
        return SectionResponse.from(saved, List.of());
    }

    @Transactional
    public SectionResponse updateDeckSection(String courseSlug, String deckSlug, SectionRequest request, String email) {
        User user = findUser(email);
        Course course = findActiveCourse(courseSlug);
        ensureCanEditDeck(course, user);
        CourseSection section = findSectionBySlug(course, deckSlug);
        String requestedSlug = request.slug().trim().toLowerCase();
        if (!section.getSlug().equals(requestedSlug) && sectionRepository.existsByCourseAndSlug(course, requestedSlug)) {
            throw new ApiException(HttpStatus.CONFLICT, "Deck slug already exists in this course");
        }

        section.setSlug(requestedSlug);
        section.setTitle(request.title().trim());
        section.setDescription(request.description().trim());
        section.setSortOrder(request.sortOrder() > 0 ? request.sortOrder() : section.getSortOrder());
        section.setActive(true);
        CourseSection saved = sectionRepository.save(section);
        List<QuestionResponse> questions = questionRepository.findBySectionAndActiveTrueOrderBySortOrderAsc(saved).stream()
                .map(QuestionResponse::from)
                .toList();
        return SectionResponse.from(saved, questions);
    }

    @Transactional
    public void deleteDeckSection(String courseSlug, String deckSlug, String email) {
        User user = findUser(email);
        Course course = findActiveCourse(courseSlug);
        ensureCanEditDeck(course, user);
        CourseSection section = findSectionBySlug(course, deckSlug);
        section.setActive(false);
        sectionRepository.save(section);
        List<PracticeQuestion> questions = questionRepository.findBySectionAndActiveTrueOrderBySortOrderAsc(section);
        questions.forEach(question -> question.setActive(false));
        questionRepository.saveAll(questions);
    }

    @Transactional
    public QuestionResponse updateDeckQuestion(
            String courseSlug,
            String deckSlug,
            UUID questionId,
            DeckQuestionUpdateRequest request,
            String email
    ) {
        User user = findUser(email);
        Course course = findActiveCourse(courseSlug);
        ensureCanEditDeck(course, user);
        CourseSection section = findSectionBySlug(course, deckSlug);
        PracticeQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Question not found"));

        if (!question.isActive()
                || !question.getCourse().getId().equals(course.getId())
                || !question.getSection().getId().equals(section.getId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Question not found");
        }

        List<String> options = cleanList(request.options());
        if (options.size() != 4) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Each question must have exactly 4 options");
        }
        if (request.correctOptionIndex() < 0 || request.correctOptionIndex() > 3) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Correct option index must be between 0 and 3");
        }

        String explanation = requireText(request.explanation(), "Explanation is required");
        question.setQuestion(requireText(request.question(), "Question is required"));
        question.setOptions(options);
        question.setCorrectOptionIndex(request.correctOptionIndex());
        question.setShortAnswer(options.get(request.correctOptionIndex()));
        question.setDetailedAnswer(explanation);
        question.setExplanation(explanation);
        question.setKeyPoints(List.of(options.get(request.correctOptionIndex())));
        question.setTopic(section.getTitle());
        question.setActive(true);
        return QuestionResponse.from(questionRepository.save(question));
    }

    @Transactional(readOnly = true)
    public SectionResponse getDeckSection(String courseSlug, String deckSlug) {
        Course course = findActiveCourse(courseSlug);
        CourseSection section = findSectionBySlug(course, deckSlug);
        List<QuestionResponse> questions = questionRepository.findBySectionAndActiveTrueOrderBySortOrderAsc(section).stream()
                .map(QuestionResponse::from)
                .toList();
        return SectionResponse.from(section, questions);
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

        List<SectionResponse> sections = sectionRepository.findByCourseAndActiveTrueOrderBySortOrderAsc(course).stream()
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
        Instant now = Instant.now();
        List<PracticeQuestion> questions = questionRepository.findByCourseAndActiveTrueOrderBySortOrderAsc(course);
        Set<UUID> activeQuestionIds = questions.stream()
                .map(PracticeQuestion::getId)
                .collect(Collectors.toSet());
        List<UserQuestionProgress> progress = progressRepository.findByUserAndQuestionCourseSlug(user, slug).stream()
                .filter(item -> activeQuestionIds.contains(item.getQuestion().getId()))
                .toList();
        Map<UUID, UserQuestionProgress> progressByQuestion = progress.stream()
                .collect(Collectors.toMap(item -> item.getQuestion().getId(), item -> item));

        long attempted = progress.stream().filter(this::hasStarted).count();
        long mastered = progress.stream().filter(this::isMastered).count();
        long correctAnswers = progress.stream().mapToLong(UserQuestionProgress::getCorrectCount).sum();
        long incorrectAnswers = progress.stream().mapToLong(UserQuestionProgress::getIncorrectCount).sum();
        long due = progress.stream().filter(item -> isDue(item, now)).count();
        long learning = progress.stream().filter(this::isLearning).count();
        Instant lastStudyAt = progress.stream()
                .map(UserQuestionProgress::getLastAttemptAt)
                .max(Comparator.naturalOrder())
                .orElse(null);
        int masteryPercentage = questions.isEmpty() ? 0 : Math.round((mastered * 100f) / questions.size());
        double averageConfidence = progress.stream()
                .mapToInt(item -> confidenceScore(item.getConfidence()))
                .average()
                .orElse(0);
        int accuracyPercentage = correctAnswers + incorrectAnswers == 0
                ? 0
                : Math.round((correctAnswers * 100f) / (correctAnswers + incorrectAnswers));
        int streakDays = calculateStreakDays(progress);

        Map<String, List<PracticeQuestion>> byTopic = questions.stream()
                .collect(Collectors.groupingBy(PracticeQuestion::getTopic));
        List<TopicProgressResponse> topics = byTopic.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    long topicAttempted = entry.getValue().stream()
                            .filter(question -> hasStarted(progressByQuestion.get(question.getId())))
                            .count();
                    long topicMastered = entry.getValue().stream()
                            .map(question -> progressByQuestion.get(question.getId()))
                            .filter(this::isMastered)
                            .count();
                    long topicCorrect = entry.getValue().stream()
                            .map(question -> progressByQuestion.get(question.getId()))
                            .filter(item -> item != null)
                            .mapToLong(UserQuestionProgress::getCorrectCount)
                            .sum();
                    long topicIncorrect = entry.getValue().stream()
                            .map(question -> progressByQuestion.get(question.getId()))
                            .filter(item -> item != null)
                            .mapToLong(UserQuestionProgress::getIncorrectCount)
                            .sum();
                    long topicDue = entry.getValue().stream()
                            .map(question -> progressByQuestion.get(question.getId()))
                            .filter(item -> item != null && isDue(item, now))
                            .count();
                    long topicLearning = entry.getValue().stream()
                            .map(question -> progressByQuestion.get(question.getId()))
                            .filter(this::isLearning)
                            .count();
                    int topicMastery = entry.getValue().isEmpty()
                            ? 0
                            : Math.round((topicMastered * 100f) / entry.getValue().size());
                    return new TopicProgressResponse(
                            entry.getKey(),
                            entry.getValue().size(),
                            topicAttempted,
                            topicMastered,
                            topicCorrect,
                            topicIncorrect,
                            topicDue,
                            topicLearning,
                            topicMastery
                    );
                })
                .toList();

        return new CourseProgressResponse(
                slug,
                questions.size(),
                attempted,
                mastered,
                correctAnswers,
                incorrectAnswers,
                due,
                learning,
                streakDays,
                lastStudyAt,
                accuracyPercentage,
                masteryPercentage,
                averageConfidence,
                topics
        );
    }

    @Transactional(readOnly = true)
    public List<QuestionResponse> listQuestions(
            String slug,
            String email,
            String topic,
            QuestionDifficulty difficulty,
            FlashcardStatusFilter status,
            Boolean due,
            String query,
            String deckSlug
    ) {
        Course course = findActiveCourse(slug);
        User user = findUser(email);
        Instant now = Instant.now();
        List<PracticeQuestion> questions = questionRepository.findByCourseAndActiveTrueOrderBySortOrderAsc(course);
        Map<UUID, UserQuestionProgress> progressByQuestion = progressRepository.findByUserAndQuestionCourseSlug(user, slug).stream()
                .collect(Collectors.toMap(item -> item.getQuestion().getId(), item -> item));

        return questions.stream()
                .filter(question -> matchesQuestionFilters(
                        question,
                        progressByQuestion.get(question.getId()),
                        deckSlug,
                        topic,
                        difficulty,
                        status,
                        due,
                        query,
                        now
                ))
                .map(QuestionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<QuestionProgressResponse> getQuestionProgress(String slug, String email) {
        findActiveCourse(slug);
        User user = findUser(email);
        Instant now = Instant.now();
        return progressRepository.findByUserAndQuestionCourseSlug(user, slug).stream()
                .filter(item -> item.getQuestion().isActive())
                .sorted(Comparator.comparing(item -> item.getQuestion().getSortOrder()))
                .map(item -> QuestionProgressResponse.from(item, now))
                .toList();
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
            applyMultipleChoice(question, List.of(row.answer(), "Chưa chính xác", "Không liên quan", "Thiếu dữ kiện"), 0, row.answer());
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
    public CourseImportResponse importDeckJson(String slug, DeckJsonImportRequest request, String email) {
        User user = findUser(email);
        Course course = findActiveCourse(slug);
        ensureCanEditDeck(course, user);
        if (request.title() != null && !request.title().isBlank()) {
            course.setTitle(request.title().trim());
        }
        if (request.description() != null && !request.description().isBlank()) {
            course.setDescription(request.description().trim());
        }

        List<QuestionResponse> createdQuestions = new ArrayList<>();
        List<CourseImportRowError> invalidRows = new ArrayList<>();
        int rowNumber = 0;
        int nextSortOrder = Math.toIntExact(questionRepository.countByCourse(course)) + 1;

        for (DeckJsonImportRequest.DeckSectionImportRequest sectionRequest : request.sections()) {
            rowNumber++;
            if (sectionRequest.title() == null || sectionRequest.title().isBlank()) {
                invalidRows.add(new CourseImportRowError(rowNumber, "section", "Tên chủ đề không được để trống"));
                continue;
            }
            CourseSection section = findOrCreateImportSection(course, sectionRequest.title().trim());

            for (DeckJsonImportRequest.DeckQuestionImportRequest questionRequest : sectionRequest.questions()) {
                rowNumber++;
                try {
                    PracticeQuestion question = new PracticeQuestion();
                    String prompt = requireText(questionRequest.question(), "Câu hỏi không được để trống");
                    question.setCourse(course);
                    question.setSection(section);
                    question.setQuestion(prompt);
                    question.setShortAnswer(correctOptionText(questionRequest.options(), questionRequest.correctAnswer()));
                    question.setDetailedAnswer(questionRequest.explanation() == null || questionRequest.explanation().isBlank()
                            ? question.getShortAnswer()
                            : questionRequest.explanation().trim());
                    question.setKeyPoints(new ArrayList<>(List.of(question.getShortAnswer())));
                    question.setCommonMistakes(new ArrayList<>(List.of("Chọn đáp án theo cảm tính mà không đọc kỹ giải thích.")));
                    applyMultipleChoice(
                            question,
                            questionRequest.options(),
                            correctOptionIndex(questionRequest.correctAnswer()),
                            questionRequest.explanation()
                    );
                    question.setDifficulty(questionRequest.difficulty() == null ? QuestionDifficulty.BEGINNER : questionRequest.difficulty());
                    question.setTopic(section.getTitle());
                    question.setTags(cleanList(questionRequest.tags()));
                    question.setCodeSnippet(blankToNull(questionRequest.codeSnippet()));
                    question.setActive(true);
                    question.setSortOrder(nextSortOrder++);
                    createdQuestions.add(QuestionResponse.from(questionRepository.save(question)));
                } catch (ApiException exception) {
                    invalidRows.add(new CourseImportRowError(rowNumber, questionRequest.question(), exception.getMessage()));
                }
            }
        }

        if (createdQuestions.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File JSON không có câu hỏi hợp lệ");
        }

        return new CourseImportResponse(createdQuestions.size(), invalidRows.size(), invalidRows, createdQuestions);
    }

    @Transactional
    public CourseImportResponse importDeckJson(String courseSlug, String deckSlug, DeckJsonImportRequest request, String email) {
        User user = findUser(email);
        Course course = findActiveCourse(courseSlug);
        ensureCanEditDeck(course, user);
        CourseSection section = findSectionBySlug(course, deckSlug);

        List<QuestionResponse> createdQuestions = new ArrayList<>();
        List<CourseImportRowError> invalidRows = new ArrayList<>();
        int rowNumber = 0;
        int nextSortOrder = Math.toIntExact(questionRepository.countBySection(section)) + 1;

        for (DeckJsonImportRequest.DeckSectionImportRequest sectionRequest : request.sections()) {
            for (DeckJsonImportRequest.DeckQuestionImportRequest questionRequest : sectionRequest.questions()) {
                rowNumber++;
                try {
                    PracticeQuestion question = new PracticeQuestion();
                    String prompt = requireText(questionRequest.question(), "Câu hỏi không được để trống");
                    question.setCourse(course);
                    question.setSection(section);
                    question.setQuestion(prompt);
                    question.setShortAnswer(correctOptionText(questionRequest.options(), questionRequest.correctAnswer()));
                    question.setDetailedAnswer(questionRequest.explanation() == null || questionRequest.explanation().isBlank()
                            ? question.getShortAnswer()
                            : questionRequest.explanation().trim());
                    question.setKeyPoints(List.of(question.getShortAnswer()));
                    question.setCommonMistakes(List.of("Chọn đáp án theo cảm tính mà không đọc kỹ giải thích."));
                    applyMultipleChoice(
                            question,
                            questionRequest.options(),
                            correctOptionIndex(questionRequest.correctAnswer()),
                            questionRequest.explanation()
                    );
                    question.setDifficulty(questionRequest.difficulty() == null ? QuestionDifficulty.BEGINNER : questionRequest.difficulty());
                    question.setTopic(section.getTitle());
                    question.setTags(cleanList(questionRequest.tags()));
                    question.setCodeSnippet(blankToNull(questionRequest.codeSnippet()));
                    question.setActive(true);
                    question.setSortOrder(nextSortOrder++);
                    createdQuestions.add(QuestionResponse.from(questionRepository.save(question)));
                } catch (ApiException exception) {
                    invalidRows.add(new CourseImportRowError(rowNumber, questionRequest.question(), exception.getMessage()));
                }
            }
        }

        if (createdQuestions.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File JSON không có câu hỏi hợp lệ");
        }

        return new CourseImportResponse(createdQuestions.size(), invalidRows.size(), invalidRows, createdQuestions);
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
        section.setActive(true);
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
        applyMultipleChoice(question, request.options(), request.correctOptionIndex(), request.explanation());
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
        return sectionRepository.findByCourseAndSlugAndActiveTrue(course, slug)
                .orElseGet(() -> {
                    CourseSection section = new CourseSection();
                    section.setCourse(course);
                    section.setSlug(uniqueSectionSlug(course, slug));
                    section.setTitle(topic);
                    section.setDescription("Imported flashcards for " + topic + ".");
                    int nextOrder = sectionRepository.findByCourseOrderBySortOrderAsc(course).stream()
                            .mapToInt(CourseSection::getSortOrder)
                            .max()
                            .orElse(0) + 1;
                    section.setSortOrder(nextOrder);
                    section.setActive(true);
                    return sectionRepository.save(section);
                });
    }

    private CourseSection findSectionBySlug(Course course, String deckSlug) {
        if (deckSlug == null || deckSlug.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Slug bộ thẻ không được để trống");
        }
        return sectionRepository.findByCourseAndSlugAndActiveTrue(course, deckSlug.trim().toLowerCase())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Bộ thẻ không tồn tại"));
    }

    private int nextSectionSortOrder(Course course) {
        return sectionRepository.findByCourseOrderBySortOrderAsc(course).stream()
                .mapToInt(CourseSection::getSortOrder)
                .max()
                .orElse(0) + 1;
    }

    private String uniqueSectionSlug(Course course, String baseSlug) {
        String candidate = baseSlug;
        int suffix = 2;
        while (sectionRepository.existsByCourseAndSlug(course, candidate)) {
            candidate = baseSlug + "-" + suffix;
            suffix++;
        }
        return candidate;
    }

    private String slugify(String value) {
        String slug = value.trim().toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return slug.isBlank() ? "imported-flashcards" : slug;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private int correctOptionIndex(String correctAnswer) {
        if (correctAnswer == null || correctAnswer.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Đáp án đúng không được để trống");
        }
        return switch (correctAnswer.trim().toUpperCase()) {
            case "A" -> 0;
            case "B" -> 1;
            case "C" -> 2;
            case "D" -> 3;
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Đáp án đúng phải là A, B, C hoặc D");
        };
    }

    private String correctOptionText(List<String> options, String correctAnswer) {
        List<String> cleanedOptions = cleanList(options);
        int index = correctOptionIndex(correctAnswer);
        if (cleanedOptions.size() != 4) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mỗi câu hỏi phải có đúng 4 đáp án");
        }
        return cleanedOptions.get(index);
    }

    private void ensureCanEditDeck(Course course, User user) {
        if (course.getOwner() != null && !course.getOwner().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Bạn không có quyền sửa bộ thẻ này");
        }
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

    private void applyMultipleChoice(
            PracticeQuestion question,
            List<String> options,
            int correctOptionIndex,
            String explanation
    ) {
        List<String> cleanedOptions = cleanList(options);
        if (cleanedOptions.isEmpty()) {
            String answer = question.getShortAnswer() == null || question.getShortAnswer().isBlank()
                    ? "Đáp án đúng"
                    : question.getShortAnswer().trim();
            cleanedOptions = List.of(answer, "Phương án gây nhiễu 1", "Phương án gây nhiễu 2", "Phương án gây nhiễu 3");
            correctOptionIndex = 0;
        }
        if (cleanedOptions.size() != 4) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mỗi câu hỏi phải có đúng 4 đáp án");
        }
        if (correctOptionIndex < 0 || correctOptionIndex > 3) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Đáp án đúng phải nằm trong khoảng 0 đến 3");
        }

        question.setOptions(new ArrayList<>(cleanedOptions));
        question.setCorrectOptionIndex(correctOptionIndex);
        question.setExplanation(explanation == null || explanation.isBlank()
                ? cleanedOptions.get(correctOptionIndex)
                : explanation.trim());
    }

    private boolean matchesQuestionFilters(
            PracticeQuestion question,
            UserQuestionProgress progress,
            String deckSlug,
            String topic,
            QuestionDifficulty difficulty,
            FlashcardStatusFilter status,
            Boolean due,
            String query,
            Instant now
    ) {
        if (deckSlug != null && !deckSlug.isBlank() && !deckSlug.trim().equals(question.getSection().getSlug())) {
            return false;
        }
        if (topic != null && !topic.isBlank() && !topic.trim().equals(question.getTopic())) {
            return false;
        }
        if (difficulty != null && difficulty != question.getDifficulty()) {
            return false;
        }
        if (status != null && status != FlashcardStatusFilter.ALL && !matchesStatusFilter(progress, status)) {
            return false;
        }
        if (due != null) {
            boolean questionDue = progress != null && isDue(progress, now);
            if (due != questionDue) {
                return false;
            }
        }
        if (query != null && !query.isBlank()) {
            String normalized = query.trim().toLowerCase();
            String tags = String.join(" ", question.getTags()).toLowerCase();
            return question.getQuestion().toLowerCase().contains(normalized)
                    || question.getShortAnswer().toLowerCase().contains(normalized)
                    || question.getTopic().toLowerCase().contains(normalized)
                    || tags.contains(normalized);
        }
        return true;
    }

    private boolean matchesStatusFilter(UserQuestionProgress progress, FlashcardStatusFilter status) {
        return switch (status) {
            case ALL -> true;
            case UNSEEN -> !hasStarted(progress);
            case LEARNING -> isLearning(progress);
            case MASTERED -> isMastered(progress);
        };
    }

    private boolean hasStarted(UserQuestionProgress progress) {
        return progress != null && progress.getAttemptCount() > 0;
    }

    private boolean isLearning(UserQuestionProgress progress) {
        return hasStarted(progress) && !isMastered(progress);
    }

    private boolean isMastered(UserQuestionProgress progress) {
        return hasStarted(progress) && (progress.isMastered() || progress.getCorrectStreak() >= 3);
    }

    private boolean isDue(UserQuestionProgress progress, Instant now) {
        return progress.getNextReviewAt() != null && !progress.getNextReviewAt().isAfter(now);
    }

    private int calculateStreakDays(List<UserQuestionProgress> progress) {
        Set<LocalDate> studyDates = progress.stream()
                .map(UserQuestionProgress::getLastAttemptAt)
                .filter(attemptedAt -> attemptedAt != null)
                .map(attemptedAt -> attemptedAt.atZone(ZoneOffset.UTC).toLocalDate())
                .collect(Collectors.toSet());
        if (studyDates.isEmpty()) {
            return 0;
        }

        LocalDate cursor = studyDates.stream().max(Comparator.naturalOrder()).orElseThrow();
        int streak = 0;
        while (studyDates.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
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
