
import { computed, observable } from "../../reactive";
import { Param } from "./param";

@observable({ inherit: true })
export class Curve extends Param<CurveState> {
	public static get defaultPoints(): CurvePoint[] {
		return [
			new CurvePoint(0, 0),
			new CurvePoint(1, 1)
		];
	}

	@computed
	public get points() {
		return this.state.points;
	}
	
	@computed
	public get interpolation() {
		return this.state.interpolation;
	}

	public set interpolation(interpolation: InterpolationType) {
		this.state.interpolation = interpolation;
	}

	private getSortedPoints(): CurvePoint[] {
		const sorted = [...this.points].sort((a, b) => a.x - b.x);
		const points: CurvePoint[] = [];

		for (const point of sorted) {
			const previous = points[points.length - 1];

			if (previous && previous.x === point.x) {
				points[points.length - 1] = point;
				continue;
			}

			points.push(point);
		}

		return points;
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
		const points = this.getSortedPoints();
		const index = points.findIndex(point => point.x >= x);

		if (index > -1 && points[index]!.x === x)
			throw new Error(`A curve point already exists at x: ${x}!`);

		const point = new CurvePoint(x, y);

		if (index === -1)
			points.push(point);
		else
			points.splice(index, 0, point);

		this.state.points = points;
	}

	public evaluate(x: number): number {
		const points = this.getSortedPoints();
		const count = points.length;

		if (count === 0)
			return 0;

		if (count === 1)
			return points[0]!.y;

		if (x <= points[0]!.x)
			return points[0]!.y;

		if (x >= points[count - 1]!.x)
			return points[count - 1]!.y;

		let index = 1;

		while (index < count && points[index]!.x < x)
			index++;

		const a = points[index - 1]!;
		const b = points[index]!;

		const h = b.x - a.x;

		if (h <= 0)
			return a.y;

		const t = (x - a.x) / h;

		switch (this.interpolation) {
			case "linear":
				return a.y + (b.y - a.y) * t;

			case "smooth": {
				const s = t * t * (3 - 2 * t);

				return a.y + (b.y - a.y) * s;
			}

			case "catmull-rom": {
				const tangents = this.calculateCatmullRomTangents(points);
				return this.evaluateCubic(a, b, tangents[index - 1]!, tangents[index]!, t);
			}

			case "monotone-cubic": {
				const tangents = this.calculateMonotoneTangents(points);
				return this.evaluateCubic(a, b, tangents[index - 1]!, tangents[index]!, t);
			}
		}
	}

	private evaluateCubic(a: CurvePoint, b: CurvePoint, m0: number, m1: number, t: number): number {
		const h = b.x - a.x;
		const t2 = t * t;
		const t3 = t2 * t;

		return (
			(2 * t3 - 3 * t2 + 1) * a.y +
			(t3 - 2 * t2 + t) * h * m0 +
			(-2 * t3 + 3 * t2) * b.y +
			(t3 - t2) * h * m1
		);
	}

	private calculateCatmullRomTangents(points: CurvePoint[]): number[] {
		const count = points.length;
		const tangents: number[] = Array(count).fill(0);

		if (count < 2)
			return tangents;

		tangents[0] = (points[1]!.y - points[0]!.y) / (points[1]!.x - points[0]!.x);
		tangents[count - 1] = (points[count - 1]!.y - points[count - 2]!.y) / (points[count - 1]!.x - points[count - 2]!.x);

		for (let i = 1; i < count - 1; i++) {
			const previous = points[i - 1]!;
			const next = points[i + 1]!;

			tangents[i] = (next.y - previous.y) / (next.x - previous.x);
		}

		return tangents;
	}

	private calculateMonotoneTangents(points: CurvePoint[]): number[] {
		const count = points.length;

		if (count < 2)
			return Array(count).fill(0);

		const slopes: number[] = [];
		const intervals: number[] = [];

		for (let i = 0; i < count - 1; i++) {
			const a = points[i]!;
			const b = points[i + 1]!;

			const h = b.x - a.x;
			intervals.push(h);
			slopes.push((b.y - a.y) / h);
		}

		const tangents: number[] = Array(count).fill(0);

		if (count === 2) {
			tangents[0] = slopes[0]!;
			tangents[1] = slopes[0]!;

			return tangents;
		}

		const firstSlope = slopes[0]!;
		const secondSlope = slopes[1]!;
		const firstInterval = intervals[0]!;
		const secondInterval = intervals[1]!;

		tangents[0] = this.calculateEndpointTangent(firstInterval, secondInterval, firstSlope, secondSlope);

		const lastSlope = slopes[count - 2]!;
		const previousSlope = slopes[count - 3]!;
		const lastInterval = intervals[count - 2]!;
		const previousInterval = intervals[count - 3]!;

		tangents[count - 1] = this.calculateEndpointTangent(lastInterval, previousInterval, lastSlope, previousSlope);

		for (let i = 1; i < count - 1; i++) {
			const previousSlope = slopes[i - 1]!;
			const nextSlope = slopes[i]!;

			if (previousSlope === 0 || nextSlope === 0 || Math.sign(previousSlope) !== Math.sign(nextSlope)) {
				tangents[i] = 0;
				continue;
			}

			const previousInterval = intervals[i - 1]!;
			const nextInterval = intervals[i]!;

			const w1 = 2 * nextInterval + previousInterval;
			const w2 = nextInterval + 2 * previousInterval;

			tangents[i] = (w1 + w2) / (
				w1 / previousSlope +
				w2 / nextSlope
			);
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

	private calculateEndpointTangent(h0: number, h1: number, slope0: number, slope1: number): number {
		let tangent = ((2 * h0 + h1) * slope0 - h0 * slope1) / (h0 + h1);

		if (Math.sign(tangent) !== Math.sign(slope0))
			tangent = 0;
		else if (Math.sign(slope0) !== Math.sign(slope1) && Math.abs(tangent) > Math.abs(slope0) * 3)
			tangent = slope0 * 3;

		return tangent;
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

@observable
export class CurvePoint {
	@observable
	public x: number;
	@observable
	public y: number;

	public constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}
}
