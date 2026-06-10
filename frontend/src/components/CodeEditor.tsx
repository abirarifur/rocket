'use client';

import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { xml } from '@codemirror/lang-xml';
import { html } from '@codemirror/lang-html';

type Lang = 'text' | 'json' | 'xml' | 'html' | 'javascript';

function extensions(lang: Lang) {
  switch (lang) {
    case 'json':
      return [json()];
    case 'javascript':
      return [javascript()];
    case 'xml':
      return [xml()];
    case 'html':
      return [html()];
    default:
      return [];
  }
}

/** CodeMirror-backed editor with language syntax highlighting. */
export function CodeEditor({
  value,
  onChange,
  language = 'text',
  readOnly = false,
  minHeight = '180px',
  placeholder,
}: {
  value: string;
  onChange?: (v: string) => void;
  language?: Lang;
  readOnly?: boolean;
  minHeight?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
      <CodeMirror
        value={value}
        theme="dark"
        editable={!readOnly}
        readOnly={readOnly}
        minHeight={minHeight}
        maxHeight="50vh"
        extensions={extensions(language)}
        onChange={onChange}
        placeholder={placeholder}
        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: !readOnly }}
      />
    </div>
  );
}
