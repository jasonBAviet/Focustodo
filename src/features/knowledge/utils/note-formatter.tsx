// ============================================================
// FOCUS TO-DO - note-formatter.tsx
// Helper to parse notes with markdown bold/italic and highlight
// FPT project keywords: "Luận điểm chính", "Dẫn chứng", "Kết luận".
// ============================================================
import React from 'react';

/**
 * Parses inline styling for bold, italic, and specific project keywords
 * and maps them into React nodes with distinct highlight styles.
 */
function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // Capture bold (**), italic (*), and key phrases (case-insensitive, with accents)
  const regex = /(\*\*.*?\*\*|\*.*?\*|Luận điểm chính|Dẫn chứng|Kết luận|luận điểm chính|dẫn chứng|kết luận)/gi;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    // Bold parsing
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    // Italic parsing
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }

    // Specific Vietnamese highlight keywords
    const lowerPart = part.toLowerCase();
    if (lowerPart === 'luận điểm chính') {
      return (
        <span
          key={idx}
          style={{
            color: '#f4a261', // Amber/orange for main points
            background: 'rgba(244, 162, 97, 0.12)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-xs, 4px)',
            fontWeight: 'bold',
            border: '1px solid rgba(244, 162, 97, 0.25)',
            display: 'inline-block',
            margin: '0 2px',
          }}
        >
          {part}
        </span>
      );
    }
    if (lowerPart === 'dẫn chứng') {
      return (
        <span
          key={idx}
          style={{
            color: '#2ec4b6', // Teal/green for evidence
            background: 'rgba(46, 196, 182, 0.12)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-xs, 4px)',
            fontWeight: 'bold',
            border: '1px solid rgba(46, 196, 182, 0.25)',
            display: 'inline-block',
            margin: '0 2px',
          }}
        >
          {part}
        </span>
      );
    }
    if (lowerPart === 'kết luận') {
      return (
        <span
          key={idx}
          style={{
            color: '#4cc9f0', // Cyan/blue for conclusions
            background: 'rgba(76, 201, 240, 0.12)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-xs, 4px)',
            fontWeight: 'bold',
            border: '1px solid rgba(76, 201, 240, 0.25)',
            display: 'inline-block',
            margin: '0 2px',
          }}
        >
          {part}
        </span>
      );
    }

    // Plain text
    return part;
  });
}

/**
 * Main formatter function that splits note content by lines,
 * formats line-level structures (lists), and highlights keywords.
 */
export function formatNoteContent(noteText: string): React.ReactNode {
  if (!noteText) return null;

  const lines = noteText.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', lineBreak: 'anywhere' }}>
      {lines.map((line, idx) => {
        if (line.trim() === '') {
          return <div key={idx} style={{ height: '6px' }} />;
        }

        // Basic list parsing
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', paddingLeft: '12px' }}>
              <span>•</span>
              <div style={{ flex: 1 }}>{parseInline(line.substring(2))}</div>
            </div>
          );
        }

        return <div key={idx}>{parseInline(line)}</div>;
      })}
    </div>
  );
}
