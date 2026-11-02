import * as Three from "three";

export class Scene extends Three.Scene {
	public readonly grid: Three.GridHelper;
	public readonly hemisphereLight: Three.HemisphereLight;
	public readonly directionalLight: Three.DirectionalLight;

	public constructor() {
		super();
		this.background = new Three.Color(0x20242b);
		this.grid = new Three.GridHelper(1000, 100, 0x778899, 0x414751);
		this.hemisphereLight = new Three.HemisphereLight(0xffffff, 0x606070, 2);
		this.directionalLight = new Three.DirectionalLight(0xffffff, 2);

		this.directionalLight.position.set(100, 150, 100);
		this.directionalLight.castShadow = true;

		this.directionalLight.shadow.mapSize.set(2048, 2048);
		this.directionalLight.shadow.camera.left = -300;
		this.directionalLight.shadow.camera.right = 300;
		this.directionalLight.shadow.camera.top = 300;
		this.directionalLight.shadow.camera.bottom = -300;
		this.directionalLight.shadow.camera.near = 0.1;
		this.directionalLight.shadow.camera.far = 500;
		this.directionalLight.shadow.bias = -0.0001;

		this.add(
			//this.grid,
			this.hemisphereLight,
			this.directionalLight
		);
	}
}