import { useState, type JSX, type PropsWithChildren } from "react";

import "./styles/dropdown.scss";

export const DropdownPanel = ({ title, children, open = true, className = "", ...props }: PropsWithChildren<DropdownPanelProps>) => {
	const [isOpen, setOpen] = useState(open);

	return (
		<div className={`dropdown-panel ${isOpen ? "open" : ""} ${className}`} {...props}>
			<div className="header" onClick={() => setOpen(!isOpen)}>
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
	id?: string;
	className?: string;
};