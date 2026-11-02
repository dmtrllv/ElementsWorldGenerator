import { state, observable } from "../state";
import { Module } from "./store";

@observable
export class WorkspaceManager extends Module {
	private idCounter = 0;

	private nextId() {
		return this.idCounter++;
	}

	@state
	public readonly workspaces: Workspace[] = [new RendererWorkspace(this, this.nextId())];

	@state
	private _activeWorkspace: Workspace = this.workspaces[0]!;

	public get activeWorkspace() { return this._activeWorkspace; }

	public open<T extends WorkspaceType<any>>(workspaceType: T, name: string, ...args: WorkspaceArgs<T>) {
		for (const w of this.workspaces)
			if ((w.constructor === workspaceType) && w.isUnique || w.name === name)
				return this.focus(w);
		const workspace = new (workspaceType as any)(this, this.nextId(), name, ...args);
		this.workspaces.push(workspace);
		return this.focus(workspace);
	}

	public close(workspace: Workspace) {
		const index = this.workspaces.indexOf(workspace);
		if (index > -1)
			this.workspaces.splice(index, 1);
		this._activeWorkspace = this.workspaces[index === 0 ? 0 : index - 1]!;
	}

	public focus(workspace: Workspace) {
		if (!this.workspaces.includes(workspace))
			return false;
		this._activeWorkspace = workspace;
		return true;
	}
}

type WorkspaceArgs<T extends typeof Workspace> = ConstructorParameters<T> extends [WorkspaceManager, number, string, ...infer Args] ? Args : never;
export type WorkspaceType<T extends Workspace> = new (manager: WorkspaceManager, id: number, ...args: any[]) => T;

@observable
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

export class RendererWorkspace extends Workspace {
	public constructor(workspace: WorkspaceManager, id: number) {
		super(workspace, id, "Renderer", false, true);
	}
}