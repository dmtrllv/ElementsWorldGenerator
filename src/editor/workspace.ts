import type { Scalar } from "../generator/scalar";
import { state, store } from "../state";

@store
export class Workspace {
	@state
	public readonly windows: Window[] = [];

	public open<T extends typeof Window>(window: T) {

	}

	public close(window: Window) {
		const index = this.windows.indexOf(window);
		if (index > -1)
			this.windows.splice(index, 1);
	}
}

export abstract class Window {
	public readonly isClosable: boolean;

	protected readonly workspace: Workspace;

	public constructor(workspace: Workspace, isClosable: boolean = true) {
		this.workspace = workspace;
		this.isClosable = isClosable;
	}

	public close() {
		if (this.isClosable)
			this.workspace.close(this);
	}
}

export class SceneView extends Window {
	public constructor(workspace: Workspace) {
		super(workspace, false);
	}
}

export class ScalarView extends Window {
	public readonly scalar: Scalar;

	public constructor(workspace: Workspace, scalar: Scalar) {
		super(workspace);
		this.scalar = scalar;
	}
}