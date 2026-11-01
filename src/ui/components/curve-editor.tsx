import { useEffect, useRef } from "react";
import { CurvePoint, type Curve, type InterpolationType } from "../../generator/curve";
import { observe } from "../../state";
import { clamp } from "three/src/math/MathUtils.js";

import "./styles/curve-editor.scss";

type CurveEditorProps = {
	readonly curve: Curve;
}

export const CurveEditor = ({ curve }: CurveEditorProps) => {
	curve = observe(curve);

	const renderer = useRef(new CurveRenderer(curve));
	const canvas = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!canvas.current)
			return;

		return renderer.current.initialize(canvas.current);
	}, []);

	useEffect(() => {
		return renderer.current.render();
	}, [curve.interpolation, curve.points]);

	return (
		<div className="curve-editor">
			<div className="type-input">
				<div className="label">
					Type:
				</div>
				<select name="interpolation-type" value={curve.interpolation} onChange={e => curve.interpolation = e.target.value as InterpolationType}>
					<option value="linear">Linear</option>
					<option value="smooth">Smooth</option>
					<option value="catmull-rom">Catmull-rom</option>
					<option value="monotone-cubic">Monotone-cubic</option>
				</select>
			</div>
			<div className="curve-renderer" style={{ width: "100%", height: "240px" }}>
				<canvas ref={canvas} />
			</div>
		</div>
	);
}

class CurveRenderer {
	private readonly curve: Curve;
	private ctx: CanvasRenderingContext2D | null = null;
	private resizeObserver: ResizeObserver | null = null;

	public readonly padding: number = 15;
	public readonly pointRadius: number = 2;
	public readonly hoverRadius: number = 5;
	public readonly pointActivateRadius: number = 7;

	private draggingPoint: CurvePoint | null = null;
	private downPos: [number, number] = [0, 0];
	private startSlidePoint: [number, number] = [0, 0];
	private hoveringPoint: CurvePoint | null = null;

	public constructor(curve: Curve) {
		this.curve = curve;
	}

	public initialize(canvas: HTMLCanvasElement) {
		this.ctx = canvas.getContext("2d")!;
		this.resizeObserver = new ResizeObserver(() => {
			this.resize();
		});
		this.resizeObserver.observe(canvas.parentElement!);
		this.resize();

		canvas.addEventListener("mousedown", this.onMouseDown);
		canvas.addEventListener("dblclick", this.onDoubleClick);
		window.addEventListener("mousemove", this.onMouseMove);
		window.addEventListener("mouseup", this.onMouseUp);
		canvas.addEventListener("mousemove", this.onCanvasMouseMove);

		return () => {
			this.ctx = null;
			this.resizeObserver?.disconnect();
			canvas.removeEventListener("mousedown", this.onMouseDown);
			window.removeEventListener("mousemove", this.onMouseMove);
			canvas.removeEventListener("dblclick", this.onDoubleClick);
			window.removeEventListener("mouseup", this.onMouseUp);
			canvas.removeEventListener("mousemove", this.onCanvasMouseMove);
		}
	}

	private readonly onCanvasMouseMove = (e: MouseEvent) => {
		if (!this.ctx)
			return;

		const point = this.getPointAt(e.offsetX, e.offsetY);

		if (this.hoveringPoint !== point) {
			this.hoveringPoint = point;
			this.render();
		}
	}

	private readonly onDoubleClick = (e: MouseEvent) => {
		if (!this.ctx)
			return;

		const point = this.getPointAt(e.offsetX, e.offsetY);
		if (point) {
			const index = this.curve.points.indexOf(point);
			if (index !== 0 && index < (this.curve.points.length - 1)) {
				this.curve.remove(point);
			}
		} else {
			const point = this.canvasToCurve(this.ctx!.canvas, e.offsetX, e.offsetY);
			this.curve.addPoint(...point);
		}
		this.render();
	}

	private readonly canvasToCurve = (canvas: HTMLCanvasElement, x: number, y: number): [number, number] => {
		const w = canvas.width - (this.padding * 2);
		const h = canvas.height - (this.padding * 2);

		x = (x - this.padding) / w;
		y = 1 - (y - this.padding) / h;

		return [x, y];
	}

	private readonly curveToCanvas = (canvas: HTMLCanvasElement, x: number, y: number): [number, number] => {
		const w = canvas.width - (this.padding * 2);
		const h = canvas.height - (this.padding * 2);

		x = (x * w) + this.padding;
		y = ((1 - y) * h) + this.padding;

		return [x, y];
	}

