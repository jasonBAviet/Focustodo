interface TaskKGToolbarProps {
    depth: number;
    setDepth: (val: number) => void;
    showCompleted: boolean;
    setShowCompleted: (val: boolean) => void;
}

export function TaskKGToolbar({ depth, setDepth, showCompleted, setShowCompleted }: TaskKGToolbarProps) {
    return (
        <div className="flex flex-col gap-4 border-b border-neutral-200/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800/70">
            <div>
                <p className="font-serif text-base font-semibold text-neutral-900 dark:text-white">
                    Knowledge Graph (Đồ thị Tasks)
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Cấu trúc: Thư mục ➔ Dự án ➔ Nhãn ➔ Task ➔ Subtask
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-200 shadow-sm ${
                        showCompleted
                            ? "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                            : "border-neutral-200 bg-white text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    }`}
                >
                    <span className={`h-2 w-2 rounded-full transition-all duration-300 ${
                        showCompleted ? "bg-emerald-500 dark:bg-emerald-400 shadow-sm shadow-emerald-500" : "bg-neutral-400 dark:bg-neutral-500"
                    }`} />
                    <span>Hiện Task Đã Xong</span>
                </button>

                <div className="flex flex-col gap-1.5 rounded-xl border border-neutral-200/60 bg-neutral-50/50 p-2.5 dark:border-neutral-800/60 dark:bg-neutral-900/50 min-w-[200px] sm:min-w-[240px]">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-neutral-500 dark:text-neutral-400">Độ sâu phân cấp:</span>
                        <span className="text-blue-600 dark:text-blue-400">
                            {depth === 1 ? "Dự án" : depth === 2 ? "Nhãn & Task" : "Subtask"} (Cấp {depth})
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
                        <span>2 (Nhãn & Task)</span>
                        <span>3 (Subtask)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
