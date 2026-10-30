import type React from "react";
import { state, store } from "../state";
import type { Editor } from "./editor";

@store
export class ModalManager {
	@state
	public readonly modals: Modal[] = [];

	@state
	public confirmModal: ConfirmModal | null = null;

	public readonly editor: Editor;

	public constructor(editor: Editor) {
		this.editor = editor;
	}

	public confirm(message: string, title: string = "Confirm") {
		if (this.confirmModal)
			return Promise.resolve(false);
		let resolver = { res: null } as any;
		this.confirmModal = new ConfirmModal(title, message, (confirmed) => {
			this.confirmModal = null;
			resolver.res(confirmed);
		});
		return new Promise<boolean>(res => {
			resolver.res = res;
		})
	};

	public open(modal: ModalProps) {
		const found = this.modals.find(m => m.title === modal.title);
		if (found) {
			this.focus(found.id);
		} else {
			this.modals.push(new Modal(this, modal));
		}
	}

	public focus(id: number) {
		const foundIndex = this.modals.findIndex(m => m.id === id);
		const [item] = this.modals.splice(foundIndex, 1);
		this.modals.push(item);
	}

	public close(id: number) {
		const index = this.modals.findIndex(n => n.id === id);
		if (index > -1)
			this.modals.splice(index, 1);
	}
}

@store
export class Modal {
	private static idCounter = 0;

	private readonly manager: ModalManager;
	public readonly id: number;

	@state
	public title!: string;

	@state
	public closable: boolean = true;

	@state
	public Component!: ModalFC;

	@state
	public width: number = 640;

	@state
	public height: number = 480;

	public constructor(manager: ModalManager, props: ModalProps) {
		this.manager = manager;
		this.id = Modal.idCounter++;
		Object.assign(this, props);
	}

	public close() {
		this.manager.close(this.id)
	}
}

export class ConfirmModal {
	public readonly title: string;
	public readonly message: string;

	private readonly confirmer: (confirm: boolean) => void;

	public constructor(title: string, message: string, confirm: (confirm: boolean) => void) {
		this.title = title;
		this.message = message;
		this.confirmer = confirm;
	}

	public close() {
		this.confirmer(false);
	}

	public confirm() {
		this.confirmer(true);
	}
}

export type ModalProps = {
	title: string;
	closable?: boolean;
	Component: ModalFC;
	width?: number;
	height?: number;
};

export const createModal = (props: ModalProps) => props;

export type ModalFC = React.FC<{ readonly modal: Modal }>; 