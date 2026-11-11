import { Menu, MenuSep, type MenuChild, type MenuItem } from "../../editor";
import { useObservable } from "../../reactive";

import "./styles/menubar.scss";

export const Menubar = () => {
	const menubar = Menu.use();
	const items = useObservable(menubar.items);
	return (
		<div id="menubar">
			{items.map((child) => <MenuItemView key={child.id} item={child} />)}
		</div>
	);
}

const MenuItemView = ({ item }: { item: MenuItem }) => {
	item = useObservable(item);
	const action = useObservable(item.action);
	const children = useObservable(item.children);

	return (
		<div className="menu-item">
			<div className="item" onClick={() => action()}>
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