import { useEffect } from "react";
import { Editor } from "../editor";
import { NotificationManager, type Notification } from "../editor/notifications";

import "./styles/notifications.scss";

export const Notifications = () => {
	const { notifications } = Editor.use(NotificationManager);
	return (
		<div id="notifications">
			{notifications.map(notification => (
				<NotificationView key={notification.id} {...notification} />
			))}
		</div>
	);
};

const NotificationView = ({ message, title, type, id }: NotificationProps) => {
	const { close } = Editor.use(NotificationManager);

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