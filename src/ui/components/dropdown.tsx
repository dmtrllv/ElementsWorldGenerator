import { useState, type JSX, type PropsWithChildren } from "react";

import "./styles/dropdown.scss";

export const DropdownPanel = ({ title, children, ...props }: PropsWithChildren<DropdownPanelProps>) => {
	const [open, setOpen] = useState(() => props.open !== undefined ? props.open : true);

	return (
		<div className={`dropdown-panel ${open ? "open" : ""}`}>
			<div className="header" onClick={() => setOpen(!open)}>
				{typeof title === "string" ? <h4>{title}</h4> : title}
				<div className="icon">
					⌄
				</div>
			</div>
			<div className="body">
				{children}
			</div>
		</div>
	);
};

export type DropdownPanelProps = {
	title: JSX.Element | string;
	open?: boolean;
};