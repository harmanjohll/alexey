import { useMemo } from 'react';
import { marked } from 'marked';

export default function LessonPanel({ content }) {
  const html = useMemo(() => {
    if (!content) return '';
    marked.setOptions({
      gfm: true,
      breaks: true,
    });
    return marked.parse(content);
  }, [content]);

  return (
    <div className="p-5 overflow-y-auto h-full">
      <div
        className="lesson-content prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
        style={{
          '--tw-prose-body': '#e6edf3',
          '--tw-prose-headings': '#e6edf3',
          '--tw-prose-code': '#3fb950',
          '--tw-prose-links': '#58a6ff',
        }}
      />
      <style>{`
        .lesson-content h1 { font-family: 'JetBrains Mono', monospace; font-size: 1.4rem; font-weight: 700; margin-bottom: 1rem; color: #e6edf3; }
        .lesson-content h2 { font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #e6edf3; border-bottom: 1px solid #30363d; padding-bottom: 0.5rem; }
        .lesson-content h3 { font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; font-weight: 600; margin-top: 1.2rem; margin-bottom: 0.5rem; color: #3fb950; }
        .lesson-content p { font-size: 0.85rem; line-height: 1.7; color: #e6edf3; margin-bottom: 0.8rem; }
        .lesson-content code { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; background: #1c2128; padding: 0.15rem 0.4rem; border-radius: 3px; color: #3fb950; border: 1px solid #30363d; }
        .lesson-content pre { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 1rem; margin: 1rem 0; overflow-x: auto; }
        .lesson-content pre code { background: none; border: none; padding: 0; color: #e6edf3; }
        .lesson-content ul, .lesson-content ol { font-size: 0.85rem; padding-left: 1.5rem; margin-bottom: 0.8rem; color: #e6edf3; }
        .lesson-content li { margin-bottom: 0.3rem; line-height: 1.6; }
        .lesson-content blockquote { border-left: 3px solid #3fb950; padding-left: 1rem; margin: 1rem 0; color: #8b949e; font-style: italic; }
        .lesson-content strong { color: #e6edf3; font-weight: 600; }
        .lesson-content a { color: #58a6ff; text-decoration: underline; }
      `}</style>
    </div>
  );
}
