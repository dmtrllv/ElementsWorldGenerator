import { observable } from "../reactive";
import type { Editor } from "./editor";
import { Module } from "./store";

@observable
export class WorkspaceManager extends Module {
	private idCounter = 0;

	private nextId() {
		return this.idCounter++;
	}

	@observable
	public readonly workspaces: Workspace[] = [

	];

	@observable
	public readonly layout: WorkspaceLayout = new WorkspaceLayout("y", null, []);

	@observable
	public movingWorkspace: Workspace | null = null;

	public constructor(editor: Editor) {
		super(editor);
		this.layout.attach();
	}

	public open<T extends WorkspaceType<any>>(workspaceType: T, name: string, ...args: WorkspaceArgs<T>) {
		for (const workspace of this.workspaces) {
			if (workspace.isUnique && workspace.constructor === workspaceType && workspace.name === name)
				return workspace.layout?.focus(workspace);
		}

		const workspace = new workspaceType(this, null, this.nextId(), name, ...args);

		this.workspaces.push(workspace);
		this.layout.add(workspace);

		return workspace.layout?.focus(workspace);
	}

	public close(workspace: Workspace) {
		workspace.layout?.remove(workspace);

		const index = this.workspaces.indexOf(workspace);

		if (index !== -1)
			this.workspaces.splice(index, 1);
	}
}

type WorkspaceArgs<T extends typeof Workspace> = ConstructorParameters<T> extends [manager: WorkspaceManager, layout: WorkspaceLayout | null, id: number, string, ...infer Args] ? Args : never;

export type WorkspaceType<T extends Workspace> =
	new (manager: WorkspaceManager, layout: WorkspaceLayout | null, id: number, ...args: any[]) => T;

@observable()
export abstract class Workspace {
	public readonly id: number;
	public readonly isClosable: boolean;
	public readonly isUnique: boolean;

	protected readonly workspace: WorkspaceManager;

	@observable
	public name: string;

	public layout: WorkspaceLayout | null;

