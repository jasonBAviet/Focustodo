export type TaskNodeType = "folder" | "project" | "tag" | "task" | "subtask";

export interface TaskGraphNode {
    id: string;
    type: TaskNodeType;
    title: string;
    /** ID của Node cha để xác định liên kết, nếu có */
    parentId?: string | null;
    /** Trạng thái hoàn thành (dành cho task/subtask) */
    isCompleted?: boolean;
    /** Số lượng con trực tiếp (để tính toán kích thước/hiển thị) */
    childrenCount?: number;
    /** Dữ liệu mở rộng tuỳ chọn */
    meta?: any;
    // Thuộc tính do d3-force thêm vào
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
}

export interface TaskGraphLink {
    source: string | TaskGraphNode;
    target: string | TaskGraphNode;
    /** Loại quan hệ: 'parent-child', 'dependency', ... */
    relationType?: string;
}

export interface TaskGraphData {
    nodes: TaskGraphNode[];
    links: TaskGraphLink[];
}
