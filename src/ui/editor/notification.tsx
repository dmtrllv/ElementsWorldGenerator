import { useEffect } from "react";
import { NotificationManager, type Notification } from "../../editor";
import { useObservable } from "../../reactive";

import "./styles/notifications.scss";

export const Notifications = () => {
	const { notifications } = NotificationManager.use();
	useObservable(notifications);
	return (
		<div id="notifications">
			{notifications.map(notification => (
				<NotificationView key={notification.id} {...notification} />
			))}
		</div>
	);
};

const NotificationView = ({ message, title, type, id }: NotificationProps) => {
	const { close } = NotificationManager.use();

	useEffect(() => {
		const timeout = setTimeout(() => {
			close(id);
		}, 5000);
		return () => clearTimeout(timeout);
	}, []);

	return (
		<div className={`notification ${type.toLowerCase()}`}>
			<div className="title">
				{title}
				<div className="close-btn" onClick={() => close(id)}>x</div>
			</div>
			<div className="message">
				{message}
			</div>
		</div>
	);
};

type NotificationProps = Notification;