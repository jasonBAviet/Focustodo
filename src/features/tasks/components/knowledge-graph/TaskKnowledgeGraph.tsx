"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { TaskGraphData, TaskGraphNode, TaskNodeType } from "./types";
import { TaskKGToolbar } from "./components/TaskKGToolbar";
import { TaskKGLegend } from "./components/TaskKGLegend";
import { TaskKGRenderer } from "./components/TaskKGRenderer";
import { useAuth } from "@/features/auth/AuthContext";
import { useTaskContext } from "@/features/tasks/TaskContext";
import { getApiBaseUrl } from "@/utils/capacitorConfig";

export function TaskKnowledgeGraph() {
    // Độ sâu hiển thị: 1: Chỉ Folder/Project, 2: Tới Task, 3: Tới Subtask
    const [depth, setDepth] = useState<number>(3);
    const [showCompleted, setShowCompleted] = useState<boolean>(false);
    const [graphData, setGraphData] = useState<TaskGraphData>({ nodes: [], links: [] });
    const [loading, setLoading] = useState<boolean>(true);

    const { token } = useAuth();
    const {
        activeView,
        activeProjectId,
        activeFolderId,
        setSelectedTaskId,
        setActiveProjectId,
        setActiveFolderId,
        setActiveView,
    } = useTaskContext();

    // Fetch dữ liệu từ API dựa theo bộ lọc ngữ cảnh hiện tại
    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        async function fetchGraphData() {
            try {
                const params = new URLSearchParams();
                if (activeProjectId) params.append('projectId', activeProjectId);
                if (activeFolderId) params.append('folderId', activeFolderId);

                if (activeView === 'completed') {
                    params.append('completed', 'true');
                } else if (activeView === 'high-priority') {
                    params.append('priority', 'high');
                } else if (activeView === 'medium-priority') {
                    params.append('priority', 'medium');
                } else if (activeView === 'low-priority') {
                    params.append('priority', 'low');
                }

                const today = new Date();
                const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (activeView === 'today') {
                    params.append('dueDate', fmtDate(today));
                } else if (activeView === 'tomorrow') {
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);
                    params.append('dueDate', fmtDate(tomorrow));
                }

                const backendUrl = getApiBaseUrl();
                const qs = params.toString() ? `?${params.toString()}` : '';
                const res = await fetch(`${backendUrl}/api/tasks/kg${qs}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });

                if (!res.ok) throw new Error("Lỗi tải đồ thị");
                const data = await res.json();

                if (isMounted) {
                    setGraphData(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchGraphData();

        return () => {
            isMounted = false;
        };
    }, [activeView, activeProjectId, activeFolderId, token]);

    // Lọc data theo Depth chọn trên Toolbar và Trạng thái hoàn thành (showCompleted)
    const filteredData = useMemo(() => {
        if (!graphData || graphData.nodes.length === 0) return { nodes: [], links: [] };

        const allowedTypes = new Set<TaskNodeType>(["folder"]);
        if (depth >= 1) allowedTypes.add("project");
        if (depth >= 2) {
            allowedTypes.add("tag");
            allowedTypes.add("task");
        }
        if (depth >= 3) allowedTypes.add("subtask");

        // Lọc theo loại và trạng thái hoàn thành
        let filteredNodes = graphData.nodes.filter(n => {
            if (!allowedTypes.has(n.type)) return false;
            // Nếu không hiển thị task hoàn thành, loại bỏ task/subtask hoàn thành
            if (!showCompleted && (n.type === "task" || n.type === "subtask") && n.isCompleted) {
                return false;
            }
            return true;
        });

        // Bảo vệ chống dangling subtask (nếu task cha bị lọc do hoàn thành)
        const nodeIds = new Set(filteredNodes.map(n => n.id));
        filteredNodes = filteredNodes.filter(n => {
            if (n.type === "subtask" && n.parentId && !nodeIds.has(n.parentId)) {
                return false;
            }
            return true;
        });

        const updatedNodeIds = new Set(filteredNodes.map(n => n.id));
        const filteredLinks = graphData.links.filter(l => {
            const sId = typeof l.source === "object" ? (l.source as any).id : l.source;
            const tId = typeof l.target === "object" ? (l.target as any).id : l.target;
            return updatedNodeIds.has(sId) && updatedNodeIds.has(tId);
        });

        // Tạo deep copy cho D3 tránh thay đổi state React khi chạy force simulation
        return {
            nodes: filteredNodes.map(n => ({ ...n })),
            links: filteredLinks.map(l => ({ ...l }))
        };
    }, [graphData, depth, showCompleted]);

    // Tính toán số lượng từng loại node để render Legend
    const legendItems = useMemo(() => {
        const counts = { folder: 0, project: 0, tag: 0, task: 0, subtask: 0 };
        filteredData.nodes.forEach(n => {
            if (counts[n.type] !== undefined) {
                counts[n.type]++;
            }
        });

        return [
            { type: "folder" as TaskNodeType, label: "Thư mục", color: "#1d4ed8", count: counts.folder },
            { type: "project" as TaskNodeType, label: "Dự án", color: "#b45309", count: counts.project },
            { type: "tag" as TaskNodeType, label: "Nhãn (Tag)", color: "#8b5cf6", count: counts.tag },
            { type: "task" as TaskNodeType, label: "Công việc (Task)", color: "#15803d", count: counts.task },
            { type: "subtask" as TaskNodeType, label: "Việc nhỏ (Subtask)", color: "#6b7280", count: counts.subtask },
        ].filter(item => item.count > 0);
    }, [filteredData.nodes]);

    // Xử lý sự kiện click node để cập nhật UI
    const handleNodeClick = useCallback((node: TaskGraphNode) => {
        if (node.type === "task") {
            setSelectedTaskId(node.id);
        } else if (node.type === "project") {
            setActiveProjectId(node.id);
            setActiveView("project");
        } else if (node.type === "folder") {
            setActiveFolderId(node.id);
            setActiveView("folder");
        }
    }, [setSelectedTaskId, setActiveProjectId, setActiveFolderId, setActiveView]);

    return (
        <div className="overflow-hidden rounded-3xl border border-neutral-200/70 bg-white/90 shadow-sm backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/70">
            <TaskKGToolbar
                depth={depth}
                setDepth={setDepth}
                showCompleted={showCompleted}
                setShowCompleted={setShowCompleted}
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
