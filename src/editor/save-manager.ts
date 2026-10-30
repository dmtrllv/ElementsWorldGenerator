import { state, store } from "../state";
import { SaveModal } from "../ui/modals/saves";
import type { Editor } from "./editor";
import { Generator } from "./generator";
import { Biome } from "./generator/biomes";
import { WorldSettings } from "./generator/world-settings";
import { ModalManager } from "./modals";
import { Serializer } from "./serializer";

@store
export class SaveManager {
	public readonly editor: Editor;

	@state
	private readonly saves: string[] = JSON.parse(localStorage.getItem("editor.saves") || "[]");

	@state
	public currentSave: string | null = null;

	public constructor(editor: Editor) {
		this.editor = editor;
	}

	public getSaves(): readonly string[] {
		return this.saves;
	}

	public async saveAs(name: string, force: boolean = false) {
		if (!force && this.getSaves().includes(name)) {
			if (!await this.editor.get(ModalManager).confirm(`Save ${name} already exists, do you want to overwrite?`))
				return false;
		}

		const world = this.editor.get(Generator).worldSettings;
		const biomes = this.editor.get(Generator).biomes.biomes;

		localStorage.setItem("editor.saves." + name, JSON.stringify({
			world: Serializer.serialize(world),
			biomes: biomes.map(Serializer.serialize)
		}));


		if (!this.getSaves().includes(name))
			this.saves.push(name);
		localStorage.setItem("editor.saves", JSON.stringify(this.saves));
		this.currentSave = name;
		return true;
	}

	public save() {
		if (!this.currentSave) {
			return this.editor.get(ModalManager).open(SaveModal);
		}

		if (!this.getSaves().includes(this.currentSave))
			this.saves.push(this.currentSave);

		const world = this.editor.get(Generator).worldSettings;
		const biomes = this.editor.get(Generator).biomes.biomes;
		localStorage.setItem("editor.saves." + this.currentSave, JSON.stringify({
			world: Serializer.serialize(world),
			biomes: biomes.map(biome => Serializer.serialize(biome))
		}));
	}

	public open(name: string) {
		const data = localStorage.getItem("editor.saves." + name);
		if(!data)
			return null; // TODO: ERROR/notification

		let { world, biomes } = JSON.parse(data);
		world = Serializer.deserialize(WorldSettings, world);
		biomes = biomes.map((b: any) => Serializer.deserialize(Biome, b));
		this.editor.get(Generator).biomes.load(biomes);
		Object.assign(this.editor.get(Generator).worldSettings, world);
		this.currentSave = name;
	}
}