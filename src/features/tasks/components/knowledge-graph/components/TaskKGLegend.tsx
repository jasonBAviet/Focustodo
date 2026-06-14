import React from "react";
import { TaskNodeType } from "../types";

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
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-neutral-200/70 px-5 py-3 text-[10px] dark:border-neutral-800/70">
            {items.map((item) => (
                <div key={item.type} className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>
                        {item.label} ({item.count})
                    </span>
                </div>
            ))}
            <div className="ml-auto font-medium text-neutral-500 dark:text-neutral-400">
                Tổng số: {totalNodes} node · {totalLinks} liên kết
            </div>
        </div>
    );
}
