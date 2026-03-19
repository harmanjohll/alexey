---
name: ux-review
description: Review a page or component for UX quality, accessibility, and design consistency against the Nordic-Japandi design system. Use when checking work before committing.
---

## UX Review Checklist

Read the target file and evaluate against these criteria. Be specific — cite line numbers.

### 1. Visual Consistency
- Are all colours from the design system CSS variables?
- Is typography using the correct font stack (Instrument Serif / DM Sans / JetBrains Mono)?
- Are border-radius values consistent (2px for cards)?
- Is spacing generous and consistent (no cramped sections)?

### 2. Information Hierarchy
- Can a user scan the page and understand its structure in 3 seconds?
- Are step numbers understated (chapter markers, not badges)?
- Is the most important content (hypothesis, simulation, results) visually prioritised?
- Are secondary elements (controls, labels, captions) appropriately de-emphasised?

### 3. Interaction Quality
- Do all interactive elements have visible hover/focus states?
- Are disabled states clearly communicated?
- Is the hypothesis lock → simulation unlock flow clear and intuitive?
- Are transitions smooth (200ms ease, no jarring changes)?

### 4. Accessibility
- Colour contrast: minimum 4.5:1 for body text, 3:1 for large text
- All images/canvas have appropriate alt text or aria-label
- Form inputs have associated labels
- Focus order is logical (tab through the page)
- Touch targets minimum 44px on mobile

### 5. Responsive Design
- Does the layout stack gracefully at 320px width?
- Are canvas simulations full-width on mobile with maintained aspect ratio?
- Is padding sufficient on small screens (no content touching edges)?
- Are font sizes readable on mobile without zooming?

### 6. Japandi Principles
- **Ma (emptiness)**: Is there enough whitespace? Does content breathe?
- **Lagom (just enough)**: Is every element earning its place? Remove anything decorative-only.
- **Craft**: Are details precise? Consistent padding, aligned elements, clean typography?

### Output Format
Rate each category: PASS / NEEDS WORK / FAIL
For NEEDS WORK and FAIL, provide specific line numbers and suggested fixes.
End with a summary: ready to ship, or list the 1-3 most impactful changes needed.
