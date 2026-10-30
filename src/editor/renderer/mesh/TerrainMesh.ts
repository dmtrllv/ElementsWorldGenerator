
import * as THREE from "three";
import type { World } from "../../generator/world";
import { materials } from "../../generator/materials";
import type { MaterialId, RenderGroup } from "../../generator/materials";
import type { SurfaceMesh } from "../../generator/surfaces";
import { Block, BLOCK_SIZE } from "../../generator/block";
import type { Chunk } from "../../generator/chunk";

type Face = {
	normal: [number, number, number];
	corners: [number, number, number][];
};

type MaterialGeometry = {
	positions: number[];
	normals: number[];
	uvs: number[];
	colors: number[];
	indices: number[];
};

const VOXEL_SIZE = 1 / BLOCK_SIZE;

const FACES: Face[] = [
	{ normal: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
	{ normal: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
	{ normal: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
	{ normal: [0, -1, 0], corners: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]] },
	{ normal: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
	{ normal: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }
];

const FACE_UVS: [number, number][] = [
	[0, 0],
	[0, 1],
	[1, 1],
	[1, 0]
];

export class TerrainMesh {
	public static build(world: World, chunk: Chunk, paletteColumns = 8, paletteRows = 8, showBiomeColors = false): THREE.BufferGeometry {
		if (!Number.isInteger(paletteColumns) || paletteColumns <= 0 ||
			!Number.isInteger(paletteRows) || paletteRows <= 0)
			throw new RangeError("Palette dimensions must be positive integers.");

		const groupGeometries = new Map<RenderGroup, MaterialGeometry>();
		const renderGroups = TerrainMesh.getRenderGroups();

		for (const group of renderGroups)
			groupGeometries.set(group, { positions: [], normals: [], uvs: [], indices: [], colors: [] });

		const addFace = (materialId: MaterialId, bx: number, by: number, bz: number, vx: number, vy: number, vz: number, scale: number, face: Face) => {
			const definition = materials.get(materialId);
			if (!definition)
				throw new Error(`Unknown material ID ${materialId}.`);

			if (definition.paletteIndex >= paletteColumns * paletteRows)
				throw new RangeError(`Palette index ${definition.paletteIndex} is outside the configured palette grid.`);

			let geometry = groupGeometries.get(definition.renderGroup);
			if (!geometry) {
				geometry = { positions: [], normals: [], uvs: [], indices: [], colors: [] };
				groupGeometries.set(definition.renderGroup, geometry);
				renderGroups.push(definition.renderGroup);
			}

			const vertexStart = geometry.positions.length / 3;
			const biome = showBiomeColors ? world.biomes.get(world.getBiome(bx, bz)) : undefined;

			if (showBiomeColors && !biome)
				throw new Error(`Unknown biome ID ${world.getBiome(bx, bz)}.`);
			const px = bx - world.width / 2;
			const py = by;
			const pz = bz - world.depth / 2;

			const column = definition.paletteIndex % paletteColumns;
			const row = Math.floor(definition.paletteIndex / paletteColumns);
			const u0 = column / paletteColumns;
			const u1 = (column + 1) / paletteColumns;
			const v0 = 1 - (row + 1) / paletteRows;
			const v1 = 1 - row / paletteRows;

			for (let i = 0; i < face.corners.length; i++) {
				const corner = face.corners[i];
				const uv = FACE_UVS[i];

				geometry.positions.push(px + (vx + corner[0]) * scale, py + (vy + corner[1]) * scale, pz + (vz + corner[2]) * scale);
				geometry.normals.push(...face.normal);
				geometry.uvs.push(uv[0] === 0 ? u0 : u1, uv[1] === 0 ? v0 : v1);
				if (showBiomeColors && biome) {
					geometry.colors.push(biome.color[0] / 255, biome.color[1] / 255, biome.color[2] / 255);
				} else {
					geometry.colors.push(1, 1, 1);
				}
			}

			geometry.indices.push(vertexStart, vertexStart + 1, vertexStart + 2, vertexStart, vertexStart + 2, vertexStart + 3);
		};

		const getVoxelMaterial = (bx: number, by: number, bz: number, vx: number, vy: number, vz: number): MaterialId | 0 => {
			if (vx < 0) { bx--; vx += BLOCK_SIZE; }
			else if (vx >= BLOCK_SIZE) { bx++; vx -= BLOCK_SIZE; }

			if (vy < 0) { by--; vy += BLOCK_SIZE; }
			else if (vy >= BLOCK_SIZE) { by++; vy -= BLOCK_SIZE; }

			if (vz < 0) { bz--; vz += BLOCK_SIZE; }
			else if (vz >= BLOCK_SIZE) { bz++; vz -= BLOCK_SIZE; }

			const block = world.getBlock(bx, by, bz);
			return block ? block.getVoxel(vx, vy, vz) : 0;
		};

		for (const { x, y, z, block } of chunk.getBlocks()) {
			const bx = x + chunk.originX;
			const by = y;
			const bz = z + chunk.originZ;
			if (block.isRefined) {
				TerrainMesh.addRefinedBlock(block, bx, by, bz, getVoxelMaterial, addFace);
				continue;
			}

			for (const face of FACES) {
				const [nx, ny, nz] = face.normal;
				const neighbor = world.getBlock(bx + nx, by + ny, bz + nz);

				if (!neighbor) {
					addFace(block.materialId, bx, by, bz, 0, 0, 0, 1, face);
					continue;
				}

				if (!neighbor.isRefined)
					continue;

				for (let a = 0; a < BLOCK_SIZE; a++) {
					for (let b = 0; b < BLOCK_SIZE; b++) {
						let vx = 0;
						let vy = 0;
						let vz = 0;

						if (nx !== 0) { vx = nx > 0 ? BLOCK_SIZE - 1 : 0; vy = a; vz = b; }
						else if (ny !== 0) { vx = a; vy = ny > 0 ? BLOCK_SIZE - 1 : 0; vz = b; }
						else { vx = a; vy = b; vz = nz > 0 ? BLOCK_SIZE - 1 : 0; }

						if (getVoxelMaterial(bx, by, bz, vx + nx, vy + ny, vz + nz) === 0)
							addFace(block.materialId, bx, by, bz, vx, vy, vz, VOXEL_SIZE, face);
					}
				}
			}
		}

		for (const surface of world.getSurfaces())
			TerrainMesh.appendSurface(surface, groupGeometries, renderGroups, paletteColumns, paletteRows);

		const geometry = new THREE.BufferGeometry();
		const positions: number[] = [];
		const normals: number[] = [];
		const uvs: number[] = [];
		const colors: number[] = [];
		const indices: number[] = [];

		for (const [materialIndex, group] of renderGroups.entries()) {
			const part = groupGeometries.get(group);
			if (!part || part.indices.length === 0)
				continue;

			const vertexOffset = positions.length / 3;
			const indexStart = indices.length;

			for (const value of part.positions)
				positions.push(value);

			for (const value of part.normals)
				normals.push(value);

			for (const value of part.uvs)
				uvs.push(value);

			for (const value of part.colors)
				colors.push(value);

			for (const index of part.indices)
				indices.push(index + vertexOffset);

			geometry.addGroup(indexStart, indices.length - indexStart, materialIndex);
		}

		geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
		geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
		geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
		geometry.setIndex(indices);
		geometry.computeBoundingSphere();
		geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
		return geometry;
	}

	private static addRefinedBlock(block: Block, bx: number, by: number, bz: number, getVoxelMaterial: (bx: number, by: number, bz: number, vx: number, vy: number, vz: number) => MaterialId | 0, addFace: (materialId: MaterialId, bx: number, by: number, bz: number, vx: number, vy: number, vz: number, scale: number, face: Face) => void): void {
		for (let y = 0; y < BLOCK_SIZE; y++) {
			for (let z = 0; z < BLOCK_SIZE; z++) {
				for (let x = 0; x < BLOCK_SIZE; x++) {
					const materialId = block.getVoxel(x, y, z);
					if (materialId === 0)
						continue;

					for (const face of FACES) {
						const [nx, ny, nz] = face.normal;
						if (getVoxelMaterial(bx, by, bz, x + nx, y + ny, z + nz) !== 0)
							continue;

						addFace(materialId, bx, by, bz, x, y, z, VOXEL_SIZE, face);
					}
				}
			}
		}
	}

	public static getRenderGroups(): RenderGroup[] {
		return [...new Set([...materials.getAll()].map((material) => material.renderGroup))].sort();
	}

	public static createMaterials(): THREE.MeshStandardMaterial[] {
		return TerrainMesh.getRenderGroups().map((group) => {
			if (group === "transparent")
				return new THREE.MeshStandardMaterial({ color: 0x75bde8, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.2 });

			return new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1 });
		});
	}

	private static appendSurface(surface: SurfaceMesh, geometry: Map<RenderGroup, MaterialGeometry>, renderGroups: RenderGroup[], paletteColumns: number, paletteRows: number): void {
		const definition = materials.get(surface.materialId);
		if (!definition)
			throw new Error(`Unknown material ID ${surface.materialId}.`);

		if (definition.paletteIndex >= paletteColumns * paletteRows)
			throw new RangeError(`Palette index ${definition.paletteIndex} exceeds the configured palette dimensions.`);

		let target = geometry.get(definition.renderGroup);
		if (!target) {
			target = { positions: [], normals: [], uvs: [], indices: [], colors: [] };
			geometry.set(definition.renderGroup, target);
			renderGroups.push(definition.renderGroup);
		}

		const vertexStart = target.positions.length / 3;
		const vertexNormals = surface.vertices.map(() => new THREE.Vector3());
		const column = definition.paletteIndex % paletteColumns;
		const row = Math.floor(definition.paletteIndex / paletteColumns);
		const u0 = column / paletteColumns;
		const u1 = (column + 1) / paletteColumns;
		const v0 = 1 - (row + 1) / paletteRows;
		const v1 = 1 - row / paletteRows;

		for (const vertex of surface.vertices) {
			target.positions.push(vertex.position.x, vertex.position.y, vertex.position.z);
			target.uvs.push(u0 + vertex.uv[0] * (u1 - u0), v0 + vertex.uv[1] * (v1 - v0));
			target.colors.push(1, 1, 1);
		}

		for (const triangle of surface.triangles) {
			const a = surface.vertices[triangle.a].position;
			const b = surface.vertices[triangle.b].position;
			const c = surface.vertices[triangle.c].position;
			const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));

			vertexNormals[triangle.a].add(normal);
			vertexNormals[triangle.b].add(normal);
			vertexNormals[triangle.c].add(normal);

			target.indices.push(vertexStart + triangle.a, vertexStart + triangle.b, vertexStart + triangle.c);
		}

		for (const normal of vertexNormals) {
			if (normal.lengthSq() > 0)
				normal.normalize();

			target.normals.push(normal.x, normal.y, normal.z);
		}
	}
}
