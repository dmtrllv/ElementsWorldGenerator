
import { BufferAttribute, BufferGeometry, Color, DirectionalLight, DoubleSide, GridHelper, HemisphereLight, Material, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { World } from "../generator/world";
import { TerrainMesh } from "./mesh/TerrainMesh";

export type TerrainDebugMode = "materials" | "biomes";

export class Renderer {
	private container: HTMLDivElement | null = null;
	private scene: Scene | null = null;
	private camera: PerspectiveCamera | null = null;
	private renderer: WebGLRenderer | null = null;
	private controls: OrbitControls | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private terrain: Mesh | null = null;

	private currentWorld: World | null = null;
	private debugMode: TerrainDebugMode = "materials";

	public constructor() { }

	public initialize(container: HTMLDivElement) {
		if (this.container)
			throw new Error("Renderer is already initialized!");

		this.container = container;

		try {
			const scene = new Scene();
			scene.background = new Color(0x20242b);

			const camera = new PerspectiveCamera(50, 1, 0.1, 1000);
			camera.position.set(20, 20, 20);

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

	public terminate() {
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


	public render(world: World) {
		if (!this.scene)
			throw new Error("Renderer is not initialized!");

		this.currentWorld = world;

		if (this.terrain) {
			this.scene.remove(this.terrain);
			this.terrain.geometry.dispose();
			if (Array.isArray(this.terrain.material)) {
				for (const material of this.terrain.material)
					material.dispose();
			} else {
				this.terrain.material.dispose();
			}
			this.terrain = null;
		}

		const width = world.width;
		const depth = world.depth;

		const positions = new Float32Array(width * depth * 3);
		const indices: number[] = [];

		for (let z = 0; z < depth; z++) {
			for (let x = 0; x < width; x++) {
				const index = (z * width + x) * 3;

				positions[index] = x - (width - 1) / 2;
				positions[index + 1] = world.getHeight(x, z);
				positions[index + 2] = z - (depth - 1) / 2;
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

		const geometry = TerrainMesh.build(world, 8, 8, this.debugMode === "biomes");
		const material = TerrainMesh.createMaterials();
		this.terrain = new Mesh(geometry, material);
		this.scene.add(this.terrain);
	}

	public setDebugMode(mode: TerrainDebugMode): void {
		this.debugMode = mode;

		if (this.currentWorld)
			this.render(this.currentWorld);
	}

}
