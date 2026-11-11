import { observable } from "../reactive";
import { Module } from "./module";

@observable
export class NotificationManager extends Module {
	_idCounter = 0;

	@observable
	public readonly notifications: Notification[] = [];

	public notify(notification: NotificationData) {
		this.notifications.push({ ...notification, id: this._idCounter++ });
	}

	public readonly close = (id: number) => {
		const index = this.notifications.findIndex(n => n.id === id);
		if (index > -1)
			this.notifications.splice(index, 1);
	}

	public readonly error = (message: string) => {
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