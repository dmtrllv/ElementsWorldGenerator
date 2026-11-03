import { useEffect, useRef, useState } from "react";
import { Editor } from "../../../editor";
import { ProjectManager } from "../../../editor/project-manager";
import type { MapPreviewWorkspace } from "../../../editor/workspaces/map-preview";
import { ChunkCoordinate } from "../../../generator/chunk-coordinate";
import { CoastMap } from "../../../generator/maps/coast-map";
import { ContinentalMap } from "../../../generator/maps/continental-map";
import { MapGenerator, type MapGeneratorType } from "../../../generator/maps/map-generator";
import { OceanMap } from "../../../generator/maps/ocean-map";
import { Region } from "../../../generator/region";
import { useObservable } from "../../../reactive";
import { clamp } from "../../../utils";

type MapKind = "continental" | "ocean" | "coast";
type ViewMode = "chunked" | "full" | "difference";

type PreviewMapType = MapGeneratorType<MapGenerator<Float32Array>>;

interface PreviewData {
	width: number;
	height: number;
	chunkWidth: number;
	chunkHeight: number;
	full: Float32Array;
	chunked: Float32Array;
	maxDifference: number;
	differentSamples: number;
}

interface ViewState {
	isSliding: boolean;
	downPos: [number, number];
	offset: [number, number];
	downOffset: [number, number];
	scale: number;
}

const MAP_TYPES: Record<MapKind, PreviewMapType> = {
	continental: ContinentalMap,
	ocean: OceanMap,
	coast: CoastMap
};

