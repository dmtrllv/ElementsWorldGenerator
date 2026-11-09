
import * as Three from "three";
import { Scene } from "./scene";
import { Controller } from "./controller";
import { observable } from "../reactive";
import { Module } from "../editor/store";
import type { Editor } from "../editor";
import type { World } from "../generator";

import { ElevationMap } from "../generator/maps/terrain";
import { GenerationScope } from "../generator/passes/pass";

@observable
export class Renderer extends Module {
	private element: HTMLDivElement | null = null;

	public readonly scene: Scene = new Scene();
	public readonly camera = new Three.PerspectiveCamera();
	public readonly glRenderer = new Three.WebGLRenderer({ antialias: true });

	public controller: Controller | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private previousFrameTime: number = 0;

	private terrainMesh: Three.Mesh | null = null;
	private seaLevelMesh: Three.Mesh | null = null;
	private edgeMesh: Three.LineSegments | null = null;

	@observable
	public showEdges: boolean = true;

	public constructor(editor: Editor) {
		super(editor);

		this.camera.position.set(50, 35, 50);
		this.camera.near = 0.1;
		this.camera.far = 1000000;
		this.camera.updateProjectionMatrix();

		this.glRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.glRenderer.shadowMap.enabled = true;
		this.glRenderer.shadowMap.type = Three.PCFShadowMap;
	}

