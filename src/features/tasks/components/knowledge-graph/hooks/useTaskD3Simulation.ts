import { useEffect, useRef } from "react";
import { select } from "d3-selection";
import {
    forceCenter,
    forceCollide,
    forceLink,
    forceManyBody,
    forceSimulation,
    SimulationNodeDatum,
} from "d3-force";
import { drag } from "d3-drag";
import { zoom } from "d3-zoom";
import { TaskGraphData, TaskGraphNode, TaskNodeType } from "../types";

interface UseTaskD3SimulationProps {
    data: TaskGraphData;
    width: number;
    height: number;
    onNodeClick?: (node: TaskGraphNode) => void;
}

const TYPE_COLORS: Record<TaskNodeType, string> = {
    folder: "#1d4ed8",  // Xanh lam
    project: "#b45309", // Cam đậm
    task: "#15803d",    // Xanh lá
    subtask: "#6b7280", // Xám
};

function getNodeRadius(type: TaskNodeType, childrenCount: number = 0): number {
    const baseRadius = {
        folder: 20,
        project: 15,
        task: 10,
        subtask: 6,
    }[type];
    
    return baseRadius + Math.min(childrenCount, 5) * 1.5;
}

export function useTaskD3Simulation(
    svgRef: React.RefObject<SVGSVGElement | null>,
    { data, width, height, onNodeClick }: UseTaskD3SimulationProps
) {
    const isSimulationActive = useRef(false);

    useEffect(() => {
        if (!svgRef.current || data.nodes.length === 0 || width === 0 || height === 0) return;

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
            .attr("stroke-width", 1.5);

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
            .attr("r", (d) => getNodeRadius(d.type, d.childrenCount))
            .attr("fill", (d) => TYPE_COLORS[d.type])
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5);

        nodes
            .append("text")
            .text((d) => d.title)
            .attr("x", 0)
            .attr("y", (d) => getNodeRadius(d.type, d.childrenCount) + 12)
            .attr("text-anchor", "middle")
            .attr("font-size", (d) => (d.type === 'folder' || d.type === 'project' ? 12 : 10))
            .attr("font-weight", (d) => (d.type === 'folder' || d.type === 'project' ? "bold" : "normal"))
            .attr("fill", "currentColor")
            .attr("class", "select-none fill-neutral-700 dark:fill-neutral-200")
            // Thư mục và dự án hiển thị text luôn, task/subtask mờ đi trừ khi hover (tuỳ biến sau)
            .attr("opacity", (d) => (d.type === 'folder' || d.type === 'project' ? 1 : 0.7));

        nodes.append("title").text((d) => `${d.title} (${d.type})`);

        // 3. Forces
        const simulation = forceSimulation(data.nodes as SimulationNodeDatum[])
            .force(
                "link",
                forceLink(data.links)
                    .id((d: any) => d.id)
                    .distance((d: any) => {
                        // Khoảng cách tuỳ thuộc vào loại link
                        return 80;
                    })
                    .strength(1)
            )
            .force("charge", forceManyBody().strength(-300))
            .force("center", forceCenter(width / 2, height / 2))
            .force("collision", forceCollide().radius((d: any) => getNodeRadius(d.type, d.childrenCount) + 20));

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
