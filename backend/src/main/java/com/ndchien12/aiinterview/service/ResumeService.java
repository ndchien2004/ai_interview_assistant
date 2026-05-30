package com.ndchien12.aiinterview.service;

import com.ndchien12.aiinterview.dto.resume.ResumeResponse;
import com.ndchien12.aiinterview.dto.resume.ResumeUpdateRequest;
import com.ndchien12.aiinterview.entity.Resume;
import com.ndchien12.aiinterview.entity.ResumeStatus;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.exception.ApiException;
import com.ndchien12.aiinterview.repository.ResumeRepository;
import com.ndchien12.aiinterview.repository.UserRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ResumeService {
    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;
    private final ResumeAnalysisService resumeAnalysisService;
    private final long maxFileSizeBytes;

    public ResumeService(
            ResumeRepository resumeRepository,
            UserRepository userRepository,
            ResumeAnalysisService resumeAnalysisService,
            @Value("${app.resume.max-file-size-mb:${RESUME_MAX_FILE_SIZE_MB:5}}") long maxFileSizeMb
    ) {
        this.resumeRepository = resumeRepository;
        this.userRepository = userRepository;
        this.resumeAnalysisService = resumeAnalysisService;
        this.maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;
    }

    @Transactional(readOnly = true)
    public List<ResumeResponse> listResumes(String email) {
        User user = findUser(email);
        return resumeRepository.findByUserOrderByUploadedAtDesc(user).stream()
                .map(ResumeResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ResumeResponse getResume(UUID id, String email) {
        return ResumeResponse.from(findOwnedResume(id, findUser(email)));
    }

    @Transactional
    public ResumeResponse uploadResume(MultipartFile file, String email) {
        User user = findUser(email);
        validatePdf(file);

        Resume resume = new Resume();
        resume.setUser(user);
        resume.setFileName(cleanFileName(file.getOriginalFilename()));
        resume.setFileSize(file.getSize());
        resume.setContentType(file.getContentType() == null ? "application/pdf" : file.getContentType());
        resume.setStatus(ResumeStatus.PROCESSING);

        String extractedText;
        try {
            extractedText = extractText(file);
        } catch (IOException exception) {
            resume.setParsedText("");
            resume.setSummary("");
            resume.setSkills(new ArrayList<>());
            resume.setRoleSignals(new ArrayList<>());
            resume.setStatus(ResumeStatus.FAILED);
            resume.setParseError("Unable to read PDF text. Please upload a text-based PDF.");
            return ResumeResponse.from(resumeRepository.save(resume));
        }

        if (extractedText.length() < 80) {
            resume.setParsedText(extractedText);
            resume.setSummary(extractedText);
            resume.setSkills(new ArrayList<>());
            resume.setRoleSignals(new ArrayList<>());
            resume.setStatus(ResumeStatus.FAILED);
            resume.setParseError("Resume text is too short. Scanned PDFs are not supported in v1.");
            return ResumeResponse.from(resumeRepository.save(resume));
        }

        ResumeAnalysisResult analysis = resumeAnalysisService.analyze(extractedText);
        applyAnalysis(resume, analysis);
        resume.setStatus(hasWarnings(analysis) ? ResumeStatus.NEEDS_REVIEW : ResumeStatus.READY);
        resume.setParseError(null);

        return ResumeResponse.from(resumeRepository.save(resume));
    }

    @Transactional
    public ResumeResponse updateResume(UUID id, ResumeUpdateRequest request, String email) {
        Resume resume = findOwnedResume(id, findUser(email));
        resume.setFileName(cleanFileName(request.fileName()));
        resume.setParsedText(request.parsedText().trim());
        resume.setSummary(safeString(request.summary()));
        resume.setSkills(cleanList(request.skills()));
        resume.setRoleSignals(cleanList(request.roleSignals()));
        resume.setSenioritySignals(cleanList(request.senioritySignals()));
        resume.setProjectHighlights(cleanList(request.projectHighlights()));
        resume.setWarnings(cleanList(request.warnings()));
        resume.setStatus(toPlainText(resume.getParsedText()).length() < 80 ? ResumeStatus.NEEDS_REVIEW : ResumeStatus.READY);
        resume.setParseError(null);

        return ResumeResponse.from(resumeRepository.save(resume));
    }

    @Transactional
    public void deleteResume(UUID id, String email) {
        Resume resume = findOwnedResume(id, findUser(email));
        resumeRepository.delete(resume);
    }

    private void validatePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Resume PDF is required");
        }
        if (file.getSize() > maxFileSizeBytes) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Resume file must be smaller than 5MB");
        }
        String contentType = file.getContentType();
        String filename = file.getOriginalFilename();
        boolean pdfType = "application/pdf".equalsIgnoreCase(contentType);
        boolean pdfName = filename != null && filename.toLowerCase().endsWith(".pdf");
        if (!pdfType && !pdfName) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please upload a PDF resume");
        }
    }

    private String extractText(MultipartFile file) throws IOException {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return cleanExtractedText(stripper.getText(document));
        }
    }

    private String cleanExtractedText(String text) {
        if (text == null) {
            return "";
        }

        String normalized = Normalizer.normalize(text, Normalizer.Form.NFC)
                .replace('\u00A0', ' ')
                .replace("\uFFFD", "")
                .replaceAll("\\r\\n?", "\n")
                .replaceAll("[\\t\\x0B\\f]+", " ")
                .replaceAll("(?m)[ \\u200B\\u200C\\u200D]+$", "")
                .replaceAll("(?m)^\\s+", "")
                .replaceAll("-\\n(?=\\p{L})", "")
                .replaceAll("\\n{3,}", "\n\n");

        return normalized.trim();
    }

    private void applyAnalysis(Resume resume, ResumeAnalysisResult analysis) {
        resume.setParsedText(safeString(analysis.parsedResumeText()));
        resume.setSummary(safeString(analysis.summary()));
        resume.setSkills(cleanList(analysis.skills()));
        resume.setRoleSignals(cleanList(analysis.roleSignals()));
        resume.setSenioritySignals(cleanList(analysis.senioritySignals()));
        resume.setProjectHighlights(cleanList(analysis.projectHighlights()));
        resume.setWarnings(cleanList(analysis.warnings()));
    }

    private boolean hasWarnings(ResumeAnalysisResult analysis) {
        return analysis.warnings() != null && !analysis.warnings().isEmpty();
    }

    private Resume findOwnedResume(UUID id, User user) {
        return resumeRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Resume not found"));
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private String cleanFileName(String filename) {
        if (filename == null || filename.isBlank()) {
            return "resume.pdf";
        }
        return filename.trim();
    }

    private String safeString(String value) {
        return value == null ? "" : value.trim();
    }

    private String toPlainText(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replaceAll("(?i)<br\\s*/?>", "\n")
                .replaceAll("(?i)</(p|div|li|h[1-6])>", "\n")
                .replaceAll("<[^>]*>", "")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#039;", "'")
                .trim();
    }

    private List<String> cleanList(List<String> values) {
        if (values == null) {
            return new ArrayList<>();
        }
        return values.stream()
                .map(this::safeString)
                .filter(value -> !value.isBlank())
                .distinct()
                .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
    }
}
