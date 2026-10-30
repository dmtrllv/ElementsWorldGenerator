import { state, store } from "../state";
import type { Editor } from "./editor";

@store
export class NotificationManager {
	#idCounter = 0;

	@state
	public readonly notifications: Notification[] = [];

	public readonly editor: Editor;

	public constructor(editor: Editor) {
		this.editor = editor;
	}

	public notify(notification: NotificationData) {
		this.notifications.push({ ...notification, id: this.#idCounter++ });
	}

	public close(id: number) {
		const index = this.notifications.findIndex(n => n.id === id);
		if (index > -1)
			this.notifications.splice(index, 1);
	}

	public error(message: string) {
		this.notify({ type: "Error", message, title: "Error" });
		throw new Error(message);
	}

}

export type Notification = NotificationData & {
	readonly id: number;
}

export type NotificationData = {
	readonly title: string;
	readonly message: string;
	readonly type: NotificationType;
}

export const NotificationType = {
	Info: "Info",
	Warning: "Warning",
	Error: "Error",
} as const;

export type NotificationType = keyof typeof NotificationType;