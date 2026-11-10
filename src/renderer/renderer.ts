import * as Three from "three";
import { Scene } from "./scene";
import { Controller } from "./controller";
import { observable } from "../reactive";
import { Module } from "../editor/store";
import type { Editor } from "../editor";
import { Chunk, Region, type World } from "../generator";
import { ElevationMap } from "../generator/maps/terrain";

type RenderMode = "heightmap" | "voxel";

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
	private seaLevelMesh: Three.Mesh | null = null;

	private world: World | null = null;
	private renderMode: RenderMode = "heightmap";
	private activeChunkIds = new Set<string>();

	private readonly raycaster = new Three.Raycaster();
	private readonly renderPlane = new Three.Plane(new Three.Vector3(0, 1, 0), 0);
	private readonly renderDirection = new Three.Vector3();
	private readonly renderIntersection = new Three.Vector3();

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

		for (const mesh of this.edgeMeshes.values()) {
			if (this.showEdges) {
				this.scene.add(mesh);
			} else {
				this.scene.remove(mesh);
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

		if (Array.isArray(mesh.material))
			mesh.material.forEach(material => material.dispose());
		else
			mesh.material.dispose();
	}

	private disposeEdgeMesh(mesh: Three.LineSegments) {
		this.scene.remove(mesh);
		mesh.geometry.dispose();

		if (Array.isArray(mesh.material))
			mesh.material.forEach(material => material.dispose());
		else
			mesh.material.dispose();
	}

	private disposeTerrainMeshes() {
		for (const mesh of this.terrainMeshes.values())
			this.disposeMesh(mesh);

		this.terrainMeshes.clear();

		for (const mesh of this.edgeMeshes.values())
			this.disposeEdgeMesh(mesh);

		this.edgeMeshes.clear();
		this.activeChunkIds.clear();

		if (this.seaLevelMesh) {
			this.disposeMesh(this.seaLevelMesh);
			this.seaLevelMesh = null;
		}
	}

	// @ts-ignore
	private disposeChunk(id: string) {
		const terrainMesh = this.terrainMeshes.get(id);

		if (terrainMesh) {
			this.disposeMesh(terrainMesh);
			this.terrainMeshes.delete(id);
		}

		const edgeMesh = this.edgeMeshes.get(id);

		if (edgeMesh) {
			this.disposeEdgeMesh(edgeMesh);
			this.edgeMeshes.delete(id);
		}
	}

	private getRenderCenter(world: World) {
		const worldParams = world.generator.worldParams;
		const offset = worldParams.offset;

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

		return new Three.Vector2(
			centerX + offset.x,
			centerZ + offset.y
		);
	}

	private getChunksInRange(world: World) {
		const center = this.getRenderCenter(world);
		const distance = Number.isFinite(this.renderDistance) ? Math.max(1, this.renderDistance) : 500;

		const region = new Region(
			center.x - distance,
			center.y - distance,
			distance * 2,
			distance * 2
		);

		return world.chunkManager.getChunks(region);
	}

	private createTerrainMesh(geometry: Three.BufferGeometry, key: string) {
		const material = new Three.MeshStandardMaterial({
			color: 0x899b76,
			roughness: 1,
			metalness: 0
		});

		const mesh = new Three.Mesh(geometry, material);
		mesh.castShadow = true;
		mesh.receiveShadow = true;

		this.terrainMeshes.set(key, mesh);
		this.scene.add(mesh);

		const edgesGeometry = new Three.EdgesGeometry(geometry, 1);
		const edgesMaterial = new Three.LineBasicMaterial({
			color: 0x303830,
			transparent: true,
			opacity: 0.45
		});

		const edgesMesh = new Three.LineSegments(edgesGeometry, edgesMaterial);

		this.edgeMeshes.set(key, edgesMesh);

		if (this.showEdges)
			this.scene.add(edgesMesh);
	}

	private createSeaLevelMesh(world: World) {
		const worldParams = world.generator.worldParams;
		const worldRegion = worldParams.region;
		const seaLevel = worldParams.terrain.seaLevel.seaLevel.state;

		const geometry = new Three.PlaneGeometry(worldRegion.width, worldRegion.height);
		geometry.rotateX(-Math.PI / 2);

		const material = new Three.MeshBasicMaterial({
			color: 0x4a9bd6,
			transparent: true,
			opacity: 0.35,
			depthWrite: false,
			side: Three.DoubleSide
		});

		const mesh = new Three.Mesh(geometry, material);
		mesh.position.set(worldParams.offset.x, seaLevel, worldParams.offset.y);
		mesh.renderOrder = 1;

		this.seaLevelMesh = mesh;
		this.scene.add(mesh);
	}

	private updateChunks() {
		if (!this.world)
			return;


		const chunks = this.getChunksInRange(this.world);

		const nextChunkIds = new Set(chunks.map(chunk => `${chunk.x}:${chunk.z}`));

		//for (const id of this.activeChunkIds) {
		//	if (!nextChunkIds.has(id))
		//		this.disposeChunk(id);
		//}

		for (const chunk of chunks) {
			const id = `${chunk.x}:${chunk.z}`;

			if (this.terrainMeshes.has(id))
				continue;

			this.renderChunk(this.world, chunk);
		}

		this.activeChunkIds = nextChunkIds;
	}

	private renderChunk(world: World, chunk: Chunk) {
		const map = world.chunkManager.generateMap(ElevationMap, chunk);

		if (this.renderMode === "heightmap") {
			this.renderHeightmapChunk(world, chunk, map);
		} else {
			this.renderVoxelChunk(world, chunk, map);
		}
	}

	private renderHeightmapChunk(world: World, chunk: Chunk, map: ElevationMap) {
		const worldParams = world.generator.worldParams;
		const samples = map.samples;
		const resolution = samples.resolution;

		const positions = new Float32Array(samples.width * samples.height * 3);
		const indices: number[] = [];

		for (let z = 0; z < samples.height; z++) {
			for (let x = 0; x < samples.width; x++) {
				const index = z * samples.width + x;
				const positionIndex = index * 3;
				const worldX = samples.x + x * resolution;
				const worldZ = samples.z + z * resolution;

				positions[positionIndex] = worldX - worldParams.offset.x;
				positions[positionIndex + 1] = map.data[index]!;
				positions[positionIndex + 2] = worldZ - worldParams.offset.y;
			}
		}

		for (let z = 0; z < samples.height - 1; z++) {
			for (let x = 0; x < samples.width - 1; x++) {
				const a = z * samples.width + x;
				const b = a + 1;
				const c = a + samples.width;
				const d = c + 1;

				indices.push(a, c, b);
				indices.push(b, c, d);
			}
		}

		const geometry = new Three.BufferGeometry();
		geometry.setAttribute("position", new Three.BufferAttribute(positions, 3));
		geometry.setIndex(indices);
		geometry.computeVertexNormals();
		geometry.computeBoundingBox();
		geometry.computeBoundingSphere();

		this.createTerrainMesh(geometry, `${chunk.x}:${chunk.z}`);
	}

	private renderVoxelChunk(world: World, chunk: Chunk, map: ElevationMap) {
		const worldParams = world.generator.worldParams;
		const samples = map.samples;
		const resolution = samples.resolution;

		const seaLevel = worldParams.terrain.seaLevel.seaLevel.state;
		const oceanDepth = worldParams.terrain.elevation.oceanDepth.state;
		const bottomY = Math.floor(seaLevel - oceanDepth);

		// Load neighbouring elevation maps so chunk borders have valid side heights.
		const neighbourRegion = chunk.region.expand(resolution);
		const neighbourChunks = world.chunkManager.getChunks(neighbourRegion);
		const heights = new Map<string, number>();

		for (const neighbour of neighbourChunks) {
			const neighbourMap = neighbour.x === chunk.x && neighbour.z === chunk.z
				? map
				: world.chunkManager.generateMap(ElevationMap, neighbour);

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
			positions.push(
				ax, ay, az,
				bx, by, bz,
				cx, cy, cz,
				ax, ay, az,
				cx, cy, cz,
				dx, dy, dz
			);

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

				// Top face.
				addFace(
					x0, height, z0,
					x0, height, z1,
					x1, height, z1,
					x1, height, z0,
					0, 1, 0
				);

				// West face.
				const westHeight = getHeight(worldX - resolution, worldZ);

				if (westHeight < height) {
					addFace(
						x0, westHeight, z0,
						x0, westHeight, z1,
						x0, height, z1,
						x0, height, z0,
						-1, 0, 0
					);
				}

				// East face.
				const eastHeight = getHeight(worldX + resolution, worldZ);

				if (eastHeight < height) {
					addFace(
						x1, eastHeight, z1,
						x1, eastHeight, z0,
						x1, height, z0,
						x1, height, z1,
						1, 0, 0
					);
				}

				// North face.
				const northHeight = getHeight(worldX, worldZ - resolution);

				if (northHeight < height) {
					addFace(
						x1, northHeight, z0,
						x0, northHeight, z0,
						x0, height, z0,
						x1, height, z0,
						0, 0, -1
					);
				}

				// South face.
				const southHeight = getHeight(worldX, worldZ + resolution);

				if (southHeight < height) {
					addFace(
						x0, southHeight, z1,
						x1, southHeight, z1,
						x1, height, z1,
						x0, height, z1,
						0, 0, 1
					);
				}
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
