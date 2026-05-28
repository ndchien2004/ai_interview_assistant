package com.ndchien12.aiinterview.controller;

import com.ndchien12.aiinterview.dto.course.CourseDetailResponse;
import com.ndchien12.aiinterview.dto.course.CourseImportRequest;
import com.ndchien12.aiinterview.dto.course.CourseImportResponse;
import com.ndchien12.aiinterview.dto.course.CourseProgressResponse;
import com.ndchien12.aiinterview.dto.course.CourseSummaryResponse;
import com.ndchien12.aiinterview.service.CourseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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

    @GetMapping("/{slug}")
    public CourseDetailResponse getCourse(@PathVariable String slug) {
        return courseService.getCourse(slug);
    }

    @GetMapping("/{slug}/progress")
    public CourseProgressResponse getProgress(@PathVariable String slug, Authentication authentication) {
        return courseService.getProgress(slug, authentication.getName());
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
