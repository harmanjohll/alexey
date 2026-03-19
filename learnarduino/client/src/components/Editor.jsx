import MonacoEditor from '@monaco-editor/react';

const ARDUINO_KEYWORDS = [
  'setup', 'loop', 'pinMode', 'digitalWrite', 'digitalRead',
  'analogRead', 'analogWrite', 'delay', 'delayMicroseconds',
  'millis', 'micros', 'Serial', 'HIGH', 'LOW', 'INPUT', 'OUTPUT',
  'INPUT_PULLUP', 'LED_BUILTIN', 'true', 'false',
];

export default function Editor({ code, onChange }) {
  const handleMount = (editor, monaco) => {
    // Register Arduino completions
    monaco.languages.registerCompletionItemProvider('cpp', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const suggestions = ARDUINO_KEYWORDS.map(kw => ({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range,
        }));

        // Add snippet completions
        suggestions.push({
          label: 'setup',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'void setup() {\n  ${1}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Arduino setup function',
          range,
        });
        suggestions.push({
          label: 'loop',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'void loop() {\n  ${1}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Arduino loop function',
          range,
        });

        return { suggestions };
      },
    });

    // Custom dark theme
    monaco.editor.defineTheme('arduinolab', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '58a6ff' },
        { token: 'type', foreground: '3fb950' },
        { token: 'string', foreground: 'f0883e' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#e6edf3',
        'editor.lineHighlightBackground': '#161b2240',
        'editorLineNumber.foreground': '#30363d',
        'editorLineNumber.activeForeground': '#8b949e',
        'editor.selectionBackground': '#58a6ff30',
        'editorCursor.foreground': '#58a6ff',
      },
    });
    monaco.editor.setTheme('arduinolab');
  };

  return (
    <MonacoEditor
      height="100%"
      language="cpp"
      value={code}
      onChange={onChange}
      onMount={handleMount}
      options={{
        fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        renderLineHighlight: 'line',
        bracketPairColorization: { enabled: true },
        tabSize: 2,
        padding: { top: 8 },
      }}
    />
  );
}