	public constructor(workspace: WorkspaceManager, layout: WorkspaceLayout | null, id: number, name: string, isClosable: boolean = true, isUnique: boolean = false) {
		this.id = id;
		this.layout = layout;
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

export type LayoutDirection = "x" | "y";
export type SplitEdge = "top" | "right" | "bottom" | "left";

@observable
export class WorkspaceLayout {
	private static idCounter = 0;

	public readonly id: number = WorkspaceLayout.idCounter++;

	@observable
	private _direction: LayoutDirection | "tabs";

	@observable
	private _fallbackDirection: LayoutDirection = "y";

	@observable
	public activeWorkspace: number = 0;

	@observable
	public children: Workspace[] | WorkspaceLayout[];

	@observable
	public size: number | "flex" = "flex";

	public parent: WorkspaceLayout | null;

	public constructor(direction: LayoutDirection | "tabs", parent: WorkspaceLayout | null, children: Workspace[] | WorkspaceLayout[]) {
		this._direction = direction;
		this.parent = parent;
		this.children = children;
	}

	public get direction(): LayoutDirection {
		if (this._direction !== "tabs")
			return this._direction;

		return this.parent?.direction ?? this._fallbackDirection;
	}

	public set direction(direction: LayoutDirection | "tabs") {
		if (direction === "tabs") {
			this._direction = "tabs";
			return;
		}

		if (this._direction === "tabs") {
			this._fallbackDirection = direction;
			return;
		}

		this._direction = direction;
	}

	public isWorkspace(): this is Omit<WorkspaceLayout, "children"> & { readonly children: Workspace[] } {
		return this._direction === "tabs";
	}

	public isLayout(): this is Omit<WorkspaceLayout, "children"> & { readonly children: WorkspaceLayout[] } {
		return this._direction !== "tabs";
	}

	public attach(parent: WorkspaceLayout | null = this.parent) {
		this.parent = parent;

		if (this.isWorkspace()) {
			for (const workspace of this.children)
				workspace.layout = this;

			this.activeWorkspace = Math.max(0, Math.min(this.activeWorkspace, this.children.length - 1));
			return;
		}

		for (const child of this.children as any[])
			child.attach(this);
	}

	public getFirstPanel(): WorkspaceLayout {
		if (this.isWorkspace())
			return this;

		if (this.children.length === 0) {
			const panel = new WorkspaceLayout("tabs", this, []) as any;
			this.children.push(panel);
			return panel;
		}

		return (this.children[0]! as any).getFirstPanel();
	}

	public add(workspace: Workspace) {
		const source = workspace.layout;

		if (source === this) {
			this.focus(workspace);
			return;
		}

		if (source)
			source.detachWorkspace(workspace);

		const panel = this.getFirstPanel();

		panel.addWorkspace(workspace);

		if (source)
			source.normalize();

		panel.focus(workspace);
	}

	public getLastWorkspace(): Workspace | null {
		if (this.isWorkspace())
			return this.children[this.activeWorkspace] ?? this.children[this.children.length - 1] ?? null;

		for (let i = this.children.length - 1; i >= 0; i--) {
			const child = this.children[i]!;

			const workspace = child instanceof WorkspaceLayout ? child.getLastWorkspace() : child;

			if (workspace)
				return workspace;
		}

		return null;
	}

	private addWorkspace(workspace: Workspace) {
		if (!this.isWorkspace())
			throw new Error("Cannot add a workspace to a directional layout.");

		const index = this.children.indexOf(workspace);

		if (index !== -1) {
			this.focus(workspace);
			return;
		}

		this.children.push(workspace);
		workspace.layout = this;
		this.focus(workspace);
	}

	public focus(workspace: Workspace) {
		if (!this.isWorkspace())
			return;

		const index = this.children.indexOf(workspace);

		if (index !== -1)
			this.activeWorkspace = index;
	}

	public remove(workspace: Workspace) {
		if (!this.isWorkspace())
			return;

		if (!this.detachWorkspace(workspace))
			return;

		this.normalize();
	}

	private detachWorkspace(workspace: Workspace): boolean {
		if (!this.isWorkspace())
			return false;

		const index = this.children.indexOf(workspace);

		if (index === -1)
			return false;

		const wasActive = this.activeWorkspace === index;

		this.children.splice(index, 1);

		if (wasActive) {
			const previous = this.getLastWorkspace();
			this.activeWorkspace = previous ? this.children.indexOf(previous) : 0;
		} else if (this.activeWorkspace > index) {
			this.activeWorkspace--;
		}

		workspace.layout = null;

		return true;
	}

	private normalize() {
		let current: WorkspaceLayout | null = this;

		while (current) {
			const parent = current.parent;

			if (current.isWorkspace()) {
				if (current.children.length > 0 || !parent)
					return;

				current = current.removeFromParent();
				continue;
			}

			const children = current.children;

			if (children.length === 0) {
				if (!parent)
					return;

				current = current.removeFromParent();
				continue;
			}

			if (children.length === 1) {
				const remaining = children[0]! as any;

				if (parent) {
					const siblings = parent.children as WorkspaceLayout[];
					const index = siblings.indexOf(current);

					if (index === -1)
						return;

					remaining.size = current.size;
					siblings[index] = remaining;
					remaining.attach(parent);

					current = parent;
					continue;
				}

				current.adopt(remaining);
				return;
			}

			return;
		}
	}

	private removeFromParent(): WorkspaceLayout | null {
		const parent = this.parent;

		if (!parent || !parent.isLayout())
			return null;

		const children = parent.children as WorkspaceLayout[];
		const index = children.indexOf(this);

		if (index === -1)
			return null;

		children.splice(index, 1);
		this.parent = null;

		return parent;
	}

	private adopt(layout: WorkspaceLayout) {
		const direction = this.direction;

		this._direction = layout._direction;
		this.children = layout.children;
		this.activeWorkspace = layout.activeWorkspace;
		this.size = layout.size;

		if (this._direction === "tabs")
			this._fallbackDirection = direction;

		this.attach(this.parent);
		layout.parent = null;
	}

	public split(edge: SplitEdge, workspace: Workspace) {
		if (!this.isWorkspace())
			throw new Error("Only workspace panels can be split.");

		const direction: LayoutDirection =
			edge === "left" || edge === "right" ? "x" : "y";

		const source = workspace.layout;

		if (source === this) {
			if (this.children.length <= 1)
				return;

			this.detachWorkspace(workspace);
		} else if (source) {
			source.detachWorkspace(workspace);
		}

		const newPanel = new WorkspaceLayout("tabs", null, [workspace]);
		workspace.layout = newPanel;

		const parent = this.parent;

		if (!parent) {
			const oldPanel = new WorkspaceLayout("tabs", this, this.children);
			oldPanel.activeWorkspace = this.activeWorkspace;
			oldPanel.size = this.size;
			oldPanel._fallbackDirection = this._fallbackDirection;

			const children = edge === "left" || edge === "top" ? [newPanel, oldPanel] : [oldPanel, newPanel];

			this._direction = direction;
			this.children = children as any;

			for (const child of children)
				child.attach(this);

		} else {
			const siblings = parent.children as WorkspaceLayout[];
			const index = siblings.indexOf(this);

			if (index === -1)
				throw new Error("Workspace panel is not attached to its parent.");

			if (parent._direction === direction) {
				const insertIndex = edge === "left" || edge === "top" ? index : index + 1;

				siblings.splice(insertIndex, 0, newPanel);
				newPanel.attach(parent);

			} else {
				const split = new WorkspaceLayout(direction, parent, []);

				split.size = this.size;
				this.size = "flex";

				const children = edge === "left" || edge === "top" ? [newPanel, this] : [this, newPanel];

				split.children = children;

				for (const child of children)
					child.attach(split);

				siblings.splice(index, 1, split);
			}
		}

		if (source && source !== this)
			source.normalize();

		newPanel.focus(workspace);
	}
}
