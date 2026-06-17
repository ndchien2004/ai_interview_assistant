# Seed Data Template

File seed dang dung: [java_fullstack_flashcard_bank.json](./java_fullstack_flashcard_bank.json)

Dung mau duoi day de them section moi vao mang `sections`:

```json
{
  "title": "Ten chu de",
  "description": "Mo ta ngan cho chu de nay",
  "sortOrder": 1,
  "questions": [
    {
      "question": "Cau hoi o day?",
      "options": [
        "Dap an A",
        "Dap an B",
        "Dap an C",
        "Dap an D"
      ],
      "correctAnswer": "C",
      "explanation": "Giai thich vi sao dap an C dung.",
      "difficulty": "BEGINNER",
      "tags": [
        "java",
        "core"
      ]
    }
  ]
}
```

Mau cau hoi co code:

```json
{
  "question": "Doan code nay in ra gi?",
  "options": [
    "A",
    "B",
    "Compilation error",
    "Runtime exception"
  ],
  "correctAnswer": "C",
  "explanation": "Giai thich loi compile o day.",
  "difficulty": "INTERMEDIATE",
  "tags": [
    "java",
    "oop",
    "override"
  ],
  "codeSnippet": "class A {\n  void run() {}\n}\nclass B extends A {\n  int run() { return 1; }\n}"
}
```

Quy uoc:

- `options` nen co dung 4 dap an.
- `correctAnswer` chi dung `A`, `B`, `C`, hoac `D`.
- `difficulty` dung `BEGINNER`, `INTERMEDIATE`, hoac `ADVANCED`.
- `tags` la mang string, vi du `["spring", "rest", "controller"]`.
- App tu lay `section.title` lam topic.
