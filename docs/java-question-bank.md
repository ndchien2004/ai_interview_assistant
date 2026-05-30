# Java Question Bank

File seed chính:

```text
backend/src/main/resources/data/java_fullstack_cv_interview_bank.json
```

Frontend mock fallback đang dùng bản copy ở:

```text
frontend/data/java_fullstack_cv_interview_bank.json
```

Backend tự đọc file này bằng `JsonCourseQuestionBankSeeder` khi app start. Nếu course chưa tồn tại, backend tạo course mới. Nếu course đã tồn tại, backend chỉ thêm các câu hỏi mới chưa trùng nội dung `question`, nên bạn có thể bổ sung thêm câu hỏi rồi restart backend.

## Course hiện tại

- Slug: `java-fullstack-cv-interview-bank`
- Title: `Java + Full-stack CV Interview Bank`
- Tổng số câu: 100
- Chia thành 10 section, mỗi section 10 câu:
  - Java Core Foundations
  - OOP and Design
  - Collections and Generics
  - Streams and Functional Java
  - Spring Boot, REST, and Security
  - JPA, PostgreSQL, and Data Modeling
  - Concurrency, Performance, and JVM
  - Testing and Quality
  - Frontend, Next.js, and React
  - System Design, DevOps, and AI Workflow

## Schema câu hỏi

```json
{
  "question": "Explain ...",
  "difficulty": "INTERMEDIATE",
  "answerGuide": "Short but detailed answer guide.",
  "keyPoints": ["point 1", "point 2"],
  "tags": ["java", "spring-boot", "cv-bank"],
  "codeSnippet": ""
}
```

`difficulty` chỉ dùng một trong ba giá trị:

```text
BEGINNER
INTERMEDIATE
ADVANCED
```

`codeSnippet` có thể để chuỗi rỗng nếu câu hỏi không cần code.

## Cách bổ sung câu hỏi

1. Mở `backend/src/main/resources/data/java_fullstack_cv_interview_bank.json`.
2. Thêm object câu hỏi vào đúng `section`.
3. Copy thay đổi tương tự sang `frontend/data/java_fullstack_cv_interview_bank.json` nếu muốn mock fallback cũng thấy câu mới khi chưa nối API.
4. Giữ `question` là duy nhất trong course để tránh bị bỏ qua khi seed.
5. Restart backend để seeder import câu mới vào database.

Nếu muốn tạo course khác theo domain riêng, cách đơn giản nhất là copy file JSON này thành file mới, đổi `slug/title/description`, rồi thêm một seeder tương tự `JsonCourseQuestionBankSeeder` trỏ tới file mới.
