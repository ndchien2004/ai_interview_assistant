package com.ndchien12.aiinterview.controller;

import com.ndchien12.aiinterview.dto.course.CourseDetailResponse;
import com.ndchien12.aiinterview.dto.course.CourseRequest;
import com.ndchien12.aiinterview.dto.course.QuestionRequest;
import com.ndchien12.aiinterview.dto.course.QuestionResponse;
import com.ndchien12.aiinterview.dto.course.SectionRequest;
import com.ndchien12.aiinterview.dto.course.SectionResponse;
import com.ndchien12.aiinterview.service.CourseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminCourseController {
    private final CourseService courseService;

    public AdminCourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @PostMapping("/courses")
    @ResponseStatus(HttpStatus.CREATED)
    public CourseDetailResponse createCourse(@Valid @RequestBody CourseRequest request) {
        return courseService.createCourse(request);
    }

    @PutMapping("/courses/{id}")
    public CourseDetailResponse updateCourse(@PathVariable UUID id, @Valid @RequestBody CourseRequest request) {
        return courseService.updateCourse(id, request);
    }

    @DeleteMapping("/courses/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCourse(@PathVariable UUID id) {
        courseService.deleteCourse(id);
    }

    @PostMapping("/courses/{id}/sections")
    @ResponseStatus(HttpStatus.CREATED)
    public SectionResponse createSection(@PathVariable UUID id, @Valid @RequestBody SectionRequest request) {
        return courseService.createSection(id, request);
    }

    @PostMapping("/questions")
    @ResponseStatus(HttpStatus.CREATED)
    public QuestionResponse createQuestion(@Valid @RequestBody QuestionRequest request) {
        return courseService.createQuestion(request);
    }

    @PutMapping("/questions/{id}")
    public QuestionResponse updateQuestion(@PathVariable UUID id, @Valid @RequestBody QuestionRequest request) {
        return courseService.updateQuestion(id, request);
    }

    @DeleteMapping("/questions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteQuestion(@PathVariable UUID id) {
        courseService.deleteQuestion(id);
    }
}
