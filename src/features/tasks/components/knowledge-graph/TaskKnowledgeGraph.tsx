"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TaskGraphData, TaskGraphNode, TaskNodeType } from "./types";
import { TaskKGToolbar } from "./components/TaskKGToolbar";
import { TaskKGLegend } from "./components/TaskKGLegend";
import { TaskKGRenderer } from "./components/TaskKGRenderer";

export function TaskKnowledgeGraph() {
    // Độ sâu hiển thị: 1: Chỉ Folder/Project, 2: Tới Task, 3: Tới Subtask
    const [depth, setDepth] = useState<number>(3);
    const [graphData, setGraphData] = useState<TaskGraphData>({ nodes: [], links: [] });
    const [loading, setLoading] = useState<boolean>(true);

    // Mock data generation (Sẽ thay bằng call API thật sau)
    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        setTimeout(() => {
            if (!isMounted) return;

            const nodes: TaskGraphNode[] = [];
            const links: any[] = [];

            // 1 Folder
            nodes.push({ id: "f1", type: "folder", title: "Công việc công ty", childrenCount: 2 });
            
            // 2 Projects
            nodes.push({ id: "p1", type: "project", title: "Dự án Website", parentId: "f1", childrenCount: 3 });
            nodes.push({ id: "p2", type: "project", title: "Dự án Mobile App", parentId: "f1", childrenCount: 2 });
            links.push({ source: "f1", target: "p1", relationType: "parent-child" });
            links.push({ source: "f1", target: "p2", relationType: "parent-child" });

            // Tasks cho Website (p1)
            nodes.push({ id: "t1", type: "task", title: "Thiết kế UI/UX", parentId: "p1", childrenCount: 2 });
            nodes.push({ id: "t2", type: "task", title: "Lập trình Backend", parentId: "p1", childrenCount: 0 });
            nodes.push({ id: "t3", type: "task", title: "Tích hợp Knowledge Graph", parentId: "p1", childrenCount: 3 });
            links.push({ source: "p1", target: "t1", relationType: "parent-child" });
            links.push({ source: "p1", target: "t2", relationType: "parent-child" });
            links.push({ source: "p1", target: "t3", relationType: "parent-child" });

            // Tasks cho Mobile (p2)
            nodes.push({ id: "t4", type: "task", title: "Setup React Native", parentId: "p2", childrenCount: 0 });
            nodes.push({ id: "t5", type: "task", title: "Build màn Login", parentId: "p2", childrenCount: 1 });
            links.push({ source: "p2", target: "t4", relationType: "parent-child" });
            links.push({ source: "p2", target: "t5", relationType: "parent-child" });

            // Subtasks
            nodes.push({ id: "st1", type: "subtask", title: "Vẽ Wireframe", parentId: "t1" });
            nodes.push({ id: "st2", type: "subtask", title: "Thiết kế Figma", parentId: "t1" });
            links.push({ source: "t1", target: "st1", relationType: "parent-child" });
            links.push({ source: "t1", target: "st2", relationType: "parent-child" });

            nodes.push({ id: "st3", type: "subtask", title: "Phân rã Component", parentId: "t3" });
            nodes.push({ id: "st4", type: "subtask", title: "Viết custom hook D3", parentId: "t3" });
            nodes.push({ id: "st5", type: "subtask", title: "Lắp ráp giao diện", parentId: "t3" });
            links.push({ source: "t3", target: "st3", relationType: "parent-child" });
            links.push({ source: "t3", target: "st4", relationType: "parent-child" });
            links.push({ source: "t3", target: "st5", relationType: "parent-child" });

            nodes.push({ id: "st6", type: "subtask", title: "Tích hợp Firebase Auth", parentId: "t5" });
            links.push({ source: "t5", target: "st6", relationType: "parent-child" });

            setGraphData({ nodes, links });
            setLoading(false);
        }, 600); // Giả lập độ trễ mạng

        return () => {
            isMounted = false;
        };
    }, []);

    // Lọc data theo Depth
    const filteredData = useMemo(() => {
        if (!graphData || graphData.nodes.length === 0) return { nodes: [], links: [] };

        const allowedTypes = new Set<TaskNodeType>(["folder"]);
        if (depth >= 1) allowedTypes.add("project");
        if (depth >= 2) allowedTypes.add("task");
        if (depth >= 3) allowedTypes.add("subtask");

        const filteredNodes = graphData.nodes.filter(n => allowedTypes.has(n.type));
        const nodeIds = new Set(filteredNodes.map(n => n.id));

        const filteredLinks = graphData.links.filter(l => {
            const sId = typeof l.source === "object" ? l.source.id : l.source;
            const tId = typeof l.target === "object" ? l.target.id : l.target;
            return nodeIds.has(sId) && nodeIds.has(tId);
        });

        // Tạo deep copy cho D3 để không làm biến đổi state gốc khi D3 gán thuộc tính x, y, fx, fy
        return {
            nodes: filteredNodes.map(n => ({ ...n })),
            links: filteredLinks.map(l => ({ ...l }))
        };
    }, [graphData, depth]);

    // Tính toán số lượng cho Legend
    const legendItems = useMemo(() => {
        const counts = { folder: 0, project: 0, task: 0, subtask: 0 };
        filteredData.nodes.forEach(n => {
            counts[n.type]++;
        });

        return [
            { type: "folder" as TaskNodeType, label: "Thư mục", color: "#1d4ed8", count: counts.folder },
            { type: "project" as TaskNodeType, label: "Dự án", color: "#b45309", count: counts.project },
            { type: "task" as TaskNodeType, label: "Công việc (Task)", color: "#15803d", count: counts.task },
            { type: "subtask" as TaskNodeType, label: "Việc nhỏ (Subtask)", color: "#6b7280", count: counts.subtask },
        ].filter(item => item.count > 0);
    }, [filteredData.nodes]);

    const handleNodeClick = (node: TaskGraphNode) => {
        console.log("Clicked node:", node);
        // Có thể dispatch event mở modal chi tiết task
    };

    return (
        <div className="overflow-hidden rounded-3xl border border-neutral-200/70 bg-white/90 shadow-sm backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/70">
            <TaskKGToolbar 
                depth={depth} 
                setDepth={setDepth} 
                totalNodes={filteredData.nodes.length} 
                totalLinks={filteredData.links.length} 
            />
            
            <TaskKGLegend 
                items={legendItems} 
                totalNodes={filteredData.nodes.length} 
                totalLinks={filteredData.links.length} 
            />

            <TaskKGRenderer 
                data={filteredData} 
                loading={loading} 
                onNodeClick={handleNodeClick} 
            />
        </div>
    );
}
