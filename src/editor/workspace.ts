import type { Scalar } from "../generator/scalar";
import { state, store } from "../state";
import { Module } from "./store";

@store
export class WorkspaceManager extends Module {
	private idCounter = 0;

	private nextId() {
		return this.idCounter++;
	}

	@state
	public readonly workspaces: Workspace[] = [new SceneView(this, this.nextId())];

	@state
	private _activeWorkspace: Workspace = this.workspaces[0];

	public get activeWorkspace() { return this._activeWorkspace; }

	public open<T extends typeof Workspace>(workspaceType: T, ...args: WorkspaceArgs<T>) {
		for (const w of this.workspaces)
			if ((w.constructor === workspaceType) && w.isUnique)
				return this.focus(w);
		const workspace = new (workspaceType as any)(this, this.nextId(), ...args);
		this.workspaces.push(workspace);
		this.focus(workspace);
	}

	public close(workspace: Workspace) {
		const index = this.workspaces.indexOf(workspace);
		if (index > -1)
			this.workspaces.splice(index, 1);
		this._activeWorkspace = this.workspaces[index === 0 ? 0 : index - 1];
	}

	public focus(workspace: Workspace) {
		if (!this.workspaces.includes(workspace))
			return false;
		this._activeWorkspace = workspace;
		return true;
	}
}

type WorkspaceArgs<T extends typeof Workspace> = ConstructorParameters<T> extends [WorkspaceManager, number, ...infer Args] ? Args : never;
export type WorkspaceType<T extends Workspace> = new (manager: WorkspaceManager, id: number, ...args: any[]) => T;

@store
export abstract class Workspace {
	public readonly id: number;
	public readonly isClosable: boolean;
	public readonly isUnique: boolean;

	protected readonly workspace: WorkspaceManager;

	@state
	public name: string;

	public constructor(workspace: WorkspaceManager, id: number, name: string, isClosable: boolean = true, isUnique: boolean = false) {
		this.id = id;
		this.workspace = workspace;
		this.name = name;
		this.isClosable = isClosable;
		this.isUnique = isUnique;
	}

	public close() {
		if (this.isClosable)
			this.workspace.close(this);
	}
}

export class SceneView extends Workspace {

	public constructor(workspace: WorkspaceManager, id: number) {
		super(workspace, id, "Scene", false, true);
	}
}

export class ScalarView extends Workspace {
	public readonly scalar: Scalar;

	public constructor(workspace: WorkspaceManager, id: number, name: string, scalar: Scalar) {
		super(workspace, id, name);
		this.scalar = scalar;
	}
}