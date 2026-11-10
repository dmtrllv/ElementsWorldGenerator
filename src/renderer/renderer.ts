import * as Three from "three";
import { Scene } from "./scene";
import { Controller } from "./controller";
import { observable } from "../reactive";
import { Module } from "../editor/store";
import type { Editor } from "../editor";
import { Chunk, Region, type World } from "../generator";
import { ElevationMap } from "../generator/maps/terrain";

type RenderMode = "heightmap" | "voxel";

type ChunkBuild = {
	world: World;
	chunk: Chunk;
	id: string;
	generation: number;
	mode: RenderMode;
};

const MAX_CONCURRENT_CHUNK_BUILDS = 4;

@observable
export class Renderer extends Module {
	private element: HTMLDivElement | null = null;

	public readonly scene: Scene = new Scene();
	public readonly camera = new Three.PerspectiveCamera();
	public readonly glRenderer = new Three.WebGLRenderer({ antialias: true });

	public controller: Controller | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private previousFrameTime: number = 0;

	private readonly terrainMeshes = new Map<string, Three.Mesh>();
	private readonly edgeMeshes = new Map<string, Three.LineSegments>();
	private readonly terrainMaterial = new Three.MeshStandardMaterial({ color: 0x899b76, roughness: 1, metalness: 0 });
	private readonly edgeMaterial = new Three.LineBasicMaterial({ color: 0x303830, transparent: true, opacity: 0.45 });
	private seaLevelMesh: Three.Mesh | null = null;

	private world: World | null = null;
	private renderMode: RenderMode = "heightmap";
	private activeChunkIds = new Set<string>();

	private readonly chunkQueue: ChunkBuild[] = [];
	private readonly pendingChunkIds = new Set<string>();
	private activeChunkBuilds = 0;
	private chunkGeneration = 0;

	private lastChunkCenterX = Number.NaN;
	private lastChunkCenterZ = Number.NaN;
	private lastRenderDistance = Number.NaN;

	private readonly raycaster = new Three.Raycaster();
	private readonly renderPlane = new Three.Plane(new Three.Vector3(0, 1, 0), 0);
	private readonly renderDirection = new Three.Vector3();
	private readonly renderIntersection = new Three.Vector3();
	private readonly renderCenter = new Three.Vector2();

	@observable
	public showEdges: boolean = true;

	@observable
	public renderDistance: number = 200;

	public constructor(editor: Editor) {
		super(editor);

		this.camera.position.set(50, 35, 50);
		this.camera.near = 0.1;
		this.camera.far = 1_000_000;
		this.camera.updateProjectionMatrix();

		this.glRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.glRenderer.shadowMap.enabled = true;
		this.glRenderer.shadowMap.type = Three.PCFShadowMap;
	}

	public toggleEdges() {
		this.showEdges = !this.showEdges;

		for (const id of this.activeChunkIds) {
			const terrainMesh = this.terrainMeshes.get(id);

			if (this.showEdges && terrainMesh) {
				let edgeMesh = this.edgeMeshes.get(id);

				if (!edgeMesh) {
					edgeMesh = new Three.LineSegments(new Three.EdgesGeometry(terrainMesh.geometry, 1), this.edgeMaterial);
					this.edgeMeshes.set(id, edgeMesh);
				}

				if (edgeMesh.parent !== this.scene)
					this.scene.add(edgeMesh);
			} else {
				const edgeMesh = this.edgeMeshes.get(id);

				if (edgeMesh)
					this.scene.remove(edgeMesh);
			}
		}
	}

	public readonly initialize = (element: HTMLDivElement) => {
		if (this.element)
			throw new Error("Renderer is already initialized!");

		this.element = element;
		this.controller = new Controller(this, this.element);
		this.element.appendChild(this.glRenderer.domElement);

		this.resizeObserver = new ResizeObserver(() => {
			this.resize();
		});

		this.resizeObserver.observe(this.element);
		this.resize();

		this.glRenderer.setAnimationLoop(time => {
			const delta = this.previousFrameTime === 0 ? 0 : Math.min((time - this.previousFrameTime) / 1000, 0.05);
			this.previousFrameTime = time;
			this.renderInternal(delta);
		});
	}

