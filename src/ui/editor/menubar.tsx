import { Menu, MenuSep, type MenuChild, type MenuItem } from "../../editor";
import { useObservable } from "../../reactive";

import "./styles/menubar.scss";

export const Menubar = () => {
	const menubar = Menu.use();

	return (
		<div id="menubar">
			{menubar.items.map((child) => <MenuItemView key={child.id} item={child} />)}
		</div>
	);
}

const getChildren = (item: MenuItem): MenuChild[] => {
	return typeof item.children === "function" ? item.children() : item.children;
}

const MenuItemView = ({ item }: { item: MenuItem }) => {
	item = useObservable(item);

	const children = getChildren(item);

	return (
		<div className="menu-item">
			<div className="item" onClick={() => { item.action && item.action(); }}>
				{item.text}
			</div>
			{children.length > 0 && (
				<div className="children">
					{children.map((child) => {
						if (child instanceof MenuSep)
							return <div key={child.id} className="sep" />;
						return <MenuItemView key={child.id} item={child} />
					})}
				</div>
			)}
		</div>
	);
}