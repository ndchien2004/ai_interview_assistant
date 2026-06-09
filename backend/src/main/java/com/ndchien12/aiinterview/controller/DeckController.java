package com.ndchien12.aiinterview.controller;

import com.ndchien12.aiinterview.dto.course.CourseDetailResponse;
import com.ndchien12.aiinterview.dto.course.CourseImportResponse;
import com.ndchien12.aiinterview.dto.course.CourseProgressResponse;
import com.ndchien12.aiinterview.dto.course.CourseRequest;
import com.ndchien12.aiinterview.dto.course.CourseSummaryResponse;
import com.ndchien12.aiinterview.dto.course.DeckJsonImportRequest;
import com.ndchien12.aiinterview.dto.course.QuestionProgressResponse;
import com.ndchien12.aiinterview.dto.course.QuestionResponse;
import com.ndchien12.aiinterview.entity.FlashcardStatusFilter;
import com.ndchien12.aiinterview.entity.QuestionDifficulty;
import com.ndchien12.aiinterview.service.CourseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/decks")
public class DeckController {
    private final CourseService courseService;

    public DeckController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping
    public List<CourseSummaryResponse> listDecks(Authentication authentication) {
        return courseService.listVisibleDecks(authentication.getName());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CourseDetailResponse createDeck(@Valid @RequestBody CourseRequest request, Authentication authentication) {
        return courseService.createDeck(request, authentication.getName());
    }

    @GetMapping("/{slug}")
    public CourseDetailResponse getDeck(@PathVariable String slug) {
        return courseService.getCourse(slug);
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

    @PostMapping("/{slug}/imports/json")
    @ResponseStatus(HttpStatus.CREATED)
    public CourseImportResponse importJson(
            @PathVariable String slug,
            @Valid @RequestBody DeckJsonImportRequest request,
            Authentication authentication
    ) {
        return courseService.importDeckJson(slug, request, authentication.getName());
    }
}
