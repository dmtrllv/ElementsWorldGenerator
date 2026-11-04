
import { Editor } from "../../editor";
import { Workspace, WorkspaceLayout, WorkspaceManager, type SplitEdge, type WorkspaceType } from "../../editor/workspace";
import { RendererWorkspace } from "../../editor/workspaces/renderer";
import { RendererViewWorkspace } from "./workspaces/renderer";
import React, { useMemo, useRef, useState, type CSSProperties } from "react";
import { useObservable } from "../../reactive";
import { useEvent } from "../hooks/event";
import { MapPreview } from "./workspaces/map-preview";
import { MapPreviewWorkspace } from "../../editor/workspaces/map-preview";

import "./styles/workspace.scss";

type DropEdge = SplitEdge | "center";

interface SlidingState {
	isSliding: boolean;
	size: number;
	pos: number;
}

export const Workspaces = () => {
	const workspace = Editor.useModule(WorkspaceManager);

	useEvent("mouseup", () => {
		if (workspace.movingWorkspace)
			workspace.movingWorkspace = null;
	});

	return (
		<div id="workspace">
			<WorkspaceLayoutPanel layout={workspace.layout} isFirst />
		</div>
	);
};

const WorkspaceLayoutPanel = ({ layout: initialLayout, isFirst }: { layout: WorkspaceLayout, isFirst: boolean; }) => {
	const workspaces = Editor.useModule(WorkspaceManager);
	const layout = useObservable(initialLayout);

	const [slidingState, setSlidingState] = useState<SlidingState>({
		isSliding: false,
		size: 0,
		pos: 0
	});

	const [closestEdge, setClosestEdge] = useState<DropEdge>("center");

	const layoutRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	const style: CSSProperties = {
		minWidth: 50,
		minHeight: 50,
		flex: layout.size === "flex" ? "1 1 0" : `0 0 ${layout.size}px`
	};

	const onStartSlide = (e: React.MouseEvent<HTMLDivElement>) => {
		if (workspaces.movingWorkspace)
			return;

		const panel = layoutRef.current;

		if (!panel)
			return;

		const vertical = (layout.isLayout() ? layout.parent!.direction : layout.direction) === "y";

		setSlidingState({
			isSliding: true,
			size: vertical ? panel.clientHeight : panel.clientWidth,
			pos: vertical ? e.clientY : e.clientX
		});
	};

	useEvent("mousemove", (e) => {
		const dir = (layout.isLayout() ? layout.parent?.direction : layout.direction);
		if (!dir || !slidingState.isSliding || workspaces.movingWorkspace)
			return;

		const position = dir === "y" ? e.clientY : e.clientX;
		const delta = slidingState.pos - position;

		layout.size = Math.max(50, slidingState.size + delta);
	});

	useEvent("mouseup", () => {
		if (!slidingState.isSliding)
			return;

		setSlidingState({
			isSliding: false,
			size: 0,
			pos: 0
		});
	});

	const onPanelMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!workspaces.movingWorkspace || !panelRef.current)
			return;

		const rect = panelRef.current.getBoundingClientRect();

		const edges: Record<SplitEdge, number> = {
			top: Math.abs(e.clientY - rect.top),
			right: Math.abs(rect.right - e.clientX),
			bottom: Math.abs(rect.bottom - e.clientY),
			left: Math.abs(e.clientX - rect.left)
		};

		const [edge, distance] = Object.entries(edges).reduce(
			(a, b) => a[1] < b[1] ? a : b
		) as [SplitEdge, number];

		setClosestEdge(distance <= 30 ? edge : "center");
	};

	const resetMovedPanelSizes = (source: WorkspaceLayout | null, target: WorkspaceLayout, moved: Workspace) => {
		if (source && source !== target && source.children.length > 0)
			source.size = "flex";

		const destination = moved.layout;

		if (!destination)
			return;

		if (target === workspaces.layout && target.isLayout()) {
			for (const child of target.children)
				child.size = "flex";

			return;
		}

		target.size = "flex";
		destination.size = "flex";
	};

	const onPanelMouseUp = () => {
		const moving = workspaces.movingWorkspace;

		if (!moving || !layout.isWorkspace())
			return;

		const source = moving.layout;

		if (source === layout && closestEdge === "center") {
			layout.focus(moving);
			return;
		}

		if (closestEdge === "center") {
			layout.add(moving);

			if (source && source !== layout && source.children.length > 0)
				source.size = "flex";
		} else {
			layout.split(closestEdge, moving);
			resetMovedPanelSizes(source, layout, moving);
		}

		setClosestEdge("center");
	};

	if (layout.isWorkspace()) {
		const showDropControls = !!workspaces.movingWorkspace;

		const onMouseDown = (workspace: Workspace) => (e: React.MouseEvent) => {
			if (e.button === 0)
				workspaces.movingWorkspace = workspace;
		};

		return (
			<div className="workspace-panel" style={style} ref={layoutRef}>
				<div className="tabs">
					{layout.children.map((workspace, i) => (
						<div key={workspace.id} className={`tab ${layout.activeWorkspace === i ? "active" : ""}`} onClick={() => layout.activeWorkspace = i} onMouseDown={onMouseDown(workspace)}>
							{workspace.name}
						</div>
					))}
				</div>

				<div className="panel" ref={panelRef} onMouseMove={onPanelMouseMove} onMouseUp={onPanelMouseUp} >
					{layout.children.map((workspace, i) => (
						<div
							key={workspace.id}
							className={`workspace-view ${layout.activeWorkspace === i ? "active" : ""}`}
						>
							<WorkspacePanel workspace={workspace} />
						</div>
					))}

					<div className={`drop-controls ${closestEdge} ${showDropControls ? "show" : ""}`}>
						<div className="left" />
						<div className="top" />
						<div className="right" />
						<div className="bottom" />
						<div className="center" />
					</div>

				</div>
				{!isFirst && (
					<div className={`slider ${slidingState.isSliding ? "active" : ""}`} onMouseDown={onStartSlide} />
				)}
			</div>
		);
	}

	if (layout.isLayout()) {
		return (
			<div className={`workspace-layout ${layout.direction}`} style={style} ref={layoutRef}>
				{layout.children.map((child, i) => (
					<WorkspaceLayoutPanel
						key={child.id}
						layout={child}
						isFirst={i === 0}
					/>
				))}
				{!isFirst && (
					<div className={`slider ${slidingState.isSliding ? "active" : ""}`} onMouseDown={onStartSlide} />
				)}
			</div>
		);
	}
	return null;
};

const WorkspacePanel = ({ workspace: initialWorkspace }: { workspace: Workspace }) => {
	const workspace = useObservable(initialWorkspace);

	const Component = useMemo(
		() => WorkspaceComponents.get(workspace.constructor as WorkspaceType<any>),
		[workspace]
	);

	if (!Component) {
		console.warn(`Missing workspace component for ${workspace.constructor.name}!`);
		return null;
	}

	return <Component workspace={workspace} />;
};

const WorkspaceComponents: Map<WorkspaceType<any>, React.FC<{ workspace: any }>> = new Map();

const register = <T extends Workspace>(type: WorkspaceType<T>, component: React.FC<{ workspace: T }>) => {
	if (WorkspaceComponents.has(type))
		throw new Error(`Component for ${type.name} is already registered!`);

	WorkspaceComponents.set(type, component);
};

register(RendererWorkspace, RendererViewWorkspace);
register(MapPreviewWorkspace, MapPreview);
