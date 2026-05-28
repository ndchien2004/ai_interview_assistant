package com.ndchien12.aiinterview.config;

import com.ndchien12.aiinterview.entity.Course;
import com.ndchien12.aiinterview.entity.CourseSection;
import com.ndchien12.aiinterview.entity.PracticeQuestion;
import com.ndchien12.aiinterview.entity.QuestionDifficulty;
import com.ndchien12.aiinterview.repository.CourseRepository;
import com.ndchien12.aiinterview.repository.CourseSectionRepository;
import com.ndchien12.aiinterview.repository.PracticeQuestionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class JavaCoreCourseSeeder implements CommandLineRunner {
    public static final String JAVA_CORE_SLUG = "java-core-interview-mastery";
    private static final int BASE_QUESTION_COUNT = 100;
    private static final String IMPORTED_VI_TOPIC = "Imported Java Core VI";
    private static final String IMPORTED_VI_SECTION_SLUG = "imported-java-core-vi";

    private final CourseRepository courseRepository;
    private final CourseSectionRepository sectionRepository;
    private final PracticeQuestionRepository questionRepository;

    public JavaCoreCourseSeeder(
            CourseRepository courseRepository,
            CourseSectionRepository sectionRepository,
            PracticeQuestionRepository questionRepository
    ) {
        this.courseRepository = courseRepository;
        this.sectionRepository = sectionRepository;
        this.questionRepository = questionRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        Course course = courseRepository.findBySlug(JAVA_CORE_SLUG).orElseGet(this::createCourse);

        if (questionRepository.countByCourseAndActiveTrue(course) < BASE_QUESTION_COUNT) {
            questionRepository.findByCourseAndActiveTrueOrderBySortOrderAsc(course)
                    .forEach(question -> {
                        question.setActive(false);
                        questionRepository.save(question);
                    });

            seedBaseQuestions(course);
        }

        seedVietnameseImportedQuestions(course);
    }

    private void seedBaseQuestions(Course course) {
        int sortOrder = 1;
        for (TopicSeed topic : topics()) {
            CourseSection section = sectionRepository.findByCourseAndSlug(course, topic.slug())
                    .orElseGet(() -> createSection(course, topic));
            int topicIndex = 1;
            for (String prompt : topic.prompts()) {
                PracticeQuestion question = new PracticeQuestion();
                question.setCourse(course);
                question.setSection(section);
                question.setQuestion(prompt);
                question.setShortAnswer(shortAnswer(topic.title(), topic.concepts()));
                question.setDetailedAnswer(detailedAnswer(topic.title(), topic.concepts()));
                question.setKeyPoints(topic.concepts());
                question.setCommonMistakes(commonMistakes(topic.title()));
                question.setDifficulty(difficultyFor(topicIndex));
                question.setTopic(topic.title());
                question.setTags(List.of("java-core", topic.slug(), difficultyFor(topicIndex).name().toLowerCase()));
                question.setCodeSnippet(codeSnippet(topic.slug(), topicIndex));
                question.setActive(true);
                question.setSortOrder(sortOrder++);
                questionRepository.save(question);
                topicIndex++;
            }
        }
    }

    private void seedVietnameseImportedQuestions(Course course) {
        List<ImportedQuestionSeed> importedQuestions = importedVietnameseQuestions();
        List<PracticeQuestion> existingQuestions = questionRepository
                .findByCourseAndTopicAndActiveTrueOrderBySortOrderAsc(course, IMPORTED_VI_TOPIC);
        Set<String> existingQuestionText = new HashSet<>();
        existingQuestions.forEach(question -> existingQuestionText.add(question.getQuestion()));

        CourseSection section = sectionRepository.findByCourseAndSlug(course, IMPORTED_VI_SECTION_SLUG)
                .orElseGet(() -> createImportedVietnameseSection(course));

        int nextSortOrder = Math.toIntExact(questionRepository.countByCourse(course)) + 1;
        for (ImportedQuestionSeed seed : importedQuestions) {
            if (existingQuestionText.contains(seed.question())) {
                continue;
            }

            PracticeQuestion question = new PracticeQuestion();
            question.setCourse(course);
            question.setSection(section);
            question.setQuestion(seed.question());
            question.setShortAnswer(seed.answer());
            question.setDetailedAnswer(seed.answer());
            question.setKeyPoints(List.of(seed.answer()));
            question.setCommonMistakes(List.of("Đánh dấu đã thuộc trước khi có thể tự nhớ lại câu trả lời."));
            question.setDifficulty(QuestionDifficulty.BEGINNER);
            question.setTopic(IMPORTED_VI_TOPIC);
            question.setTags(List.of("java-core", "imported", "user-flashcard", "vietnamese"));
            question.setCodeSnippet(null);
            question.setActive(true);
            question.setSortOrder(nextSortOrder++);
            questionRepository.save(question);
        }
    }

    private Course createCourse() {
        Course course = new Course();
        course.setSlug(JAVA_CORE_SLUG);
        course.setTitle("Java Core Interview Mastery");
        course.setDescription("A structured 100-question Java Core course for interview preparation, covering syntax, OOP, collections, exceptions, generics, Java 8, streams, concurrency, JVM, and I/O.");
        course.setActive(true);
        return courseRepository.save(course);
    }

    private CourseSection createSection(Course course, TopicSeed topic) {
        CourseSection section = new CourseSection();
        section.setCourse(course);
        section.setSlug(topic.slug());
        section.setTitle(topic.title());
        section.setDescription("Practice interview questions for " + topic.title() + ".");
        section.setSortOrder(topic.sortOrder());
        return sectionRepository.save(section);
    }

    private CourseSection createImportedVietnameseSection(Course course) {
        CourseSection section = new CourseSection();
        section.setCourse(course);
        section.setSlug(IMPORTED_VI_SECTION_SLUG);
        section.setTitle(IMPORTED_VI_TOPIC);
        section.setDescription("Flashcards imported from the Vietnamese Java Core CSV file.");
        section.setSortOrder(12);
        return sectionRepository.save(section);
    }

    private QuestionDifficulty difficultyFor(int index) {
        if (index % 5 == 0) {
            return QuestionDifficulty.ADVANCED;
        }
        if (index % 2 == 0) {
            return QuestionDifficulty.INTERMEDIATE;
        }
        return QuestionDifficulty.BEGINNER;
    }

    private String shortAnswer(String topic, List<String> concepts) {
        return "A strong answer should define the " + topic + " concept, explain when it matters in real projects, and mention " + String.join(", ", concepts.subList(0, Math.min(3, concepts.size()))) + ".";
    }

    private String detailedAnswer(String topic, List<String> concepts) {
        return "In interviews, answer " + topic + " questions by starting with the core definition, then describing runtime behavior, tradeoffs, and a practical example. Connect the answer to " + String.join(", ", concepts) + ". Mention edge cases and explain why the concept affects correctness, performance, maintainability, or API design.";
    }

    private List<String> commonMistakes(String topic) {
        return List.of(
                "Giving only a memorized definition without explaining a real use case.",
                "Ignoring edge cases or runtime behavior for " + topic + ".",
                "Not comparing the concept with nearby Java Core alternatives."
        );
    }

    private String codeSnippet(String slug, int index) {
        if (!slug.equals("streams-and-lambdas") && !slug.equals("multithreading-and-concurrency") && !slug.equals("collections-framework")) {
            return null;
        }

        return switch (slug) {
            case "streams-and-lambdas" -> "List<String> names = users.stream().map(User::getName).filter(Objects::nonNull).toList();";
            case "multithreading-and-concurrency" -> "ExecutorService pool = Executors.newFixedThreadPool(4);\nFuture<Integer> result = pool.submit(() -> compute());";
            case "collections-framework" -> "Map<String, Integer> counts = new HashMap<>();\ncounts.merge(key, 1, Integer::sum);";
            default -> null;
        };
    }

    private List<TopicSeed> topics() {
        return List.of(
                topic(1, "java-basics-and-syntax", "Java Basics and Syntax", 8, List.of("primitive vs reference types", "pass-by-value", "operators", "control flow")),
                topic(2, "oop", "OOP", 12, List.of("encapsulation", "inheritance", "polymorphism", "abstraction", "composition")),
                topic(3, "string-and-wrapper-classes", "String and Wrapper Classes", 8, List.of("immutability", "String pool", "equals vs ==", "autoboxing")),
                topic(4, "collections-framework", "Collections Framework", 14, List.of("List vs Set vs Map", "hashing", "ordering", "iteration", "complexity")),
                topic(5, "exceptions", "Exceptions", 7, List.of("checked exceptions", "unchecked exceptions", "try-with-resources", "custom exceptions")),
                topic(6, "generics", "Generics", 7, List.of("type safety", "wildcards", "type erasure", "bounded types")),
                topic(7, "java-8-features", "Java 8 Features", 12, List.of("default methods", "Optional", "functional interfaces", "method references")),
                topic(8, "streams-and-lambdas", "Streams and Lambdas", 8, List.of("lazy evaluation", "intermediate operations", "terminal operations", "parallel streams")),
                topic(9, "multithreading-and-concurrency", "Multithreading and Concurrency", 12, List.of("thread lifecycle", "synchronization", "volatile", "locks", "executors")),
                topic(10, "jvm-memory-gc", "JVM, Memory, GC", 8, List.of("heap", "stack", "metaspace", "GC roots", "garbage collectors")),
                topic(11, "io-serialization-date-time", "I/O, Serialization, Date/Time", 4, List.of("streams", "serialization", "NIO", "java.time"))
        );
    }

    private TopicSeed topic(int sortOrder, String slug, String title, int count, List<String> concepts) {
        List<String> prompts = new ArrayList<>();
        List<String> basePrompts = promptBank().get(slug);
        for (int index = 0; index < count; index++) {
            String base = basePrompts.get(index % basePrompts.size());
            prompts.add(base);
        }
        return new TopicSeed(sortOrder, slug, title, concepts, prompts);
    }

    private Map<String, List<String>> promptBank() {
        return Map.ofEntries(
                Map.entry("java-basics-and-syntax", List.of(
                        "Explain why Java is considered platform independent and how bytecode fits into that story.",
                        "What is the difference between primitive types and reference types in Java?",
                        "Does Java pass parameters by value or by reference? Explain with an object example.",
                        "How do final variables, final methods, and final classes differ?",
                        "What happens when integer overflow occurs in Java?",
                        "Explain static fields, static methods, and static initialization blocks.",
                        "What is the difference between == and equals for Java objects?",
                        "How does Java handle variable scope inside loops, methods, and blocks?"
                )),
                Map.entry("oop", List.of(
                        "Explain encapsulation and give a Java example where it improves maintainability.",
                        "What is polymorphism in Java, and how do overriding and dynamic dispatch work?",
                        "Compare abstract classes and interfaces in modern Java.",
                        "When would you prefer composition over inheritance?",
                        "Explain method overloading versus method overriding.",
                        "What is constructor chaining, and how do this() and super() work?",
                        "Why should equals and hashCode be implemented together?",
                        "What are access modifiers and how do they support API design?",
                        "Explain the Liskov Substitution Principle with a Java inheritance example.",
                        "What is an immutable class, and how would you design one?",
                        "How do nested, inner, local, and anonymous classes differ?",
                        "What are sealed classes and what problem do they solve?"
                )),
                Map.entry("string-and-wrapper-classes", List.of(
                        "Why is String immutable in Java?",
                        "Explain the String pool and when intern() is useful or risky.",
                        "Compare String, StringBuilder, and StringBuffer.",
                        "Why can == be misleading when comparing Strings?",
                        "What is autoboxing and unboxing, and where can it cause bugs?",
                        "Explain wrapper class caching for Integer and Boolean.",
                        "How do you handle null safely when working with wrapper types?",
                        "What are common performance pitfalls in repeated String concatenation?"
                )),
                Map.entry("collections-framework", List.of(
                        "Compare ArrayList and LinkedList for access, insertion, and memory use.",
                        "How does HashMap work internally at a high level?",
                        "Why must hashCode be stable for keys stored in HashMap?",
                        "Compare HashSet, LinkedHashSet, and TreeSet.",
                        "Compare HashMap, LinkedHashMap, TreeMap, and ConcurrentHashMap.",
                        "What is fail-fast iteration and why does ConcurrentModificationException happen?",
                        "How would you choose between List, Set, and Map for a business feature?",
                        "Explain Comparable versus Comparator.",
                        "What are the time complexities of common ArrayList and HashMap operations?",
                        "How does resizing affect HashMap performance?",
                        "What is the difference between Iterator remove and collection remove during iteration?",
                        "When should you use Collections.unmodifiableList or List.copyOf?",
                        "Explain Queue, Deque, and PriorityQueue use cases.",
                        "How do equals and hashCode affect Set uniqueness?"
                )),
                Map.entry("exceptions", List.of(
                        "Compare checked and unchecked exceptions.",
                        "When should you create a custom exception?",
                        "How does try-with-resources work?",
                        "What is exception chaining and why is it useful?",
                        "Why is catching Exception or Throwable usually a smell?",
                        "How should a service layer translate low-level exceptions?",
                        "What happens when finally returns or throws an exception?"
                )),
                Map.entry("generics", List.of(
                        "What problem do generics solve in Java?",
                        "Explain type erasure and one limitation it creates.",
                        "What is the difference between List<? extends Number> and List<? super Integer>?",
                        "What are bounded type parameters?",
                        "Why cannot you create a generic array directly?",
                        "How do raw types break type safety?",
                        "Explain PECS: producer extends, consumer super."
                )),
                Map.entry("java-8-features", List.of(
                        "What is a functional interface?",
                        "Compare lambda expressions and anonymous classes.",
                        "What are method references and when do they improve readability?",
                        "How should Optional be used, and how should it not be used?",
                        "What are default methods in interfaces?",
                        "Explain java.time improvements over Date and Calendar.",
                        "How do Predicate, Function, Consumer, and Supplier differ?",
                        "What is the difference between map and flatMap?",
                        "How can default methods create multiple inheritance conflicts?",
                        "Explain effectively final variables in lambdas.",
                        "When should Optional not be used as a field or parameter?",
                        "What changed in interfaces after Java 8?"
                )),
                Map.entry("streams-and-lambdas", List.of(
                        "Explain intermediate and terminal stream operations.",
                        "Why are streams lazy?",
                        "Compare map, filter, reduce, and collect.",
                        "When can parallel streams hurt performance?",
                        "How do you debug a stream pipeline?",
                        "What is the difference between findFirst and findAny?",
                        "How do collectors like groupingBy and partitioningBy work?",
                        "What side effects should be avoided inside stream operations?"
                )),
                Map.entry("multithreading-and-concurrency", List.of(
                        "Explain the Java thread lifecycle.",
                        "Compare synchronized methods and synchronized blocks.",
                        "What does volatile guarantee and what does it not guarantee?",
                        "Compare Runnable, Callable, Future, and CompletableFuture.",
                        "What is a race condition and how can it be prevented?",
                        "Explain deadlock and how to reduce the risk.",
                        "When would you use ReentrantLock instead of synchronized?",
                        "What is the ExecutorService and why is it preferred over manual threads?",
                        "Explain thread-safe collections in Java.",
                        "What are atomic classes and CAS?",
                        "How does wait/notify differ from sleep?",
                        "What is the difference between concurrency and parallelism?"
                )),
                Map.entry("jvm-memory-gc", List.of(
                        "Explain heap, stack, and metaspace.",
                        "How does garbage collection decide an object is unreachable?",
                        "What are GC roots?",
                        "What can cause a memory leak in Java despite garbage collection?",
                        "Compare minor GC and major/full GC conceptually.",
                        "How would you investigate OutOfMemoryError?",
                        "What is the difference between stack overflow and heap exhaustion?",
                        "How do strong, soft, weak, and phantom references differ?"
                )),
                Map.entry("io-serialization-date-time", List.of(
                        "Compare byte streams and character streams.",
                        "What is Java serialization and why can it be risky?",
                        "How does NIO differ from classic IO?",
                        "Why is java.time preferred over Date and Calendar?"
                ))
        );
    }

    private List<ImportedQuestionSeed> importedVietnameseQuestions() {
        ClassPathResource resource = new ClassPathResource("data/java_core_interview_questions_vi.csv");
        List<ImportedQuestionSeed> rows = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)
        )) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }

                int delimiterIndex = line.indexOf('|');
                if (delimiterIndex < 0) {
                    continue;
                }

                String question = line.substring(0, delimiterIndex).trim();
                String answer = line.substring(delimiterIndex + 1).trim();
                if (!question.isEmpty() && !answer.isEmpty()) {
                    rows.add(new ImportedQuestionSeed(question, answer));
                }
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load Vietnamese Java Core flashcards", exception);
        }

        return rows;
    }

    private record TopicSeed(
            int sortOrder,
            String slug,
            String title,
            List<String> concepts,
            List<String> prompts
    ) {
    }

    private record ImportedQuestionSeed(String question, String answer) {
    }
}
