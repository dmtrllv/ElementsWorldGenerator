import { createContext, useContext, useEffect, useRef, useState } from "react";

import "./styles/notifications.scss";

export type NotificationListener = (notification: Notification) => any;

class NotificationManager {
	private readonly listeners: NotificationListener[] = [];

	public readonly useListener = (listener: NotificationListener, dependencies: any[] = []) => useEffect(() => {
		this.listeners.push(listener);
		return () => {
			const i = this.listeners.indexOf(listener);
			if (i > -1)
				this.listeners.splice(i, 1);
		};
	}, dependencies);

	public readonly notify = (notification: Notification) => {
		this.listeners.forEach(listener => listener(notification));
	}
}

const NotificationContext = createContext(new NotificationManager());

export const useNotifications = () => useContext(NotificationContext);

export const Notifications = () => {
	const manager = useContext(NotificationContext);
	const idCounter = useRef(0);
	const nextId = () => idCounter.current++;
	const [notifications, setNotifications] = useState<(Notification & { id: number })[]>([]);

	manager.useListener((notification) => {
		setNotifications([...notifications, {
			...notification,
			id: nextId()
		}]);
	}, [notifications]);

	const onRemove = (id: number) => {
		const index = notifications.findIndex(n => n.id === id);
		if (index > -1) {
			const newArr = [...notifications];
			newArr.splice(index, 1);
			setNotifications(newArr);
		}
	};

	return (
		<div id="notifications">
			{notifications.map(notification => (
				<NotificationView key={notification.id} {...notification} onRemove={onRemove} />
			))}
		</div>
	);
};

const NotificationView = ({ message, title, type, id, onRemove }: NotificationProps) => {
	useEffect(() => {
		const timeout = setTimeout(() => {
			onRemove(id);
		}, 50000);
		return () => clearTimeout(timeout);
	}, []);

	return (
		<div className={`notification ${type.toLowerCase()}`}>
			<div className="title">
				{title}
				<div className="close-btn" onClick={() => onRemove(id)}>x</div>
			</div>
			<div className="message">
				{message}
			</div>
		</div>
	);
};

type NotificationProps = Notification & {
	id: number;
	onRemove: (id: number) => void;
}

export type Notification = {
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