import { useEffect, useRef } from "react";
import { select } from "d3-selection";
import {
    forceCenter,
    forceCollide,
    forceLink,
    forceManyBody,
    forceSimulation,
    forceX,
    forceY,
} from "d3-force";
import type { SimulationNodeDatum } from "d3-force";
import { drag } from "d3-drag";
import { zoom } from "d3-zoom";
import type { TaskGraphData, TaskGraphNode, TaskNodeType } from "../types";

interface UseTaskD3SimulationProps {
    data: TaskGraphData;
    width: number;
    height: number;
    onNodeClick?: (node: TaskGraphNode) => void;
}

const TYPE_COLORS: Record<TaskNodeType, string> = {
    folder: "#1d4ed8",  // Xanh lam
    project: "#b45309", // Cam đậm
    tag: "#8b5cf6",     // Tím (Tag)
    task: "#15803d",    // Xanh lá
    subtask: "#6b7280", // Xám
};

function getNodeRadius(type: TaskNodeType, childrenCount: number = 0, isMobile: boolean = false): number {
    const baseRadius = {
        folder: isMobile ? 14 : 20,
        project: isMobile ? 11 : 15,
        tag: isMobile ? 9 : 12,
        task: isMobile ? 7 : 10,
        subtask: isMobile ? 4.5 : 6,
    }[type];
    
    return baseRadius + Math.min(childrenCount, 5) * (isMobile ? 1 : 1.5);
}

