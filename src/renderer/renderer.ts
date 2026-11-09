
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

	private controller: Controller | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private previousFrameTime: number = 0;

	private terrainMesh: Three.Mesh | null = null;
	private seaLevelMesh: Three.Mesh | null = null;

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
	}

	public renderWorld(world: World) {
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

		const center = new Three.Vector3(0, (minElevation + maxElevation) / 2, 0);
		const terrainWidth = width - 1;
		const terrainDepth = depth - 1;
		const terrainHeight = maxElevation - minElevation;

		const boundingRadius = Math.sqrt(
			terrainWidth * terrainWidth +
			terrainDepth * terrainDepth +
			terrainHeight * terrainHeight
		) / 2;

		const verticalFov = Three.MathUtils.degToRad(this.camera.fov);
		const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
		const limitingFov = Math.min(verticalFov, horizontalFov);

		const distance = boundingRadius / Math.sin(limitingFov / 2) * 1.1;

		this.controller?.focus(center, distance);
	}
}