	private renderInternal(delta: number) {
		if (!this.controller)
			return;

		this.controller.update(delta);
		this.updateChunks();

		this.glRenderer.setScissorTest(false);
		this.glRenderer.setViewport(0, 0, this.glRenderer.domElement.width, this.glRenderer.domElement.height);
		this.glRenderer.render(this.scene, this.camera);

		this.controller.render();
	}

	public dispose() {
		this.glRenderer.setAnimationLoop(null);
		this.disposeTerrainMeshes();

		if (this.element)
			this.controller?.dispose(this.element);

		this.controller = null;
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.element = null;
		this.world = null;

		this.terrainMaterial.dispose();
		this.edgeMaterial.dispose();
		this.glRenderer.dispose();
	}

	private resize() {
		if (!this.element)
			return;

		const width = this.element.clientWidth;
		const height = this.element.clientHeight;

		if (width === 0 || height === 0)
			return;

		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.glRenderer.setSize(width, height);
		this.glRenderer.setScissorTest(false);
		this.glRenderer.setViewport(0, 0, this.glRenderer.domElement.width, this.glRenderer.domElement.height);
		this.glRenderer.render(this.scene, this.camera);

		this.controller?.render();
	}

	private disposeMesh(mesh: Three.Mesh) {
		this.scene.remove(mesh);
		mesh.geometry.dispose();
	}

	private disposeEdgeMesh(mesh: Three.LineSegments) {
		this.scene.remove(mesh);
		mesh.geometry.dispose();
	}

	private disposeTerrainMeshes() {
		this.chunkGeneration++;
		this.chunkQueue.length = 0;
		this.pendingChunkIds.clear();

		for (const mesh of this.terrainMeshes.values())
			this.disposeMesh(mesh);

		this.terrainMeshes.clear();

		for (const mesh of this.edgeMeshes.values())
			this.disposeEdgeMesh(mesh);

		this.edgeMeshes.clear();
		this.activeChunkIds.clear();

		if (this.seaLevelMesh) {
			this.scene.remove(this.seaLevelMesh);
			this.seaLevelMesh.geometry.dispose();

			if (Array.isArray(this.seaLevelMesh.material)) {
				this.seaLevelMesh.material.forEach(material => material.dispose());
			} else {
				this.seaLevelMesh.material.dispose();
			}

			this.seaLevelMesh = null;
		}

		this.lastChunkCenterX = Number.NaN;
		this.lastChunkCenterZ = Number.NaN;
		this.lastRenderDistance = Number.NaN;
	}

	private getRenderCenter(world: World): Three.Vector2 {
		const offset = world.generator.worldParams.offset;

		let centerX = this.camera.position.x;
		let centerZ = this.camera.position.z;

		if (this.controller?.cameraMode === "orbital") {
			this.camera.getWorldDirection(this.renderDirection);
			this.raycaster.set(this.camera.position, this.renderDirection);

			const intersection = this.raycaster.ray.intersectPlane(this.renderPlane, this.renderIntersection);

			if (intersection) {
				centerX = intersection.x;
				centerZ = intersection.z;
			}
		}

		return this.renderCenter.set(centerX + offset.x, centerZ + offset.y);
	}

	private getChunksInRange(world: World, center: Three.Vector2) {
		const worldParams = world.generator.worldParams;
		const worldRegion = worldParams.region;
		const maxDistance = Math.min(worldRegion.width, worldRegion.height) / 2;
		const distance = Math.min(Number.isFinite(this.renderDistance) ? Math.max(1, this.renderDistance) : 500, maxDistance - Number.EPSILON);

		const region = new Region(center.x - distance, center.y - distance, distance * 2, distance * 2);

		const minPeriodX = Math.floor((region.x - worldRegion.x) / worldRegion.width);
		const minPeriodZ = Math.floor((region.z - worldRegion.z) / worldRegion.height);
		const maxPeriodX = Math.ceil((region.maxX - worldRegion.x) / worldRegion.width) - 1;
		const maxPeriodZ = Math.ceil((region.maxZ - worldRegion.z) / worldRegion.height) - 1;

		const chunks: { chunk: Chunk; offsetX: number; offsetZ: number }[] = [];

		for (let periodZ = minPeriodZ; periodZ <= maxPeriodZ; periodZ++) {
			for (let periodX = minPeriodX; periodX <= maxPeriodX; periodX++) {
				const offsetX = periodX * worldRegion.width;
				const offsetZ = periodZ * worldRegion.height;
				const periodRegion = new Region(worldRegion.x + offsetX, worldRegion.z + offsetZ, worldRegion.width, worldRegion.height);
				const intersection = region.intersection(periodRegion);

				if (!intersection)
					continue;

				const canonicalRegion = new Region(intersection.x - offsetX, intersection.z - offsetZ, intersection.width, intersection.height);

				for (const chunk of world.chunkManager.getChunks(canonicalRegion)) {
					chunks.push({ chunk, offsetX, offsetZ });
				}
			}
		}

		return chunks;
	}