	private readonly getPointAt = (canvasX: number, canvasY: number, radius: number = this.pointActivateRadius) => {
		let closest: CurvePoint | null = null;
		let closestDistance: number = Infinity;

		for (const p of this.curve.points) {
			const [x, y] = this.curveToCanvas(this.ctx!.canvas, p.x, p.y);
			const dx = Math.abs(x - canvasX);
			const dy = Math.abs(y - canvasY);
			const distance = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));

			if (distance < radius) {
				if (distance < closestDistance) {
					closestDistance = distance;
					closest = p;
				}
			}
		}

		return closest;
	}

	private readonly onMouseUp = () => {
		this.draggingPoint = null;
	}

	private readonly onMouseMove = (e: MouseEvent) => {
		if (!this.draggingPoint || !this.ctx)
			return;
		const w = this.ctx.canvas.width - (this.padding * 2);
		const h = this.ctx.canvas.height - (this.padding * 2);

		const offsetX = (e.clientX - this.downPos[0]) / w;
		const offsetY = (this.downPos[1] - e.clientY) / h;
		const index = this.curve.points.indexOf(this.draggingPoint);

		let minX = 0;
		let maxX = 1;

		if (index === 0) {
			minX = 0;
			maxX = 0;
		} else if (index === this.curve.points.length - 1) {
			minX = 1;
			maxX = 1;
		} else {
			minX = this.curve.points[index - 1]!.x + 0.01;
			maxX = this.curve.points[index + 1]!.x - 0.01;
		}

		const x = clamp(this.startSlidePoint[0] + offsetX, minX, maxX);
		const y = clamp(this.startSlidePoint[1] + offsetY, 0, 1);
		this.curve.updatePoint(this.draggingPoint, x, y);

		this.render();
	}

	private readonly onMouseDown = (e: MouseEvent) => {
		if (!this.ctx)
			return;

		const point = this.getPointAt(e.offsetX, e.offsetY)

		this.draggingPoint = point;

		if (point) {
			this.downPos = [e.clientX, e.clientY];
			this.startSlidePoint = [point.x, point.y];
		}
	}

	private resize() {
		if (!this.ctx)
			return;
		const canvas = this.ctx.canvas;

		const width = canvas.parentElement!.clientWidth;
		const height = canvas.parentElement!.clientHeight;

		canvas.style.width = `${canvas.width = width}px`;
		canvas.style.height = `${canvas.height = height}px`;
		this.render();
	}

	public render() {
		if (!this.ctx)
			return;

		const { width, height } = this.ctx.canvas;

		const w = width - (this.padding * 2);
		const h = height - (this.padding * 2);

		const ctx = this.ctx;
		ctx.clearRect(0, 0, width, height);

		this.renderGrid(ctx, w, h);
		this.renderCurve(ctx, w, h);
		this.renderPoints(ctx, w, h);
	}

	private renderPoints(ctx: CanvasRenderingContext2D, w: number, h: number) {
		ctx.fillStyle = `rgba(255, 255, 255, 0.2)`;
		ctx.strokeStyle = `rgba(255, 255, 255, 0.55)`;
		this.curve.points.forEach(point => {
			ctx.beginPath();
			const x = (point.x * w) + this.padding;
			const y = ((1 - point.y) * h) + this.padding;
			const radius = this.hoveringPoint === point || this.draggingPoint === point ? this.hoverRadius : this.pointRadius;
			ctx.arc(x, y, radius, 0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();
		});
	}

	private renderCurve(ctx: CanvasRenderingContext2D, w: number, h: number) {
		ctx.beginPath();
		ctx.moveTo(0 + this.padding, this.curve.evaluate(0) + this.padding);
		for (let x = 1; x < w; x++) {
			const y = ((1 - this.curve.evaluate(x / w)) * h) + this.padding;
			ctx.lineTo(x + this.padding, y);
		}
		ctx.stroke();
	}

	private renderGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
		ctx.strokeStyle = `rgba(255,255,255,0.45)`;
		ctx.rect(this.padding, this.padding, w, h);
		ctx.stroke();

		const h4 = h / 4;
		const w4 = w / 4;

		ctx.beginPath();
		ctx.strokeStyle = `rgba(255,255,255,0.15)`;
		for (let x = 1; x < 4; x++) {
			const w = this.padding + (x * w4);
			ctx.moveTo(w, this.padding);
			ctx.lineTo(w, h + this.padding);
		}

		for (let y = 1; y < 4; y++) {
			const h = this.padding + (y * h4);
			ctx.moveTo(this.padding, h);
			ctx.lineTo(w + this.padding, h);
		}

		ctx.stroke();
	}
}