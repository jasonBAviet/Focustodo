import React from "react";

interface TaskKGToolbarProps {
    depth: number;
    setDepth: (val: number) => void;
    totalNodes: number;
    totalLinks: number;
}

export function TaskKGToolbar({ depth, setDepth, totalNodes, totalLinks }: TaskKGToolbarProps) {
    return (
        <div className="flex flex-col gap-4 border-b border-neutral-200/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800/70">
            <div>
                <p className="font-serif text-base font-semibold text-neutral-900 dark:text-white">
                    Knowledge Graph (Đồ thị Tasks)
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Cấu trúc: Thư mục ➔ Dự án ➔ Task ➔ Subtask
                </p>
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-neutral-200/60 bg-neutral-50/50 p-3 dark:border-neutral-800/60 dark:bg-neutral-900/50 min-w-[260px]">
                <div className="flex justify-between text-xs font-medium">
                    <span className="text-neutral-500 dark:text-neutral-400">Độ sâu phân cấp (Depth):</span>
                    <span className="text-blue-600 dark:text-blue-400">
                        {depth === 1 ? "Dự án" : depth === 2 ? "Task" : "Subtask"} (Level {depth})
                    </span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    value={depth}
                    onChange={(e) => setDepth(parseInt(e.target.value, 10))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-neutral-200 dark:bg-neutral-700 accent-blue-600 dark:accent-blue-500"
                />
                <div className="flex justify-between text-[9px] text-neutral-400 dark:text-neutral-500">
                    <span>1 (Dự án)</span>
                    <span>2 (Task)</span>
                    <span>3 (Subtask)</span>
                </div>
            </div>
        </div>
    );
}
