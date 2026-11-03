import { observable } from "../../reactive";
import { Param } from "./param";

@observable({ inherit: true })
export class Curve extends Param<CurveState> {
	public static get defaultPoints(): CurvePoint[] {
		return [
			new CurvePoint(0, 0),
			new CurvePoint(1, 1),
		];
	}
	
	public get points() {
		return this.state.points;
	}

	public get interpolation() {
		return this.state.interpolation;
	}

	public set interpolation(interpolation: InterpolationType) {
		this.state.interpolation = interpolation;
	}

	public updatePoint(draggingPoint: CurvePoint, x: number, y: number) {
		draggingPoint.x = x;
		draggingPoint.y = y;
		this.state.points = [...this.points];
	}

	public remove(point: CurvePoint) {
		const index = this.points.indexOf(point);
		if (index > -1)
			this.points.splice(index, 1);
	}

	public addPoint(x: number, y: number) {
		const index = this.points.findIndex(p => p.x > x);
		if (index === -1)
			throw new Error(`Could not get insert index for curve point at x: ${x} y: ${y}!`);

		this.points.splice(index, 0, new CurvePoint(x, y));
	}

	public evaluate(x: number): number {
		const points = this.points;
		const count = points.length;

		if (count === 0)
			return 0;

		if (x <= points[0]!.x)
			return points[0]!.y;

		if (x >= points[count - 1]!.x)
			return points[count - 1]!.y;

		const index = points.findIndex(p => p.x >= x);
		const a = points[index - 1]!;
		const b = points[index]!;

		const h = b.x - a.x;
		const t = (x - a.x) / h;

		switch (this.interpolation) {
			case "linear":
				return a.y + (b.y - a.y) * t;

			case "smooth": {
				const s = t * t * (3 - 2 * t);
				return a.y + (b.y - a.y) * s;
			}

			case "catmull-rom": {
				const previous = points[Math.max(0, index - 2)]!;
				const next = points[Math.min(count - 1, index + 1)]!;

				const m0 = (b.y - previous.y) / (b.x - previous.x);
				const m1 = (next.y - a.y) / (next.x - a.x);

				const t2 = t * t;
				const t3 = t2 * t;

				return (
					(2 * t3 - 3 * t2 + 1) * a.y +
					(t3 - 2 * t2 + t) * h * m0 +
					(-2 * t3 + 3 * t2) * b.y +
					(t3 - t2) * h * m1
				);
			}

			case "monotone-cubic": {
				const slopes = this.calculateMonotoneTangents();
				const m0 = slopes[index - 1]!;
				const m1 = slopes[index]!;

				const t2 = t * t;
				const t3 = t2 * t;

				return (
					(2 * t3 - 3 * t2 + 1) * a.y +
					(t3 - 2 * t2 + t) * h * m0 +
					(-2 * t3 + 3 * t2) * b.y +
					(t3 - t2) * h * m1
				);
			}
		}
	}

	private calculateMonotoneTangents(): number[] {
		const points = this.points;
		const count = points.length;

		if (count < 2)
			return Array(count).fill(0);

		const slopes: number[] = [];

		for (let i = 0; i < count - 1; i++) {
			const a = points[i]!;
			const b = points[i + 1]!;

			slopes.push((b.y - a.y) / (b.x - a.x));
		}

		const tangents: number[] = Array(count).fill(0);

		tangents[0] = slopes[0]!;
		tangents[count - 1] = slopes[count - 2]!;

		for (let i = 1; i < count - 1; i++) {
			const previous = slopes[i - 1]!;
			const next = slopes[i]!;

			if (previous * next <= 0) {
				tangents[i] = 0;
			} else {
				const h0 = points[i]!.x - points[i - 1]!.x;
				const h1 = points[i + 1]!.x - points[i]!.x;

				const w1 = 2 * h1 + h0;
				const w2 = h1 + 2 * h0;

				tangents[i] = (w1 + w2) / (
					(w1 / previous) + (w2 / next)
				);
			}
		}

		for (let i = 0; i < count - 1; i++) {
			const slope = slopes[i]!;

			if (slope === 0) {
				tangents[i] = 0;
				tangents[i + 1] = 0;
				continue;
			}

			const alpha = tangents[i]! / slope;
			const beta = tangents[i + 1]! / slope;

			const magnitude = alpha * alpha + beta * beta;

			if (magnitude > 9) {
				const tau = 3 / Math.sqrt(magnitude);

				tangents[i] = tau * alpha * slope;
				tangents[i + 1] = tau * beta * slope;
			}
		}

		return tangents;
	}
}

export type CurveState = {
	points: CurvePoint[];
	interpolation: InterpolationType;
}

export type InterpolationType =
	| "linear"
	| "smooth"
	| "catmull-rom"
	| "monotone-cubic";

export class CurvePoint {
	public x: number;
	public y: number;

	public constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}
}