	private positionChunk(id: string, offsetX: number, offsetZ: number) {
		const terrainMesh = this.terrainMeshes.get(id);
		const edgeMesh = this.edgeMeshes.get(id);

		if (terrainMesh) {
			terrainMesh.position.x = offsetX;
			terrainMesh.position.z = offsetZ;
		}

		if (edgeMesh) {
			edgeMesh.position.x = offsetX;
			edgeMesh.position.z = offsetZ;
		}
	}

	private createTerrainMesh(geometry: Three.BufferGeometry, key: string) {
		const mesh = new Three.Mesh(geometry, this.terrainMaterial);
		mesh.castShadow = true;
		mesh.receiveShadow = true;

		this.terrainMeshes.set(key, mesh);

		if (this.activeChunkIds.has(key))
			this.scene.add(mesh);

		if (this.showEdges && this.activeChunkIds.has(key)) {
			const edgesMesh = new Three.LineSegments(new Three.EdgesGeometry(geometry, 1), this.edgeMaterial);
			this.edgeMeshes.set(key, edgesMesh);
			this.scene.add(edgesMesh);
		}
	}

	private createSeaLevelMesh(world: World) {
		const seaLevel = world.generator.worldParams.terrain.seaLevel.seaLevel.state;
		const geometry = new Three.PlaneGeometry(1, 1);
		geometry.rotateX(-Math.PI / 2);

		const material = new Three.MeshBasicMaterial({
			color: 0x4a9bd6,
			transparent: true,
			opacity: 0.35,
			depthWrite: false,
			side: Three.DoubleSide
		});

		const mesh = new Three.Mesh(geometry, material);
		mesh.position.set(0, seaLevel, 0);
		mesh.renderOrder = 1;

		this.seaLevelMesh = mesh;
		this.scene.add(mesh);
	}

	private updateSeaLevelMesh(world: World, center: Three.Vector2) {
		if (!this.seaLevelMesh)
			return;

		const worldParams = world.generator.worldParams;
		const distance = Number.isFinite(this.renderDistance) ? Math.max(1, this.renderDistance) : 500;
		const size = (distance + worldParams.chunkSize) * 2;

		this.seaLevelMesh.position.set(
			center.x - worldParams.offset.x,
			worldParams.terrain.seaLevel.seaLevel.state,
			center.y - worldParams.offset.y
		);

		this.seaLevelMesh.scale.set(size, 1, size);
	}

	private queueChunk(world: World, chunk: Chunk, id: string) {
		const generation = this.chunkGeneration;
		const pendingId = `${generation}:${id}`;

		if (this.terrainMeshes.has(id) || this.pendingChunkIds.has(pendingId))
			return;

		this.pendingChunkIds.add(pendingId);
		this.chunkQueue.push({
			world,
			chunk,
			id,
			generation,
			mode: this.renderMode
		});

		this.pumpChunkQueue();
	}

	private pumpChunkQueue() {
		while (this.activeChunkBuilds < MAX_CONCURRENT_CHUNK_BUILDS && this.chunkQueue.length > 0) {
			const build = this.chunkQueue.shift()!;
			const pendingId = `${build.generation}:${build.id}`;

			if (build.generation !== this.chunkGeneration || build.world !== this.world || build.mode !== this.renderMode) {
				this.pendingChunkIds.delete(pendingId);
				continue;
			}

			this.activeChunkBuilds++;

			void this.buildChunk(build).catch(error => {
				console.error(`Failed to render chunk ${build.id}:`, error);
			}).finally(() => {
				this.pendingChunkIds.delete(pendingId);
				this.activeChunkBuilds--;
				this.pumpChunkQueue();
			});
		}
	}

