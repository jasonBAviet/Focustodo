// ============================================================
// Inject CSS vào <head> đúng MỘT lần cho mỗi `id`, thay cho việc render <style>
// trong JSX — vốn nhân bản tag style theo số instance (vd: TaskItem render N lần
// -> N tag <style> trùng nhau). Đây là cách dọn nợ kỹ thuật "duplicate style
// injection" nêu trong TECH_DEBT.md, blast radius nhỏ (không cần CSS Modules toàn bộ).
//
// Inject ĐỒNG BỘ trong render (idempotent qua Set) -> style có mặt TRƯỚC khi
// browser paint, tránh FOUC. Style sống suốt vòng đời app (không gỡ) vì các loại
// component là cố định — phù hợp với app này.
//
// Cách dùng:
//   const CSS = `.foo { ... }`;            // hằng số module-level
//   useInjectedStyle('foo', CSS);          // gọi trong component
//   // bỏ <style>{CSS}</style> khỏi JSX
// ============================================================
const injected = new Set<string>();

export function useInjectedStyle(id: string, css: string): void {
  if (typeof document === 'undefined' || injected.has(id)) return;
  injected.add(id);
  const el = document.createElement('style');
  el.setAttribute('data-injected-style', id);
  el.textContent = css;
  document.head.appendChild(el);
}
