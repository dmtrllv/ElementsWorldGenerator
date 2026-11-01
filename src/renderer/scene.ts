import * as Three from "three";

export class Scene extends Three.Scene {
	public readonly grid: Three.GridHelper;
	public readonly hemisphereLight: Three.HemisphereLight;
	public readonly directionalLight: Three.DirectionalLight;

	public constructor() {
		super();
		this.background = new Three.Color(0x20242b);
		this.grid = new Three.GridHelper(20, 20, 0x778899, 0x414751);
		this.hemisphereLight = new Three.HemisphereLight(0xffffff, 0x606070, 2);
		this.directionalLight = new Three.DirectionalLight(0xffffff, 2);
		this.add(this.grid, this.hemisphereLight, this.directionalLight);
	}
}