"use client"

import { type Editor } from "@tiptap/core"
import TextAlign from "@tiptap/extension-text-align"
import { FontSize, TextStyle } from "@tiptap/extension-text-style"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Italic,
  List,
  ListOrdered,
  Moon,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Sun,
  Underline,
  Undo2,
} from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  minHeight?: string
  className?: string
}

const FONT_SIZES = [
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
]

const BLOCK_TYPES = [
  { label: "Paragraph", value: "paragraph" },
  { label: "H1", value: "heading-1" },
  { label: "H2", value: "heading-2" },
  { label: "H3", value: "heading-3" },
]

const THEME_CHANGE_EVENT = "ai-interview-theme-change"
type Theme = "light" | "dark"

export function RichTextEditor({
  value,
  onChange,
  minHeight = "min-h-32",
  className,
}: RichTextEditorProps) {
  const [, setEditorTick] = useState(0)
  const [appTheme, setAppTheme] = useState<Theme>("light")
  const [manualTheme, setManualTheme] = useState<Theme | null>(null)
  const theme = manualTheme ?? appTheme
  const isDark = theme === "dark"
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        codeBlock: false,
        heading: {
          levels: [1, 2, 3],
        },
        horizontalRule: false,
      }),
      TextStyle,
      FontSize,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: editorValueToHtml(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "w-full max-w-none whitespace-pre-wrap break-words text-base leading-7 outline-none",
          minHeight
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(cleanEditorHtml(editor.getHTML()))
      setEditorTick((tick) => tick + 1)
    },
    onSelectionUpdate: () => {
      setEditorTick((tick) => tick + 1)
    },
  })

  useEffect(() => {
    if (!editor || editor.isFocused) return

    const currentHtml = cleanEditorHtml(editor.getHTML())
    const nextHtml = cleanEditorHtml(editorValueToHtml(value))
    if (currentHtml !== nextHtml) {
      editor.commands.setContent(nextHtml || "<p></p>", { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    const syncWithAppTheme = () => {
      setAppTheme(document.documentElement.classList.contains("dark") ? "dark" : "light")
    }

    syncWithAppTheme()
    window.addEventListener(THEME_CHANGE_EVENT, syncWithAppTheme)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncWithAppTheme)
  }, [])

  const toggleEditorTheme = () => {
    setManualTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-colors focus-within:border-foreground/25",
        isDark
          ? "border-slate-700/80 bg-[#1b2028] text-slate-100 shadow-[0_22px_70px_rgba(0,0,0,0.26)]"
          : "border-slate-200 bg-white/90 text-slate-950",
        "[&_.tiptap_h1]:my-3 [&_.tiptap_h1]:text-3xl [&_.tiptap_h1]:font-semibold",
        "[&_.tiptap_h2]:my-3 [&_.tiptap_h2]:text-2xl [&_.tiptap_h2]:font-semibold",
        "[&_.tiptap_h3]:my-2 [&_.tiptap_h3]:text-xl [&_.tiptap_h3]:font-semibold",
        "[&_.tiptap_p]:my-2 [&_.tiptap_ul]:my-3 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6",
        "[&_.tiptap_ol]:my-3 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6",
        "[&_.tiptap_code]:rounded [&_.tiptap_code]:px-1.5 [&_.tiptap_code]:py-0.5 [&_.tiptap_code]:font-mono [&_.tiptap_code]:text-sm",
        isDark ? "[&_.tiptap_code]:bg-[#131821]" : "[&_.tiptap_code]:bg-slate-100",
        className
      )}
    >
      <EditorToolbar
        editor={editor}
        theme={theme}
        onToggleTheme={toggleEditorTheme}
      />
      <div
        className={cn(
          "min-h-40 px-8 py-8 transition-colors md:px-12",
          isDark ? "bg-[#1b2028] text-slate-100" : "bg-white text-slate-950"
        )}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function EditorToolbar({
  editor,
  theme,
  onToggleTheme,
}: {
  editor: Editor | null
  theme: Theme
  onToggleTheme: () => void
}) {
  const isDark = theme === "dark"
  const currentFontSize = editor?.getAttributes("textStyle").fontSize as string | undefined
  const currentBlockType = getCurrentBlockType(editor)

  return (
    <div
      className={cn(
        "border-b px-3 py-2 backdrop-blur-xl transition-colors",
        isDark ? "border-slate-700/80 bg-[#222832]/95" : "border-slate-200 bg-white/95"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <select
            aria-label="Block type"
            title="Block type"
            value={currentBlockType}
            disabled={!editor}
            onChange={(event) => {
              if (!editor) return
              setBlockType(editor, event.target.value)
            }}
            className={selectClassName(isDark)}
          >
            {BLOCK_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Font size"
            title="Font size"
            value={currentFontSize ?? ""}
            disabled={!editor}
            onChange={(event) => {
              const size = event.target.value
              if (!editor) return

              if (size) {
                editor.chain().focus().setFontSize(size).run()
              } else {
                editor.chain().focus().unsetFontSize().run()
              }
            }}
            className={selectClassName(isDark)}
          >
            <option value="">Size</option>
            {FONT_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>

      <ToolbarButton
        title="Bold"
        dark={isDark}
        active={editor?.isActive("bold")}
        disabled={!editor || !editor.can().chain().focus().toggleBold().run()}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        dark={isDark}
        active={editor?.isActive("italic")}
        disabled={!editor || !editor.can().chain().focus().toggleItalic().run()}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Underline"
        dark={isDark}
        active={editor?.isActive("underline")}
        disabled={!editor || !editor.can().chain().focus().toggleUnderline().run()}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      >
        <Underline className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Strikethrough"
        dark={isDark}
        active={editor?.isActive("strike")}
        disabled={!editor || !editor.can().chain().focus().toggleStrike().run()}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Inline code"
        dark={isDark}
        active={editor?.isActive("code")}
        disabled={!editor || !editor.can().chain().focus().toggleCode().run()}
        onClick={() => editor?.chain().focus().toggleCode().run()}
      >
        <Code2 className="size-4" />
      </ToolbarButton>

      <ToolbarDivider dark={isDark} />

      <ToolbarButton
        title="Bullet list"
        dark={isDark}
        active={editor?.isActive("bulletList")}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        dark={isDark}
        active={editor?.isActive("orderedList")}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>

      <ToolbarDivider dark={isDark} />

      <ToolbarButton
        title="Align left"
        dark={isDark}
        active={editor?.isActive({ textAlign: "left" })}
        disabled={!editor}
        onClick={() => editor?.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Align center"
        dark={isDark}
        active={editor?.isActive({ textAlign: "center" })}
        disabled={!editor}
        onClick={() => editor?.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Align right"
        dark={isDark}
        active={editor?.isActive({ textAlign: "right" })}
        disabled={!editor}
        onClick={() => editor?.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="size-4" />
      </ToolbarButton>

      <ToolbarDivider dark={isDark} />

      <ToolbarButton
        title="Clear formatting"
        dark={isDark}
        disabled={!editor}
        onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().unsetFontSize().run()}
      >
        <RemoveFormatting className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Undo"
        dark={isDark}
        disabled={!editor || !editor.can().chain().focus().undo().run()}
        onClick={() => editor?.chain().focus().undo().run()}
      >
        <Undo2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Redo"
        dark={isDark}
        disabled={!editor || !editor.can().chain().focus().redo().run()}
        onClick={() => editor?.chain().focus().redo().run()}
      >
        <Redo2 className="size-4" />
      </ToolbarButton>
        </div>
        <button
          type="button"
          title={isDark ? "Switch editor to light mode" : "Switch editor to dark mode"}
          aria-label={isDark ? "Switch editor to light mode" : "Switch editor to dark mode"}
          onClick={onToggleTheme}
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            isDark
              ? "bg-slate-700 text-slate-100 hover:bg-slate-600"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          )}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>
    </div>
  )
}

function ToolbarButton({
  active,
  dark,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean; dark?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full border border-transparent transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-40",
        dark
          ? "text-slate-300 hover:bg-slate-700/80 hover:text-slate-50"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
        active && (dark ? "border-slate-600 bg-slate-700 text-slate-50 shadow-sm" : "border-slate-200 bg-white text-slate-950 shadow-sm"),
        className
      )}
      {...props}
    />
  )
}

function ToolbarDivider({ dark }: { dark?: boolean }) {
  return <div className={cn("mx-1 h-5 w-px", dark ? "bg-slate-600" : "bg-slate-200")} />
}

function selectClassName(dark: boolean) {
  return cn(
    "h-8 rounded-full border border-transparent px-3 text-xs font-medium outline-none transition-colors focus-visible:border-foreground/30 disabled:opacity-50",
    dark
      ? "bg-slate-700 text-slate-50 hover:bg-slate-600"
      : "bg-slate-100 text-slate-900 hover:bg-slate-200"
  )
}

function getCurrentBlockType(editor: Editor | null) {
  if (!editor) return "paragraph"
  if (editor.isActive("heading", { level: 1 })) return "heading-1"
  if (editor.isActive("heading", { level: 2 })) return "heading-2"
  if (editor.isActive("heading", { level: 3 })) return "heading-3"
  return "paragraph"
}

function setBlockType(editor: Editor, value: string) {
  if (value === "heading-1") {
    editor.chain().focus().toggleHeading({ level: 1 }).run()
    return
  }
  if (value === "heading-2") {
    editor.chain().focus().toggleHeading({ level: 2 }).run()
    return
  }
  if (value === "heading-3") {
    editor.chain().focus().toggleHeading({ level: 3 }).run()
    return
  }
  editor.chain().focus().setParagraph().run()
}

function editorValueToHtml(value: string) {
  const cleaned = value.replace(/\r\n?/g, "\n").trim()
  if (!cleaned) {
    return "<p></p>"
  }

  if (looksLikeHtml(cleaned)) {
    return cleaned
  }

  return cleaned
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("")
}

function cleanEditorHtml(value: string) {
  const cleaned = value
    .replace(/\u00A0/g, " ")
    .replace(/ data-[^=]+="[^"]*"/g, "")
    .replace(/\s+$/g, "")
    .trim()

  if (cleaned === "<p></p>" || cleaned === "<p><br></p>") {
    return ""
  }

  return cleaned
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
