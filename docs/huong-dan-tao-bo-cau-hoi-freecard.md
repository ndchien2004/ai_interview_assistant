# Hướng Dẫn Tạo Bộ Câu Hỏi FreeCard

FreeCard dùng file JSON để import bộ câu hỏi trắc nghiệm. Mỗi câu hỏi cần có đúng 4 đáp án và 1 đáp án đúng.

## Cấu Trúc File

```json
{
  "title": "Java cơ bản",
  "description": "Bộ câu hỏi tự tạo",
  "sections": [
    {
      "title": "Java Core",
      "questions": [
        {
          "question": "JVM dùng để làm gì?",
          "options": ["Chạy bytecode Java", "Tạo CSS", "Quản lý DNS", "Thiết kế database"],
          "correctAnswer": "A",
          "explanation": "JVM thực thi bytecode đã được biên dịch từ mã nguồn Java.",
          "difficulty": "BEGINNER",
          "tags": ["java", "jvm"]
        }
      ]
    }
  ]
}
```

## Quy Tắc

- `title`: tên bộ thẻ.
- `description`: mô tả ngắn.
- `sections`: danh sách chủ đề.
- `question`: nội dung câu hỏi.
- `options`: đúng 4 đáp án, tương ứng A, B, C, D.
- `correctAnswer`: chỉ dùng `A`, `B`, `C` hoặc `D`.
- `explanation`: giải thích ngắn để người học hiểu ngay sau khi chọn đáp án.
- `difficulty`: dùng `BEGINNER`, `INTERMEDIATE` hoặc `ADVANCED`.
- `tags`: danh sách tag để tìm kiếm/lọc.

## Gợi Ý Viết Câu Hỏi Hay

- Mỗi câu chỉ kiểm tra một ý chính.
- Đáp án sai nên hợp lý, không quá lộ.
- Giải thích nên ngắn, rõ, giúp sửa hiểu nhầm.
- Tránh dùng quá nhiều đáp án kiểu “Tất cả đều đúng”.
- Nếu câu có code, thêm `codeSnippet`.

## Import

Vào `Tạo/Import`, nhập tên bộ thẻ, slug, mô tả, sau đó paste JSON hoặc chọn file `.json`.
