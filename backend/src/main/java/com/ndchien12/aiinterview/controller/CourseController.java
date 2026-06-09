package com.ndchien12.aiinterview.controller;

import com.ndchien12.aiinterview.dto.course.CourseDetailResponse;
import com.ndchien12.aiinterview.dto.course.CourseImportRequest;
import com.ndchien12.aiinterview.dto.course.CourseImportResponse;
import com.ndchien12.aiinterview.dto.course.CourseProgressResponse;
import com.ndchien12.aiinterview.dto.course.CourseRequest;
import com.ndchien12.aiinterview.dto.course.CourseSummaryResponse;
import com.ndchien12.aiinterview.dto.course.DeckJsonImportRequest;
import com.ndchien12.aiinterview.dto.course.DeckQuestionUpdateRequest;
import com.ndchien12.aiinterview.dto.course.QuestionProgressResponse;
import com.ndchien12.aiinterview.dto.course.QuestionResponse;
import com.ndchien12.aiinterview.dto.course.SectionRequest;
import com.ndchien12.aiinterview.dto.course.SectionResponse;
import com.ndchien12.aiinterview.entity.FlashcardStatusFilter;
import com.ndchien12.aiinterview.entity.QuestionDifficulty;
import com.ndchien12.aiinterview.service.CourseService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/courses")
public class CourseController {
    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping
    public List<CourseSummaryResponse> listCourses() {
        return courseService.listActiveCourses();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CourseDetailResponse createCourse(@Valid @RequestBody CourseRequest request, Authentication authentication) {
        return courseService.createLearningCourse(request, authentication.getName());
    }

    @GetMapping("/{slug}")
    public CourseDetailResponse getCourse(@PathVariable String slug) {
        return courseService.getCourse(slug);
    }

    @PutMapping("/{slug}")
    public CourseDetailResponse updateCourse(
            @PathVariable String slug,
            @Valid @RequestBody CourseRequest request,
            Authentication authentication
    ) {
        return courseService.updateLearningCourse(slug, request, authentication.getName());
    }

    @DeleteMapping("/{slug}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCourse(@PathVariable String slug, Authentication authentication) {
        courseService.deleteLearningCourse(slug, authentication.getName());
    }

    @GetMapping("/{slug}/progress")
    public CourseProgressResponse getProgress(@PathVariable String slug, Authentication authentication) {
        return courseService.getProgress(slug, authentication.getName());
    }

    @GetMapping("/{slug}/progress/questions")
    public List<QuestionProgressResponse> getQuestionProgress(@PathVariable String slug, Authentication authentication) {
        return courseService.getQuestionProgress(slug, authentication.getName());
    }

    @GetMapping("/{slug}/questions")
    public List<QuestionResponse> listQuestions(
            @PathVariable String slug,
            @RequestParam(required = false) String topic,
            @RequestParam(required = false) QuestionDifficulty difficulty,
            @RequestParam(required = false) FlashcardStatusFilter status,
            @RequestParam(required = false) Boolean due,
            @RequestParam(required = false, name = "q") String query,
            @RequestParam(required = false) String deckSlug,
            Authentication authentication
    ) {
        return courseService.listQuestions(slug, authentication.getName(), topic, difficulty, status, due, query, deckSlug);
    }

    @PostMapping("/{slug}/decks")
    @ResponseStatus(HttpStatus.CREATED)
    public SectionResponse createDeck(
            @PathVariable String slug,
            @Valid @RequestBody SectionRequest request,
            Authentication authentication
    ) {
        return courseService.createDeckSection(slug, request, authentication.getName());
    }

    @GetMapping("/{slug}/decks/{deckSlug}")
    public SectionResponse getDeck(@PathVariable String slug, @PathVariable String deckSlug) {
        return courseService.getDeckSection(slug, deckSlug);
    }

    @PutMapping("/{slug}/decks/{deckSlug}")
    public SectionResponse updateDeck(
            @PathVariable String slug,
            @PathVariable String deckSlug,
            @Valid @RequestBody SectionRequest request,
            Authentication authentication
    ) {
        return courseService.updateDeckSection(slug, deckSlug, request, authentication.getName());
    }

    @DeleteMapping("/{slug}/decks/{deckSlug}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDeck(
            @PathVariable String slug,
            @PathVariable String deckSlug,
            Authentication authentication
    ) {
        courseService.deleteDeckSection(slug, deckSlug, authentication.getName());
    }

    @PutMapping("/{slug}/decks/{deckSlug}/questions/{questionId}")
    public QuestionResponse updateDeckQuestion(
            @PathVariable String slug,
            @PathVariable String deckSlug,
            @PathVariable UUID questionId,
            @Valid @RequestBody DeckQuestionUpdateRequest request,
            Authentication authentication
    ) {
        return courseService.updateDeckQuestion(slug, deckSlug, questionId, request, authentication.getName());
    }

    @PostMapping("/{slug}/decks/{deckSlug}/imports/json")
    @ResponseStatus(HttpStatus.CREATED)
    public CourseImportResponse importDeckJson(
            @PathVariable String slug,
            @PathVariable String deckSlug,
            @Valid @RequestBody DeckJsonImportRequest request,
            Authentication authentication
    ) {
        return courseService.importDeckJson(slug, deckSlug, request, authentication.getName());
    }

    @PostMapping("/{slug}/imports")
    @ResponseStatus(HttpStatus.CREATED)
    public CourseImportResponse importQuestions(
            @PathVariable String slug,
            @Valid @RequestBody CourseImportRequest request
    ) {
        return courseService.importQuestions(slug, request);
    }
}
