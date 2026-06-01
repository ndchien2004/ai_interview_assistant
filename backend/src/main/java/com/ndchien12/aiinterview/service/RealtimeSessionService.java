package com.ndchien12.aiinterview.service;

import com.ndchien12.aiinterview.dto.interview.InterviewTranscriptMessageRequest;
import com.ndchien12.aiinterview.dto.interview.InterviewTranscriptMessageResponse;
import com.ndchien12.aiinterview.dto.interview.RealtimeSessionResponse;
import com.ndchien12.aiinterview.dto.interview.SaveInterviewTranscriptRequest;
import com.ndchien12.aiinterview.entity.InterviewQuestion;
import com.ndchien12.aiinterview.entity.InterviewSession;
import com.ndchien12.aiinterview.entity.InterviewTranscriptMessage;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.exception.ApiException;
import com.ndchien12.aiinterview.repository.InterviewQuestionRepository;
import com.ndchien12.aiinterview.repository.InterviewSessionRepository;
import com.ndchien12.aiinterview.repository.InterviewTranscriptMessageRepository;
import com.ndchien12.aiinterview.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class RealtimeSessionService {
    private final UserRepository userRepository;
    private final InterviewSessionRepository sessionRepository;
    private final InterviewQuestionRepository questionRepository;
    private final InterviewTranscriptMessageRepository transcriptRepository;
    private final OpenAiRealtimeService openAiRealtimeService;

    public RealtimeSessionService(
            UserRepository userRepository,
            InterviewSessionRepository sessionRepository,
            InterviewQuestionRepository questionRepository,
            InterviewTranscriptMessageRepository transcriptRepository,
            OpenAiRealtimeService openAiRealtimeService
    ) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.questionRepository = questionRepository;
        this.transcriptRepository = transcriptRepository;
        this.openAiRealtimeService = openAiRealtimeService;
    }

    @Transactional(readOnly = true)
    public RealtimeSessionResponse createRealtimeSession(UUID sessionId, String email) {
        InterviewSession session = findOwnedSession(sessionId, email);
        List<InterviewQuestion> questions = questionRepository.findBySessionOrderBySortOrderAsc(session);
        return openAiRealtimeService.createClientSecret(session, session.getResume(), questions);
    }

    @Transactional
    public List<InterviewTranscriptMessageResponse> saveTranscript(
            UUID sessionId,
            SaveInterviewTranscriptRequest request,
            String email
    ) {
        InterviewSession session = findOwnedSession(sessionId, email);
        List<InterviewQuestion> questions = questionRepository.findBySessionOrderBySortOrderAsc(session);
        Map<UUID, InterviewQuestion> questionsById = new HashMap<>();
        questions.forEach(question -> questionsById.put(question.getId(), question));

        transcriptRepository.deleteBySession(session);
        List<InterviewTranscriptMessage> messages = request.transcript() == null
                ? List.of()
                : request.transcript().stream()
                        .map(item -> toMessage(session, item, questionsById))
                        .toList();
        for (int index = 0; index < messages.size(); index += 1) {
            messages.get(index).setSortOrder(index + 1);
        }
        return transcriptRepository.saveAll(messages).stream()
                .map(InterviewTranscriptMessageResponse::from)
                .toList();
    }

    private InterviewTranscriptMessage toMessage(
            InterviewSession session,
            InterviewTranscriptMessageRequest item,
            Map<UUID, InterviewQuestion> questionsById
    ) {
        if (item.questionId() != null && !questionsById.containsKey(item.questionId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Transcript question does not belong to this interview");
        }
        InterviewTranscriptMessage message = new InterviewTranscriptMessage();
        message.setSession(session);
        message.setRole(item.role());
        message.setContent(item.content() == null ? "" : item.content().trim());
        message.setQuestionId(item.questionId());
        message.setCreatedAt(item.createdAt());
        return message;
    }

    private InterviewSession findOwnedSession(UUID sessionId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return sessionRepository.findByIdAndUser(sessionId, user)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Interview not found"));
    }
}
