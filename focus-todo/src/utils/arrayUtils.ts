export function toggleArrayItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item)
    ? arr.filter((i) => i !== item)
    : [...arr, item];
}
