import React, { useEffect, useRef, useState } from "react";
import { TaskGraphData, TaskGraphNode } from "../types";
import { useTaskD3Simulation } from "../hooks/useTaskD3Simulation";

interface TaskKGRendererProps {
    data: TaskGraphData;
    loading: boolean;
    onNodeClick?: (node: TaskGraphNode) => void;
}

export function TaskKGRenderer({ data, loading, onNodeClick }: TaskKGRendererProps) {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const wrapperElement = wrapperRef.current;
        if (!wrapperElement) return;

        const observer = new ResizeObserver(() => {
            const width = wrapperElement.clientWidth;
            const height = Math.max(560, Math.min(900, wrapperElement.clientHeight || 720));
            setDimensions({ width, height });
        });

        observer.observe(wrapperElement);
        // Initial setup
        setDimensions({
            width: wrapperElement.clientWidth,
            height: Math.max(560, Math.min(900, wrapperElement.clientHeight || 720))
        });

        return () => observer.disconnect();
    }, []);

    useTaskD3Simulation(svgRef, {
        data,
        width: dimensions.width,
        height: dimensions.height,
        onNodeClick
    });

    const isEmpty = data.nodes.length === 0;

    return (
        <div ref={wrapperRef} className="relative h-[72vh] min-h-[560px] w-full">
            {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm dark:bg-neutral-950/70">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-blue-600 dark:border-neutral-700 dark:border-t-blue-500" />
                </div>
            )}

            {isEmpty && !loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 px-6 text-center backdrop-blur-sm dark:bg-neutral-950/70">
                    <p className="font-serif text-sm text-neutral-500 dark:text-neutral-400">
                        Không có dữ liệu công việc để hiển thị đồ thị.
                    </p>
                </div>
            )}

            <svg ref={svgRef} className="h-full w-full outline-none" role="img" aria-label="Task Knowledge Graph" />
        </div>
    );
}
