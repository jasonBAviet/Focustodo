# Technical Debt & Future Improvements

## CSS Architecture Migration

**Priority:** Medium  
**Effort:** 2-3 days

### Current State
- 20+ components inject inline `<style>` tags at render time
- Class names are globally-scoped plain strings (e.g. `.tc-divider`, `.datepicker-cell`)
- Risk of duplicate style injection on rapid re-renders
- Risk of silent name collisions between components

### Components Affected
- `TaskContextMenu.tsx` (154 lines of CSS)
- `DatePicker.tsx` (36 lines of CSS)
- `TagPicker.tsx`
- `Button.tsx`
- `Dialog.tsx`
- `ColorPicker.tsx`
- `Toggle.tsx`
- `ContextMenu.tsx`
- And 12+ others

### Recommended Solution

**Option A: CSS Modules (Recommended)**
- Convert each component's inline `<style>` to a `.module.css` file
- Import and use typed class names: `import styles from './Component.module.css'`
- Eliminates naming collisions, enables tree-shaking
- Example:
  ```tsx
  // DatePicker.tsx
  import styles from './DatePicker.module.css';
  
  // In JSX:
  <div className={styles.datepicker}>...</div>
  ```

**Option B: Consolidate to Global Stylesheet**
- Move all component styles to `src/styles/components.css`
- Organize by component section with clear comments
- Less scalable but simpler for small teams

**Option C: Styled Components / Emotion**
- Adopt CSS-in-JS library (styled-components, Emotion)
- Dynamic styling support, better scoping
- Higher runtime overhead

### Update (Phase 4): duplicate-injection risk addressed via `useInjectedStyle`

The most concrete risk above — **duplicate `<style>` injection on rapid re-renders**
— is now mitigated without a full CSS-Modules migration:

- New hook `src/hooks/useInjectedStyle.ts` injects a CSS string into `<head>`
  exactly once per `id` (reference-counted), instead of rendering a `<style>`
  tag inside JSX (which duplicates the tag per component instance).
- Migrated the highest-instance offenders to the hook:
  `TaskItem` (one style/​task → one total), `TaskDetail`'s `DetailRow`,
  and `TaskList`'s `StatCard`.
- Pattern to migrate the rest: move the component's CSS to a module-level
  `const X_CSS = \`…\``, call `useInjectedStyle('x', X_CSS)`, delete the
  `<style>{…}</style>` from JSX.

Name-collision risk (global class names) is unchanged — still pending the CSS
Modules migration below for a full fix.

### Action Items
1. [ ] Choose approach (A recommended) for the remaining name-collision risk
2. [ ] Set up tooling (if CSS Modules)
3. [x] Mitigate duplicate-injection risk (`useInjectedStyle` + migrate hot components)
4. [ ] Migrate remaining components to `useInjectedStyle` (or CSS Modules) in waves:
   - Wave 1: Common components (Button, Dialog, DatePicker)
   - Wave 2: Context components (TaskContextMenu, TagPicker)
   - Wave 3: Remaining components
5. [ ] Add ESLint rule to prevent new inline `<style>` in JSX

### References
- Current pattern: See `DatePicker.tsx` lines 99-236
- Related issue: Duplicate style injection risk, global naming collisions
