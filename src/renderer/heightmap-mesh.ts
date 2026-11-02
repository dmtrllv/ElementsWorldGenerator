
import * as Three from "three";
import type { ElevationMap } from "../generator/maps/elevation-map";

export const createHeightmapMesh = (map: ElevationMap, heightScale: number): Three.Mesh<Three.BufferGeometry, Three.MeshStandardMaterial> => {
	const { width, height } = map;

	if (width < 2 || height < 2)
		throw new Error("Heightmap must be at least 2x2!");

	const positions = new Float32Array(width * height * 3);
	const indices = new Uint32Array((width - 1) * (height - 1) * 6);

	const offsetX = (width - 1) * 0.5;
	const offsetZ = (height - 1) * 0.5;

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const index = (z * width + x) * 3;

			positions[index] = x - offsetX;
			positions[index + 1] = map.get(x, z) * heightScale;
			positions[index + 2] = z - offsetZ;
		}
	}

	let index = 0;

	for (let z = 0; z < height - 1; z++) {
		for (let x = 0; x < width - 1; x++) {
			const a = z * width + x;
			const b = a + 1;
			const c = a + width;
			const d = c + 1;

			indices[index++] = a;
			indices[index++] = c;
			indices[index++] = b;

			indices[index++] = b;
			indices[index++] = c;
			indices[index++] = d;
		}
	}

	const geometry = new Three.BufferGeometry();

	geometry.setAttribute("position", new Three.BufferAttribute(positions, 3));
	geometry.setIndex(new Three.BufferAttribute(indices, 1));
	geometry.computeVertexNormals();

	const material = new Three.MeshStandardMaterial({
		color: 0x8caa72,
		roughness: 1
	});

	const mesh = new Three.Mesh(geometry, material);
	mesh.receiveShadow = true;
	mesh.castShadow = true;

	return mesh;
};