	private async buildChunk(build: ChunkBuild) {
		const map = await build.world.chunkManager.generateMap(ElevationMap, build.chunk);

		if (build.generation !== this.chunkGeneration || build.world !== this.world || build.mode !== this.renderMode)
			return;

		if (build.mode === "heightmap")
			this.renderHeightmapChunk(build.world, build.chunk, map);
		else
			await this.renderVoxelChunk(build.world, build.chunk, map);
	}

	private updateChunks() {
		if (!this.world)
			return;

		const world = this.world;
		const worldParams = world.generator.worldParams;
		const center = this.getRenderCenter(world);

		this.updateSeaLevelMesh(world, center);

		const centerChunkX = Math.floor((center.x - worldParams.region.x) / worldParams.chunkSize);
		const centerChunkZ = Math.floor((center.y - worldParams.region.z) / worldParams.chunkSize);

		if (
			centerChunkX === this.lastChunkCenterX &&
			centerChunkZ === this.lastChunkCenterZ &&
			this.renderDistance === this.lastRenderDistance
		)
			return;

		this.lastChunkCenterX = centerChunkX;
		this.lastChunkCenterZ = centerChunkZ;
		this.lastRenderDistance = this.renderDistance;

		const chunks = this.getChunksInRange(world, center);
		const nextChunkIds = new Set<string>();

		for (const { chunk, offsetX, offsetZ } of chunks) {
			const id = `${chunk.x}:${chunk.z}`;
			nextChunkIds.add(id);

			const terrainMesh = this.terrainMeshes.get(id);
			const edgeMesh = this.edgeMeshes.get(id);

			if (terrainMesh) {
				if (terrainMesh.parent !== this.scene)
					this.scene.add(terrainMesh);

				if (this.showEdges) {
					let activeEdgeMesh = edgeMesh;

					if (!activeEdgeMesh) {
						activeEdgeMesh = new Three.LineSegments(new Three.EdgesGeometry(terrainMesh.geometry, 1), this.edgeMaterial);
						this.edgeMeshes.set(id, activeEdgeMesh);
					}

					if (activeEdgeMesh.parent !== this.scene)
						this.scene.add(activeEdgeMesh);
				}

				this.positionChunk(id, offsetX, offsetZ);
			} else {
				this.queueChunk(world, chunk, id);
			}
		}

		for (const id of this.activeChunkIds) {
			if (nextChunkIds.has(id))
				continue;

			const terrainMesh = this.terrainMeshes.get(id);
			const edgeMesh = this.edgeMeshes.get(id);

			if (terrainMesh)
				this.scene.remove(terrainMesh);

			if (edgeMesh)
				this.scene.remove(edgeMesh);
		}

		this.activeChunkIds = nextChunkIds;
	}

	private renderHeightmapChunk(world: World, chunk: Chunk, map: ElevationMap) {
		const worldParams = world.generator.worldParams;
		const samples = map.samples;
		const resolution = samples.resolution;
		const vertexCount = samples.width * samples.height;

		const positions = new Float32Array(vertexCount * 3);
		const indices = new Uint32Array((samples.width - 1) * (samples.height - 1) * 6);

		for (let z = 0; z < samples.height; z++) {
			for (let x = 0; x < samples.width; x++) {
				const index = z * samples.width + x;
				const positionIndex = index * 3;

				positions[positionIndex] = samples.x + x * resolution - worldParams.offset.x;
				positions[positionIndex + 1] = map.data[index]!;
				positions[positionIndex + 2] = samples.z + z * resolution - worldParams.offset.y;
			}
		}

		let indexOffset = 0;

		for (let z = 0; z < samples.height - 1; z++) {
			for (let x = 0; x < samples.width - 1; x++) {
				const a = z * samples.width + x;
				const b = a + 1;
				const c = a + samples.width;
				const d = c + 1;

				indices[indexOffset++] = a;
				indices[indexOffset++] = c;
				indices[indexOffset++] = b;
				indices[indexOffset++] = b;
				indices[indexOffset++] = c;
				indices[indexOffset++] = d;
			}
		}

		const geometry = new Three.BufferGeometry();
		geometry.setAttribute("position", new Three.BufferAttribute(positions, 3));
		geometry.setIndex(new Three.BufferAttribute(indices, 1));
		geometry.computeVertexNormals();
		geometry.computeBoundingBox();
		geometry.computeBoundingSphere();

		this.createTerrainMesh(geometry, `${chunk.x}:${chunk.z}`);
	}

