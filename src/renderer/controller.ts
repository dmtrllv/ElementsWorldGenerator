import { OrbitControls, PointerLockControls } from "three/examples/jsm/Addons.js";
import { ViewHelper } from "three/addons/helpers/ViewHelper.js";
import type { Renderer } from "./renderer";
import { Vector3, type Camera } from "three";
import { state, store } from "../state";

@store
export class Controller {
	private readonly viewHelper: ViewHelper;
	private readonly orbitControls: OrbitControls<Camera>;
	private readonly pointerControls: PointerLockControls;
	private readonly renderer: Renderer;

	private readonly movementKeys = new Set<string>();
	private readonly forward = new Vector3();
	private readonly right = new Vector3();
	private readonly movement = new Vector3();
	private readonly up = new Vector3(0, 1, 0);

	@state
	public movementSpeed = 12;

	@state
	private _cameraMode: CamerMode = "orbital";


	public get cameraMode() { return this._cameraMode; }

	public constructor(renderer: Renderer, element: HTMLElement) {
		this.renderer = renderer;
		this.viewHelper = new ViewHelper(renderer.camera, element);
		this.viewHelper.location = {
			top: 0,
			right: 0,
			left: null,
			bottom: 0,
		}
		this.orbitControls = new OrbitControls(renderer.camera, element);
		this.orbitControls.target.set(0, 0, 0);
		this.orbitControls.enableDamping = true;
		this.orbitControls.dampingFactor = 0.08;
		this.orbitControls.minDistance = 2;
		this.orbitControls.maxDistance = 200;
		this.orbitControls.maxPolarAngle = Math.PI;
		this.orbitControls.addEventListener("change", () => {
			//this.onViewTargetChanged?.();
		});
		this.orbitControls.update();
		this.viewHelper.center.copy(this.orbitControls.target);

		this.pointerControls = new PointerLockControls(renderer.camera, element);
		this.pointerControls.addEventListener("change", this.onPointerChange);
		this.pointerControls.addEventListener("unlock", this.onPointerUnlock);

		element.addEventListener("click", this.onCanvasClick);
		document.addEventListener("keydown", this.onKeyDown);
		document.addEventListener("keyup", this.onKeyUp);
		window.addEventListener("blur", this.onWindowBlur);
		element.addEventListener("mousedown", this.onViewHelperClick);
	}

	private onViewHelperClick = (event: MouseEvent) => {
		this.viewHelper.center.copy(this.orbitControls.target);

		if (this.viewHelper.handleClick(event))
			event.stopPropagation();
	}

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
		//this.onViewTargetChanged?.();
	};

	public render() {
		if (this.cameraMode !== "orbital")
			return;

		const renderer = this.renderer.glRenderer;
		const autoClear = renderer.autoClear;

		renderer.autoClear = false;

		try {
			this.viewHelper.render(renderer);
		} finally {
			renderer.autoClear = autoClear;
		}
	}

	public update(delta: number) {
		if (this.viewHelper.animating)
			this.viewHelper.update(delta);

		if (this.cameraMode === "orbital") {
			if (!this.viewHelper.animating)
				this.orbitControls.update(delta);

			return;
		}

		if (!this.pointerControls?.isLocked)
			return;

		this.pointerControls.getDirection(this.forward);
		this.forward.y = 0;

		if (this.forward.lengthSq() < 0.0001)
			this.forward.set(-Math.sin(this.renderer.camera.rotation.y), 0, -Math.cos(this.renderer.camera.rotation.y));

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
		this.renderer.camera.position.addScaledVector(this.movement, this.movementSpeed * delta);
		//this.onViewTargetChanged?.();
	}

	public setCameraMode(mode: "orbital" | "first-person") {
		if (this._cameraMode === mode)
			return;

		this.movementKeys.clear();

		if (!this.renderer.camera || !this.orbitControls) {
			this._cameraMode = mode;
			return;
		}

		if (mode === "first-person") {
			this.orbitControls.enableDamping = false;
			this.orbitControls.update();
			this.orbitControls.enableDamping = true;
			this.orbitControls.enabled = false;
			this._cameraMode = mode;
			return;
		}

		this.pointerControls?.unlock();

		const direction = this.renderer.camera.getWorldDirection(new Vector3());

		this.orbitControls.target.copy(this.renderer.camera.position).addScaledVector(direction, 10);
		this.orbitControls.enableDamping = false;
		this.orbitControls.enabled = true;
		this._cameraMode = mode;
		this.orbitControls.update();
		this.orbitControls.enableDamping = true;
	}

	public dispose(element: HTMLElement) {
		this.pointerControls.removeEventListener("change", this.onPointerChange);
		this.pointerControls.removeEventListener("unlock", this.onPointerUnlock);
		this.pointerControls.dispose();

		this.movementKeys.clear();

		this.orbitControls.dispose();
		element.removeEventListener("click", this.onCanvasClick);
		document.removeEventListener("keydown", this.onKeyDown);
		document.removeEventListener("keyup", this.onKeyUp);
		window.removeEventListener("blur", this.onWindowBlur);
		element.removeEventListener("pointerup", this.onViewHelperClick);
	}
}

export type CamerMode = "orbital" | "first-person";