	public toggleEdges() {
		this.showEdges = !this.showEdges;
		if(!this.edgeMesh)
			return;
		if(this.showEdges) {
			this.scene.add(this.edgeMesh);
		} else {
			this.scene.remove(this.edgeMesh);
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

		this.glRenderer.setScissorTest(false);
		this.glRenderer.setViewport(0, 0, this.glRenderer.domElement.width, this.glRenderer.domElement.height);

		this.glRenderer.render(this.scene, this.camera);

		this.controller.render();
	}

	public dispose() {
		this.glRenderer.setAnimationLoop(null);
		this.disposeTerrainMesh();

		if (this.element)
			this.controller?.dispose(this.element);

		this.controller = null;
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.element = null;

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

	private disposeTerrainMesh() {
		if (this.terrainMesh) {
			this.disposeMesh(this.terrainMesh);
			this.terrainMesh = null;
		}

		if (this.seaLevelMesh) {
			this.disposeMesh(this.seaLevelMesh);
			this.seaLevelMesh = null;
		}

		if(this.edgeMesh) {
			this.scene.remove(this.edgeMesh);
			this.edgeMesh.geometry.dispose();
		}
	}

	public renderWorldHeightmap(world: World) {
		const generator = world.generator;
		const worldParams = generator.worldParams;
		const elevationMap = generator.generateMap(ElevationMap, GenerationScope.Global);
		const elevation = elevationMap.data;

		const width = worldParams.size.x;
		const depth = worldParams.size.z;

		const seaLevel = worldParams.terrain.seaLevel.seaLevel.state;

		const positions = new Float32Array(width * depth * 3);
		const indices: number[] = [];

		let minElevation = Infinity;
		let maxElevation = -Infinity;

		for (let z = 0; z < depth; z++) {
			for (let x = 0; x < width; x++) {
				const index = z * width + x;
				const positionIndex = index * 3;
				const elevationValue = elevation[index]!;

				positions[positionIndex] = x - (width - 1) / 2;
				positions[positionIndex + 1] = elevationValue;
				positions[positionIndex + 2] = z - (depth - 1) / 2;

				minElevation = Math.min(minElevation, elevationValue);
				maxElevation = Math.max(maxElevation, elevationValue);
			}
		}

		for (let z = 0; z < depth - 1; z++) {
			for (let x = 0; x < width - 1; x++) {
				const a = z * width + x;
				const b = a + 1;
				const c = a + width;
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

		const material = new Three.MeshStandardMaterial({
			color: 0x899b76,
			roughness: 1,
			metalness: 0
		});

		const mesh = new Three.Mesh(geometry, material);
		mesh.castShadow = true;
		mesh.receiveShadow = true;

		if (this.terrainMesh)
			this.disposeMesh(this.terrainMesh);

		this.terrainMesh = mesh;
		this.scene.add(mesh);
		
		if(this.edgeMesh) {
			this.scene.remove(this.edgeMesh);
			this.edgeMesh.geometry.dispose();
		}

		const edgesGeometry = new Three.EdgesGeometry(geometry, 1);
		const edgesMaterial = new Three.LineBasicMaterial({
			color: 0x303830,
			transparent: true,
			opacity: 0.45
		});

		this.edgeMesh = new Three.LineSegments(edgesGeometry, edgesMaterial);
		if(this.showEdges) {
			this.scene.add(this.edgeMesh);
		} 

		const seaLevelGeometry = new Three.PlaneGeometry(width - 1, depth - 1);
		seaLevelGeometry.rotateX(-Math.PI / 2);

		const seaLevelMaterial = new Three.MeshBasicMaterial({
			color: 0x4a9bd6,
			transparent: true,
			opacity: 0.35,
			depthWrite: false,
			side: Three.DoubleSide
		});

		const seaLevelMesh = new Three.Mesh(seaLevelGeometry, seaLevelMaterial);
		seaLevelMesh.position.set(0, seaLevel, 0);
		seaLevelMesh.renderOrder = 1;

		if (this.seaLevelMesh)
			this.disposeMesh(this.seaLevelMesh);

		this.seaLevelMesh = seaLevelMesh;
		this.scene.add(seaLevelMesh);
	}


	public renderVoxelWorld(world: World) {
		const generator = world.generator;
		const worldParams = generator.worldParams;
		const elevationMap = generator.generateMap(ElevationMap, GenerationScope.Global);
		const elevation = elevationMap.data;

		const width = worldParams.size.x;
		const depth = worldParams.size.z;

		const seaLevel = worldParams.terrain.seaLevel.seaLevel.state;
		const oceanDepth = worldParams.terrain.elevation.oceanDepth.state;
		const bottomY = Math.floor(seaLevel - oceanDepth);

		const heights = new Int32Array(width * depth);

		let minElevation = Infinity;
		let maxElevation = -Infinity;

		for (let z = 0; z < depth; z++) {
			for (let x = 0; x < width; x++) {
				const index = z * width + x;
				const height = Math.floor(elevation[index]!);

				heights[index] = height;

				minElevation = Math.min(minElevation, height);
				maxElevation = Math.max(maxElevation, height);
			}
		}

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

		const getHeight = (x: number, z: number) => {
			if (x < 0 || x >= width || z < 0 || z >= depth)
				return bottomY;

			return heights[z * width + x]!;
		};

		for (let z = 0; z < depth; z++) {
			for (let x = 0; x < width; x++) {
				const index = z * width + x;
				const height = heights[index]!;

				if (height <= bottomY)
					continue;

				const x0 = x - width / 2;
				const x1 = x0 + 1;
				const z0 = z - depth / 2;
				const z1 = z0 + 1;

				// Top face.
				addFace(
					x0, height, z0,
					x0, height, z1,
					x1, height, z1,
					x1, height, z0,
					0, 1, 0
				);

				// West face.
				const westHeight = getHeight(x - 1, z);

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
				const eastHeight = getHeight(x + 1, z);

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
				const northHeight = getHeight(x, z - 1);

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
				const southHeight = getHeight(x, z + 1);

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

		const material = new Three.MeshStandardMaterial({
			color: 0x899b76,
			roughness: 1,
			metalness: 0
		});

		const mesh = new Three.Mesh(geometry, material);
		mesh.castShadow = true;
		mesh.receiveShadow = true;

		this.disposeTerrainMesh();

		this.terrainMesh = mesh;
		this.scene.add(mesh);

		const edgesGeometry = new Three.EdgesGeometry(geometry, 1);
		const edgesMaterial = new Three.LineBasicMaterial({
			color: 0x303830,
			transparent: true,
			opacity: 0.45
		});

		this.edgeMesh = new Three.LineSegments(edgesGeometry, edgesMaterial);
		if(this.showEdges) {
			this.scene.add(this.edgeMesh);
		} 

		// Sea level.
		const seaLevelGeometry = new Three.PlaneGeometry(width, depth);
		seaLevelGeometry.rotateX(-Math.PI / 2);

		const seaLevelMaterial = new Three.MeshBasicMaterial({
			color: 0x4a9bd6,
			transparent: true,
			opacity: 0.35,
			depthWrite: false,
			side: Three.DoubleSide
		});

		const seaLevelMesh = new Three.Mesh(seaLevelGeometry, seaLevelMaterial);
		seaLevelMesh.position.set(0, seaLevel, 0);
		seaLevelMesh.renderOrder = 1;

		this.seaLevelMesh = seaLevelMesh;
		this.scene.add(seaLevelMesh);
	}

}
