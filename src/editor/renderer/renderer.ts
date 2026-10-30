
import { Color, DirectionalLight, GridHelper, HemisphereLight, Mesh, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { World } from "../generator/world";
import { TerrainMesh } from "./mesh/terrain-mesh";
import { state, store } from "../../state";

export type TerrainRenderMode = "materials" | "biomes";

@store
export class Renderer {
	private container: HTMLDivElement | null = null;
	private scene: Scene | null = null;
	private camera: PerspectiveCamera | null = null;
	private renderer: WebGLRenderer | null = null;
	private controls: OrbitControls | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private readonly terrain = new Map<string, Mesh>();

	private onViewTargetChanged: (() => void) | null = null;

	private currentWorld: World | null = null;

	@state
	private _renderMode: TerrainRenderMode = "materials";

	public get renderMode() { return this._renderMode; }

	public constructor() { }

	public initialize(container: HTMLDivElement) {
		if (this.container)
			throw new Error("Renderer is already initialized!");

		this.container = container;

		try {
			const scene = new Scene();
			scene.background = new Color(0x20242b);

			const camera = new PerspectiveCamera(50, 1, 0.1, 1000);
			const distance = 50;
			camera.position.set(distance, distance, distance);

			const renderer = new WebGLRenderer({ antialias: true });
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			container.appendChild(renderer.domElement);

			const controls = new OrbitControls(camera, renderer.domElement);
			controls.target.set(0, 0, 0);
			controls.enableDamping = true;
			controls.dampingFactor = 0.08;
			controls.minDistance = 2;
			controls.maxDistance = 200;
			controls.maxPolarAngle = Math.PI * 0.495;
			controls.addEventListener("change", () => {
				this.onViewTargetChanged?.();
			});
			controls.update();

			const grid = new GridHelper(20, 20, 0x778899, 0x414751);
			scene.add(grid);

			scene.add(new HemisphereLight(0xffffff, 0x606070, 2));

			const light = new DirectionalLight(0xffffff, 2);
			light.position.set(10, 20, 10);
			scene.add(light);

			this.scene = scene;
			this.camera = camera;
			this.renderer = renderer;
			this.controls = controls;

			this.resizeObserver = new ResizeObserver(() => {
				this.resize();
			});

			this.resizeObserver.observe(container);
			this.resize();

			renderer.setAnimationLoop(() => {
				controls.update();
				renderer.render(scene, camera);
			});
		} catch (error) {
			this.terminate();
			throw error;
		}
	}

	private resize() {
		if (!this.container || !this.camera || !this.renderer)
			return;

		const width = this.container.clientWidth;
		const height = this.container.clientHeight;

		if (width === 0 || height === 0)
			return;

		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
	}

	public getViewTarget(): Vector3 {
		if (!this.controls)
			throw new Error("Renderer is not initialized!");

		return this.controls.target.clone();
	}

	public terminate() {
		this.clearTerrain();

		this.resizeObserver?.disconnect();
		this.resizeObserver = null;

		this.controls?.dispose();
		this.controls = null;

		if (this.renderer) {
			this.renderer.setAnimationLoop(null);
			this.renderer.dispose();
			this.renderer.domElement.remove();
		}

		this.renderer = null;
		this.camera = null;
		this.scene = null;
		this.container = null;
	}


	public render(world: World): void {
		if (!this.scene)
			throw new Error("Renderer is not initialized!");

		this.currentWorld = world;
		this.clearTerrain();

		for (const chunk of world.getChunks())
			this.renderChunk(world, chunk.x, chunk.z);
	}

	public setRenderMode(mode: TerrainRenderMode): void {
		this._renderMode = mode;

		if (this.currentWorld)
			this.render(this.currentWorld);
	}

	public subscribeViewTargetChanged(callback: () => void): () => void {
		this.onViewTargetChanged = callback;

		return () => {
			if (this.onViewTargetChanged === callback)
				this.onViewTargetChanged = null;
		};
	}

	private clearTerrain(): void {
		if (!this.scene)
			return;

		for (const mesh of this.terrain.values()) {
			this.scene.remove(mesh);
			mesh.geometry.dispose();

			if (Array.isArray(mesh.material)) {
				for (const material of mesh.material)
					material.dispose();
			} else {
				mesh.material.dispose();
			}
		}

		this.terrain.clear();
	}

	public renderChunk(world: World, chunkX: number, chunkZ: number): void {
		if (!this.scene)
			throw new Error("Renderer is not initialized!");

		const chunk = world.getChunkAt(chunkX, chunkZ);

		if (!chunk)
			return;

		const key = `${chunkX},${chunkZ}`;
		const previous = this.terrain.get(key);

		if (previous) {
			this.scene.remove(previous);
			previous.geometry.dispose();
			this.terrain.delete(key);
		}

		const geometry = TerrainMesh.build(world, chunk, 8, 8, this._renderMode === "biomes");
		const mesh = new Mesh(geometry, TerrainMesh.createMaterials());

		this.terrain.set(key, mesh);
		this.scene.add(mesh);
	}
}
