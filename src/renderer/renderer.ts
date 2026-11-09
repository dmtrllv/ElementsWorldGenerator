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
		this.camera.far = 100000;
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

	private disposeTerrainMesh() {
		if (this.terrainMesh) {
			this.scene.remove(this.terrainMesh);
			this.terrainMesh.geometry.dispose();
			(this.terrainMesh.material as any).dispose();
			this.terrainMesh = null;
		}
		if (this.seaLevelMesh) {
			this.scene.remove(this.seaLevelMesh);
			this.seaLevelMesh.geometry.dispose();
			(this.seaLevelMesh.material as Three.Material).dispose();
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
		const height = worldParams.size.y;

		const elevationParams = worldParams.terrain.elevation;
		const seaLevelParams = worldParams.terrain.seaLevel;

		const minElevation = seaLevelParams.seaLevel.state - elevationParams.oceanDepth.state;
		const maxElevation = seaLevelParams.seaLevel.state + elevationParams.landElevation.state + elevationParams.mountainHeight.state;
		const elevationRange = maxElevation - minElevation;

		const positions = new Float32Array(width * depth * 3);
		const indices: number[] = [];

		for (let z = 0; z < depth; z++) {
			for (let x = 0; x < width; x++) {
				const index = z * width + x;
				const positionIndex = index * 3;

				positions[positionIndex] = -width / 2 + x;
				positions[positionIndex + 1] = elevation[index]!;
				positions[positionIndex + 2] = -depth / 2 + z;
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
		geometry.computeBoundingSphere();

		const material = new Three.MeshStandardMaterial({
			color: 0x899b76,
			roughness: 1,
			metalness: 0
		});

		const mesh = new Three.Mesh(geometry, material);
		mesh.castShadow = true;
		mesh.receiveShadow = true;

		if (this.terrainMesh) {
			this.scene.remove(this.terrainMesh);
			this.terrainMesh.geometry.dispose();

			const oldMaterial = this.terrainMesh.material;
			if (Array.isArray(oldMaterial))
				oldMaterial.forEach(m => m.dispose());
			else
				oldMaterial.dispose();
		}

		this.terrainMesh = mesh;
		this.scene.add(mesh);

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
		seaLevelMesh.position.set(0, seaLevelParams.seaLevel.state, 0);
		seaLevelMesh.renderOrder = 1;

		if (this.seaLevelMesh) {
			this.scene.remove(this.seaLevelMesh);
			this.seaLevelMesh.geometry.dispose();
			(this.seaLevelMesh.material as Three.Material).dispose();
		}

		this.seaLevelMesh = seaLevelMesh;
		this.scene.add(seaLevelMesh);

		const center = new Three.Vector3(0, height / 2, 0);
		const maxDimension = Math.max(width, depth, height);
		const distance = maxDimension / (2 * Math.tan(Three.MathUtils.degToRad(this.camera.fov / 2))) * 1.5;

		this.controller?.focus(center, distance);
	}
}
