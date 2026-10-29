
import type { MaterialId } from "./materials";
import type { Vector3 } from "three";

export type SurfaceVertex = {
	readonly position: Vector3;
	readonly uv: readonly [number, number];
};

export type SurfaceTriangle = {
	readonly a: number;
	readonly b: number;
	readonly c: number;
};

export class SurfaceMesh {
	public readonly materialId: MaterialId;
	public readonly vertices: SurfaceVertex[] = [];
	public readonly triangles: SurfaceTriangle[] = [];

	public constructor(materialId: MaterialId) {
		this.materialId = materialId;
	}

	public addVertex(position: Vector3, uv: readonly [number, number]): number {
		this.vertices.push({ position: position.clone(), uv });
		return this.vertices.length - 1;
	}

	public addTriangle(a: number, b: number, c: number): void {
		this.validateVertexIndex(a);
		this.validateVertexIndex(b);
		this.validateVertexIndex(c);

		this.triangles.push({ a, b, c });
	}

	private validateVertexIndex(index: number): void {
		if (!Number.isInteger(index) || index < 0 || index >= this.vertices.length)
			throw new RangeError(`Surface vertex index ${index} does not exist.`);
	}
}
