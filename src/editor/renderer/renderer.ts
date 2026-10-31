
import { Color, DirectionalLight, GridHelper, HemisphereLight, Mesh, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
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

	@state
	private _cameraMode: "orbital" | "first-person" = "orbital";

	public get cameraMode() { return this._cameraMode; }

	private pointerControls: PointerLockControls | null = null;
	private readonly movementKeys = new Set<string>();
	private readonly forward = new Vector3();
	private readonly right = new Vector3();
	private readonly movement = new Vector3();
	private readonly up = new Vector3(0, 1, 0);
	private previousFrameTime = 0;
	private readonly movementSpeed = 12;

	private onCanvasClick = () => {
		if (this._cameraMode === "first-person")
			this.pointerControls?.lock();
	};

	private onKeyDown = (event: KeyboardEvent) => {
		if (!this.pointerControls?.isLocked)
			return;

		if (!["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight"].includes(event.code))
			return;

		this.movementKeys.add(event.code);

		if (event.code === "Space")
			event.preventDefault();
	};

	private onKeyUp = (event: KeyboardEvent) => {
		this.movementKeys.delete(event.code);
	};

	private onWindowBlur = () => {
		this.movementKeys.clear();
	};

	private onPointerUnlock = () => {
		this.movementKeys.clear();
	};

	private onPointerChange = () => {
		this.onViewTargetChanged?.();
	};

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

			const pointerControls = new PointerLockControls(camera, renderer.domElement);
			pointerControls.addEventListener("change", this.onPointerChange);
			pointerControls.addEventListener("unlock", this.onPointerUnlock);

			renderer.domElement.addEventListener("click", this.onCanvasClick);
			document.addEventListener("keydown", this.onKeyDown);
			document.addEventListener("keyup", this.onKeyUp);
			window.addEventListener("blur", this.onWindowBlur);

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
			this.pointerControls = pointerControls;

			this.resizeObserver = new ResizeObserver(() => {
				this.resize();
			});

			this.resizeObserver.observe(container);
			this.resize();

			renderer.setAnimationLoop(time => {
				const delta = this.previousFrameTime === 0 ? 0 : Math.min((time - this.previousFrameTime) / 1000, 0.05);
				this.previousFrameTime = time;

				if (this._cameraMode === "orbital") {
					controls.update();
				} else {
					this.updateFirstPerson(delta);
				}

				renderer.render(scene, camera);
			});
		} catch (error) {
			this.terminate();
			throw error;
		}
	}

	private updateFirstPerson(delta: number) {
		if (!this.camera || !this.pointerControls?.isLocked)
			return;

		this.pointerControls.getDirection(this.forward);
		this.forward.y = 0;

		if (this.forward.lengthSq() < 0.0001)
			this.forward.set(-Math.sin(this.camera.rotation.y), 0, -Math.cos(this.camera.rotation.y));

		this.forward.normalize();
		this.right.crossVectors(this.forward, this.up).normalize();
		this.movement.set(0, 0, 0);

		if (this.movementKeys.has("KeyW"))
			this.movement.add(this.forward);

		if (this.movementKeys.has("KeyS"))
			this.movement.sub(this.forward);

		if (this.movementKeys.has("KeyD"))
			this.movement.add(this.right);

		if (this.movementKeys.has("KeyA"))
			this.movement.sub(this.right);

		if (this.movementKeys.has("Space"))
			this.movement.y += 1;

		if (this.movementKeys.has("ShiftLeft") || this.movementKeys.has("ShiftRight"))
			this.movement.y -= 1;

		if (this.movement.lengthSq() === 0)
			return;

		this.movement.normalize();
		this.camera.position.addScaledVector(this.movement, this.movementSpeed * delta);
		this.onViewTargetChanged?.();
	}

	public setCameraMode(mode: "orbital" | "first-person") {
		if (this._cameraMode === mode)
			return;

		this._cameraMode = mode;
		this.movementKeys.clear();

		if (!this.camera || !this.controls)
			return;

		if (mode === "first-person") {
			this.controls.enabled = false;
			return;
		}

		this.pointerControls?.unlock();

		const direction = new Vector3();
		this.camera.getWorldDirection(direction);

		this.controls.target.copy(this.camera.position).addScaledVector(direction, 10);
		this.controls.enabled = true;
		this.controls.update();
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

		return this._cameraMode === "first-person" ? this.camera!.position.clone() : this.controls.target.clone();
	}

	public terminate() {
		this.clearTerrain();

		this.resizeObserver?.disconnect();
		this.resizeObserver = null;

		this.container?.removeEventListener("click", this.onCanvasClick);
		document.removeEventListener("keydown", this.onKeyDown);
		document.removeEventListener("keyup", this.onKeyUp);
		window.removeEventListener("blur", this.onWindowBlur);

		this.pointerControls?.removeEventListener("change", this.onPointerChange);
		this.pointerControls?.removeEventListener("unlock", this.onPointerUnlock);
		this.pointerControls?.dispose();
		this.pointerControls = null;

		this.movementKeys.clear();
		this.previousFrameTime = 0;

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


		for (const chunk of world.getChunks()) {
			this.renderChunk(world, chunk.x, chunk.z);
		}
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

	public getViewPosition(): Vector3 {
		if (!this.camera)
			throw new Error("Renderer is not initialized!");

		if (this._cameraMode === "first-person")
			return this.camera.position.clone();

		const direction = new Vector3();
		this.camera.getWorldDirection(direction);

		if (Math.abs(direction.y) < 0.0001)
			return this.controls!.target.clone();

		const distance = -this.camera.position.y / direction.y;

		return this.camera.position.clone().addScaledVector(direction, distance);
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

			if (Array.isArray(previous.material)) {
				for (const material of previous.material)
					material.dispose();
			} else {
				previous.material.dispose();
			}

			this.terrain.delete(key);
		}

		const geometry = TerrainMesh.build(world, chunk, 8, 8, this._renderMode === "biomes");
		const mesh = new Mesh(geometry, TerrainMesh.createMaterials());

		this.terrain.set(key, mesh);
		this.scene.add(mesh);
	}
}