	private async renderVoxelChunk(world: World, chunk: Chunk, map: ElevationMap) {
		const worldParams = world.generator.worldParams;
		const samples = map.samples;
		const resolution = samples.resolution;

		const seaLevel = worldParams.terrain.seaLevel.seaLevel.state;
		const oceanDepth = worldParams.terrain.elevation.oceanDepth.state;
		const bottomY = Math.floor(seaLevel - oceanDepth);

		const neighbourRegion = chunk.region.expand(resolution);
		const neighbourChunks = world.chunkManager.getChunks(neighbourRegion);
		const heights = new Map<string, number>();

		for (const neighbour of neighbourChunks) {
			const neighbourMap = neighbour.x === chunk.x && neighbour.z === chunk.z
				? map
				: await world.chunkManager.generateMap(ElevationMap, neighbour);

			const neighbourSamples = neighbourMap.samples;

			for (let z = 0; z < neighbourSamples.height; z++) {
				for (let x = 0; x < neighbourSamples.width; x++) {
					const worldX = neighbourSamples.x + x * neighbourSamples.resolution;
					const worldZ = neighbourSamples.z + z * neighbourSamples.resolution;
					const index = z * neighbourSamples.width + x;

					heights.set(`${worldX}:${worldZ}`, Math.floor(neighbourMap.data[index]!));
				}
			}
		}

		const getHeight = (x: number, z: number) => heights.get(`${x}:${z}`) ?? bottomY;
		const positions: number[] = [];
		const normals: number[] = [];

		const addFace = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number, dx: number, dy: number, dz: number, nx: number, ny: number, nz: number) => {
			positions.push(ax, ay, az, bx, by, bz, cx, cy, cz, ax, ay, az, cx, cy, cz, dx, dy, dz);

			for (let i = 0; i < 6; i++)
				normals.push(nx, ny, nz);
		};

		for (let z = 0; z < samples.height; z++) {
			for (let x = 0; x < samples.width; x++) {
				const index = z * samples.width + x;
				const height = Math.floor(map.data[index]!);

				if (height <= bottomY)
					continue;

				const worldX = samples.x + x * resolution;
				const worldZ = samples.z + z * resolution;
				const x0 = worldX - worldParams.offset.x;
				const x1 = x0 + resolution;
				const z0 = worldZ - worldParams.offset.y;
				const z1 = z0 + resolution;

				addFace(x0, height, z0, x0, height, z1, x1, height, z1, x1, height, z0, 0, 1, 0);

				const westHeight = getHeight(worldX - resolution, worldZ);

				if (westHeight < height)
					addFace(x0, westHeight, z0, x0, westHeight, z1, x0, height, z1, x0, height, z0, -1, 0, 0);

				const eastHeight = getHeight(worldX + resolution, worldZ);

				if (eastHeight < height)
					addFace(x1, eastHeight, z1, x1, eastHeight, z0, x1, height, z0, x1, height, z1, 1, 0, 0);

				const northHeight = getHeight(worldX, worldZ - resolution);

				if (northHeight < height)
					addFace(x1, northHeight, z0, x0, northHeight, z0, x0, height, z0, x1, height, z0, 0, 0, -1);

				const southHeight = getHeight(worldX, worldZ + resolution);

				if (southHeight < height)
					addFace(x0, southHeight, z1, x1, southHeight, z1, x1, height, z1, x0, height, z1, 0, 0, 1);
			}
		}

		const geometry = new Three.BufferGeometry();
		geometry.setAttribute("position", new Three.Float32BufferAttribute(positions, 3));
		geometry.setAttribute("normal", new Three.Float32BufferAttribute(normals, 3));
		geometry.computeBoundingBox();
		geometry.computeBoundingSphere();

		this.createTerrainMesh(geometry, `${chunk.x}:${chunk.z}`);
	}

	public renderWorldHeightmap(world: World) {
		this.world = world;
		this.renderMode = "heightmap";

		this.disposeTerrainMeshes();
		this.createSeaLevelMesh(world);
		this.updateChunks();
	}

	public renderVoxelWorld(world: World) {
		this.world = world;
		this.renderMode = "voxel";

		this.disposeTerrainMeshes();
		this.createSeaLevelMesh(world);
		this.updateChunks();
	}
}
