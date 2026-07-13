import { PencilIcon } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

const ISSUE_MARKDOWN_COMPONENTS: Components = {
  a({ node: _node, ...props }) {
    return <a {...props} rel="noreferrer" target="_blank" />;
  },
};

export function IssueMarkdownEditor({
  className,
  id,
  onChange,
  placeholder,
  value,
}: {
  readonly className?: string;
  readonly id: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly value: string;
}) {
  const [editing, setEditing] = useState(() => value.trim().length === 0);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const focusEditorAfterRenderRef = useRef(false);

  useEffect(() => {
    if (!editing || !focusEditorAfterRenderRef.current) return;
    focusEditorAfterRenderRef.current = false;
    editorRef.current?.focus();
  }, [editing]);

  const startEditing = () => {
    focusEditorAfterRenderRef.current = true;
    setEditing(true);
  };

  const handlePreviewClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest("a, button, input")) return;
    startEditing();
  };

  if (editing) {
    return (
      <Textarea
        aria-label="Issue description in Markdown"
        className={cn(
          "min-h-48 resize-none rounded-none border-0 bg-transparent px-0 py-1 text-sm leading-relaxed shadow-none before:hidden [field-sizing:content] has-focus-visible:border-transparent has-focus-visible:ring-0",
          className,
        )}
        id={id}
        onBlur={() => setEditing(false)}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        ref={editorRef}
        unstyled
        value={value}
      />
    );
  }

  return (
    <div
      aria-label="Rendered issue description. Click to edit Markdown."
      aria-multiline="true"
      className={cn(
        "group relative min-h-48 cursor-text rounded-lg py-1 pe-10 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={handlePreviewClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          startEditing();
        }
      }}
      role="textbox"
      tabIndex={0}
    >
      {value.trim() ? (
        <div className="chat-markdown text-sm leading-relaxed text-foreground/85">
          <ReactMarkdown
            components={ISSUE_MARKDOWN_COMPONENTS}
            remarkPlugins={[remarkGfm, remarkBreaks]}
          >
            {value}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground/70">{placeholder}</p>
      )}
      <Button
        aria-label="Edit issue description Markdown"
        className="absolute end-0 top-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
        onClick={(event) => {
          event.stopPropagation();
          startEditing();
        }}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <PencilIcon />
      </Button>
    </div>
  );
}