export function useTaskD3Simulation(
    svgRef: React.RefObject<SVGSVGElement | null>,
    { data, width, height, onNodeClick }: UseTaskD3SimulationProps
) {
    const isSimulationActive = useRef(false);

    useEffect(() => {
        if (!svgRef.current || data.nodes.length === 0 || width === 0 || height === 0) return;

        const isMobile = width < 640;

        const svg = select(svgRef.current);
        svg.selectAll("*").remove(); // Xoá render cũ
        svg.attr("viewBox", `0 0 ${width} ${height}`);

        const root = svg.append("g").attr("class", "kg-root");
        const linkLayer = root.append("g").attr("class", "kg-links");
        const nodeLayer = root.append("g").attr("class", "kg-nodes");

        // 1. Render Links
        const links = linkLayer
            .selectAll("line")
            .data(data.links)
            .join("line")
            .attr("stroke", "rgba(150, 150, 150, 0.4)")
            .attr("stroke-width", isMobile ? 1.0 : 1.5);

        // 2. Render Nodes
        const nodes = nodeLayer
            .selectAll("g")
            .data(data.nodes)
            .join("g")
            .attr("class", "kg-node")
            .style("cursor", "pointer")
            .on("click", (event, d) => {
                event.stopPropagation();
                if (onNodeClick) onNodeClick(d);
            });

        nodes
            .append("circle")
            .attr("r", (d) => getNodeRadius(d.type, d.childrenCount, isMobile))
            .attr("fill", (d) => {
                if (d.isCompleted) return "#d4d4d8"; // Muted gray cho task đã hoàn thành
                return d.meta?.color || TYPE_COLORS[d.type];
            })
            .attr("stroke", (d) => (d.isCompleted ? "#a3a3a3" : "#ffffff"))
            .attr("stroke-width", isMobile ? 1.0 : 1.5)
            .attr("stroke-dasharray", (d) => (d.isCompleted ? "3,3" : "none"));

        const textElements = nodes
            .append("text")
            .attr("x", 0)
            .attr("y", (d) => getNodeRadius(d.type, d.childrenCount, isMobile) + (isMobile ? 9 : 12))
            .attr("text-anchor", "middle")
            .attr("font-size", (d) => {
                const isLarge = d.type === 'folder' || d.type === 'project' || d.type === 'tag';
                if (isMobile) return isLarge ? 10 : 8;
                return isLarge ? 12 : 10;
            })
            .attr("font-weight", (d) => (d.type === 'folder' || d.type === 'project' || d.type === 'tag' ? "bold" : "normal"))
            .attr("fill", (d) => (d.isCompleted ? "#a3a3a3" : "currentColor"))
            .attr("class", "select-none fill-neutral-700 dark:fill-neutral-200")
            // Gạch ngang tiêu đề của công việc đã hoàn thành
            .attr("text-decoration", (d) => (d.isCompleted ? "line-through" : "none"))
            // Giảm độ đậm/đậm mờ cho các node đã hoàn thành
            .attr("opacity", (d) => {
                if (d.isCompleted) return 0.35;
                return (d.type === 'folder' || d.type === 'project' || d.type === 'tag' ? 1 : 0.7);
            });

        textElements.each(function(d: any) {
            const el = select(this);
            const title = d.title || "";
            const maxLength = isMobile ? 12 : 16; // Trên di động chữ ngắn hơn sẽ ngắt dòng
            
            if (title.length <= maxLength) {
                el.text(title);
            } else {
                // Tìm vị trí khoảng trắng gần giữa chuỗi nhất để ngắt dòng
                const mid = Math.floor(title.length / 2);
                let splitIdx = title.indexOf(" ", mid);
                if (splitIdx === -1) {
                    splitIdx = title.lastIndexOf(" ", mid);
                }
                if (splitIdx === -1) {
                    splitIdx = mid; // Ngắt đôi ở giữa nếu không có khoảng trắng
                }
                
                const line1 = title.substring(0, splitIdx).trim();
                const line2 = title.substring(splitIdx).trim();
                
                el.append("tspan")
                    .attr("x", 0)
                    .attr("dy", 0)
                    .text(line1);
                    
                el.append("tspan")
                    .attr("x", 0)
                    .attr("dy", isMobile ? 9 : 12) // Xuống dòng 9px trên mobile, 12px trên desktop
                    .text(line2);
            }
        });

        nodes.append("title").text((d) => `${d.title} (${d.type})`);

        // 3. Forces
        const simulation = forceSimulation(data.nodes as SimulationNodeDatum[])
            .force(
                "link",
                forceLink(data.links)
                    .id((d: any) => d.id)
                    .distance((d: any) => {
                        const sType = d.source?.type;
                        const tType = d.target?.type;
                        if (isMobile) {
                            if (sType === 'folder' || tType === 'folder') return 140;
                            if (sType === 'project' || tType === 'project') return 100;
                            if (sType === 'tag' || tType === 'tag') return 85;
                            return 65;
                        } else {
                            if (sType === 'folder' || tType === 'folder') return 280;
                            if (sType === 'project' || tType === 'project') return 180;
                            if (sType === 'tag' || tType === 'tag') return 150;
                            return 120;
                        }
                    })
                    .strength(1)
            )
            .force("charge", forceManyBody().strength(isMobile ? -250 : -900))
            .force("center", forceCenter(width / 2, height / 2).strength(isMobile ? 0.12 : 0.08))
            .force("collision", forceCollide().radius((d: any) => getNodeRadius(d.type, d.childrenCount, isMobile) + (isMobile ? 22 : 55)))
            .force("boundX", forceX(width / 2).strength(isMobile ? 0.08 : 0.05))
            .force("boundY", forceY(height / 2).strength(isMobile ? 0.08 : 0.05));

        // 4. Drag Behavior
        const dragBehavior = drag<SVGGElement, TaskGraphNode>()
            .on("start", (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });

        nodes.call(dragBehavior as any);

        // 5. Simulation Tick
        simulation.on("tick", () => {
            links
                .attr("x1", (d: any) => d.source.x)
                .attr("y1", (d: any) => d.source.y)
                .attr("x2", (d: any) => d.target.x)
                .attr("y2", (d: any) => d.target.y);

            nodes.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
        });

        // 6. Zoom Behavior
        const zoomBehavior = zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                root.attr("transform", event.transform.toString());
            });

        svg.call(zoomBehavior as any);

        isSimulationActive.current = true;

        return () => {
            simulation.stop();
            svg.on(".zoom", null);
            isSimulationActive.current = false;
        };
    }, [data, width, height, onNodeClick, svgRef]);

    return { isSimulationActive: isSimulationActive.current };
}
