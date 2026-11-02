import * as Three from "three";
import { Scene } from "./scene";
import { Controller } from "./controller";
import { store } from "../state";
import { Module } from "../editor/store";
import type { Editor } from "../editor";
import { createHeightmapMesh } from "./heightmap-mesh";
import type { MapGenerator } from "../generator";

@store
export class Renderer extends Module {
	private element: HTMLDivElement | null = null;

	public readonly scene: Scene = new Scene();
	public readonly camera = new Three.PerspectiveCamera();
	public readonly glRenderer = new Three.WebGLRenderer({ antialias: true });

	private controller: Controller | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private previousFrameTime: number = 0;

	private currentRenderObject: Three.Mesh<Three.BufferGeometry, Three.MeshStandardMaterial> | null = null;
	private currentRenderId: string | null = null;
	private currentRenderMap: MapGenerator | null = null;
	private currentGenerationId: number = -1;
	private currentHeightScale: number = 0;


	public constructor(editor: Editor) {
		super(editor);
		this.camera.position.set(50, 35, 50);
		this.glRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.glRenderer.shadowMap.enabled = true;
		this.glRenderer.shadowMap.type = Three.PCFSoftShadowMap;
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
		this.clearRenderObject();
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

	public renderHeightmap(id: string, map: MapGenerator, heightScale: number): void {
		if (this.currentRenderId === id && this.currentRenderMap === map && this.currentGenerationId === map.generationId && this.currentHeightScale === heightScale)
			return;

		this.clearRenderObject();

		this.currentRenderObject = createHeightmapMesh(map, heightScale);
		this.currentRenderId = id;
		this.currentRenderMap = map;
		this.currentGenerationId = map.generationId;
		this.currentHeightScale = heightScale;

		this.scene.add(this.currentRenderObject);
	}

	private clearRenderObject(): void {
		if (!this.currentRenderObject)
			return;

		this.scene.remove(this.currentRenderObject);
		this.currentRenderObject.geometry.dispose();
		this.currentRenderObject.material.dispose();

		this.currentRenderObject = null;
		this.currentRenderId = null;
		this.currentRenderMap = null;
		this.currentGenerationId = -1;
		this.currentHeightScale = 0;
	}
}
