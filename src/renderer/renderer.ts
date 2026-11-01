import * as Three from "three";
import { Scene } from "./scene";
import { Controller } from "./controller";
import { store } from "../state";
import { Module } from "../editor/store";
import type { Editor } from "../editor";

@store
export class Renderer extends Module {
	private element: HTMLDivElement | null = null;

	public readonly scene: Scene = new Scene();
	public readonly camera = new Three.Camera();
	private readonly renderer = new Three.WebGLRenderer({ antialias: true });

	private controller: Controller | null = null;

	public constructor(editor: Editor) {
		super(editor);
		const distance = 50;
		this.camera.position.set(distance, distance, distance);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	}

	public initialize(element: HTMLDivElement) {
		if (this.element)
			throw new Error("Renderer is already initialized!");

		this.element = element;
		this.controller = new Controller(this, this.element);
		this.element.appendChild(this.renderer.domElement);
	}

	public dispose() {
		if (this.element)
			this.controller?.dispose(this.element);
	}
}