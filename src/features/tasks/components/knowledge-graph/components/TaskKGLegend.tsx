import type { TaskNodeType } from "../types";

interface LegendItem {
    type: TaskNodeType;
    label: string;
    color: string;
    count: number;
}

interface TaskKGLegendProps {
    items: LegendItem[];
    totalNodes: number;
    totalLinks: number;
}

export function TaskKGLegend({ items, totalNodes, totalLinks }: TaskKGLegendProps) {
    return (
        <div className="flex flex-col gap-y-2 border-b border-neutral-200/70 px-5 py-3 text-[10px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 dark:border-neutral-800/70">
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {items.map((item) => (
                    <div key={item.type} className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>
                            {item.label} ({item.count})
                        </span>
                    </div>
                ))}
            </div>
            <div className="mt-1 border-t border-neutral-100 pt-1.5 font-medium text-neutral-500 sm:mt-0 sm:border-0 sm:pt-0 sm:ml-auto dark:border-neutral-800 dark:text-neutral-400">
                Tổng số: {totalNodes} node · {totalLinks} liên kết
            </div>
        </div>
    );
}