export const MapPreview = (_: { workspace: MapPreviewWorkspace }) => {
	const projectManager = Editor.useModule(ProjectManager);
	const world = useObservable(projectManager.activeProject.world);
	const generation = world.generation;
	const params = generation.worldParams;

	const [mapKind, setMapKind] = useState<MapKind>("continental");
	const [viewMode, setViewMode] = useState<ViewMode>("difference");
	const [showChunkBounds, setShowChunkBounds] = useState(false);
	const [differenceGain, setDifferenceGain] = useState(16);
	const [preview, setPreview] = useState<PreviewData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const canvas = useRef<HTMLCanvasElement>(null);

	const [viewState, setViewState] = useState<ViewState>({
		isSliding: false,
		downPos: [0, 0],
		offset: [0, 0],
		downOffset: [0, 0],
		scale: 1
	});

	const viewRef = useRef({ viewState, setViewState });
	viewRef.current = { viewState, setViewState };

	useEffect(() => {
		let cancelled = false;

		const generate = () => {
			setLoading(true);
			setError(null);
			setPreview(null);

			try {
				const width = Math.ceil(params.size.x);
				const height = Math.ceil(params.size.z);
				const chunkWidth = params.chunkSize.x;
				const chunkHeight = params.chunkSize.y;

				if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0)
					throw new RangeError("World dimensions must be positive safe integers.");

				if (!Number.isSafeInteger(chunkWidth) || !Number.isSafeInteger(chunkHeight) || chunkWidth <= 0 || chunkHeight <= 0)
					throw new RangeError("Chunk dimensions must be positive safe integers.");

				const generator = generation.generator;
				const map = generator.getMap(MAP_TYPES[mapKind]);

				const worldRegion = new Region(0, 0, width, height);
				const full = map.generate(worldRegion).data;
				const chunked = new Float32Array(width * height);

				const columns = Math.ceil(width / chunkWidth);
				const rows = Math.ceil(height / chunkHeight);

				for (let z = 0; z < rows; z++) {
					for (let x = 0; x < columns; x++) {
						const coordinate = new ChunkCoordinate(x, z);
						const region = coordinate.toRegion(params.chunkSize, params.size);

						if (!region)
							continue;

						const data = map.generate(region).data;

						for (let row = 0; row < region.height; row++) {
							const sourceStart = row * region.width;
							const targetStart = (region.z + row) * width + region.x;

							chunked.set(data.subarray(sourceStart, sourceStart + region.width), targetStart);
						}
					}
				}

				let maxDifference = 0;
				let differentSamples = 0;

				for (let i = 0; i < full.length; i++) {
					const difference = Math.abs(full[i]! - chunked[i]!);

					if (difference > 0) {
						differentSamples++;
						maxDifference = Math.max(maxDifference, difference);
					}
				}

				if (!cancelled) {
					setPreview({
						width,
						height,
						chunkWidth,
						chunkHeight,
						full,
						chunked,
						maxDifference,
						differentSamples
					});
				}
			} catch (cause) {
				if (!cancelled)
					setError(cause instanceof Error ? cause.message : String(cause));
			} finally {
				if (!cancelled)
					setLoading(false);
			}
		};

		generate();

		return () => {
			cancelled = true;
		};
	}, [generation, mapKind]);

	useEffect(() => {
		const element = canvas.current;

		if (!element || !preview)
			return;

		const { width, height, full, chunked } = preview;

		element.width = width;
		element.height = height;

		const context = element.getContext("2d");

		if (!context)
			return;

		context.imageSmoothingEnabled = false;

		const image = context.createImageData(width, height);
		const pixels = image.data;

		for (let i = 0; i < full.length; i++) {
			let value = 0;

			switch (viewMode) {
				case "full":
					value = full[i]!;
					break;
				case "chunked":
					value = chunked[i]!;
					break;
				case "difference":
					value = Math.abs(full[i]! - chunked[i]!) * differenceGain;
					break;
			}

			const grayscale = Math.round(clamp(Number.isFinite(value) ? value : 0, 0, 1) * 255);
			const pixel = i * 4;

			pixels[pixel] = grayscale;
			pixels[pixel + 1] = grayscale;
			pixels[pixel + 2] = grayscale;
			pixels[pixel + 3] = 255;
		}

		context.putImageData(image, 0, 0);

		if (showChunkBounds) {
			context.beginPath();
			context.strokeStyle = "rgba(255, 80, 80, 0.9)";
			context.lineWidth = 1;

			for (let x = preview.chunkWidth; x < width; x += preview.chunkWidth) {
				context.moveTo(x + 0.5, 0);
				context.lineTo(x + 0.5, height);
			}

			for (let z = preview.chunkHeight; z < height; z += preview.chunkHeight) {
				context.moveTo(0, z + 0.5);
				context.lineTo(width, z + 0.5);
			}

			context.stroke();
		}
	}, [preview, viewMode, differenceGain, showChunkBounds]);

	useEffect(() => {
		const onMouseMove = (event: MouseEvent) => {
			const { viewState, setViewState } = viewRef.current;

			if (!viewState.isSliding)
				return;

			const x = viewState.downOffset[0] + (event.clientX - viewState.downPos[0]) / viewState.scale;
			const y = viewState.downOffset[1] + (event.clientY - viewState.downPos[1]) / viewState.scale;

			setViewState(state => ({
				...state,
				offset: [x, y]
			}));
		};

		const onMouseUp = () => {
			const { setViewState } = viewRef.current;
			setViewState(state => ({ ...state, isSliding: false }));
		};

		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);

		return () => {
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
		};
	}, []);

	const onMouseDown = (event: React.MouseEvent) => {
		if (event.button !== 0)
			return;

		setViewState(state => ({
			...state,
			downOffset: [...state.offset],
			downPos: [event.clientX, event.clientY],
			isSliding: true
		}));
	};

	const onWheel = (event: React.WheelEvent) => {
		event.preventDefault();

		const scale = clamp(viewState.scale * Math.exp(-event.deltaY * 0.001), 0.05, 20);

		setViewState(state => ({
			...state,
			scale
		}));
	};

	return (
		<div className="map-preview" style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", minHeight: 0 }}>
			<div className="map-preview-controls" style={{ display: "flex", alignItems: "center", gap: 8, padding: 8 }}>
				<select value={mapKind} onChange={event => setMapKind(event.target.value as MapKind)}>
					<option value="continental">Continental</option>
					<option value="ocean">Ocean</option>
					<option value="coast">Coast</option>
				</select>

				<select value={viewMode} onChange={event => setViewMode(event.target.value as ViewMode)}>
					<option value="difference">Difference</option>
					<option value="chunked">Chunked</option>
					<option value="full">Full world</option>
				</select>

				<label style={{ display: "flex", alignItems: "center", gap: 4 }}>
					<input type="checkbox" checked={showChunkBounds} onChange={event => setShowChunkBounds(event.target.checked)} />
					Chunk bounds
				</label>

				{viewMode === "difference" && (
					<label style={{ display: "flex", alignItems: "center", gap: 4 }}>
						Gain
						<input type="range" min={1} max={128} value={differenceGain} onChange={event => setDifferenceGain(Number(event.target.value))} />
						{differenceGain}
					</label>
				)}

				<span style={{ marginLeft: "auto" }}>
					{loading
						? "Generating..."
						: preview
							? `${preview.width} x ${preview.height} | ${preview.differentSamples} differing samples | max Δ ${preview.maxDifference.toExponential(2)}`
							: ""}
				</span>
			</div>

			{error && (
				<div style={{ padding: 8, color: "var(--text-error, #e55)" }}>
					{error}
				</div>
			)}

			<div
				className="scalar-view"
				onMouseDown={onMouseDown}
				onWheel={onWheel}
				style={{ flex: 1, minHeight: 0, overflow: "hidden", cursor: viewState.isSliding ? "grabbing" : "grab" }}
			>
				<canvas
					ref={canvas}
					style={{
						display: "block",
						imageRendering: "pixelated",
						transformOrigin: "0 0",
						transform: `scale(${viewState.scale}) translate(${viewState.offset[0]}px, ${viewState.offset[1]}px)`
					}}
				/>
			</div>
		</div>
	);
};