import { Font, TabView } from '@nativescript/core';

export function getNativeTabCount(tabView: TabView): number {
	if (!tabView.ios.viewControllers) {
		return 0;
	}

	return tabView.ios.viewControllers.count;
}

export function selectNativeTab(tabView: TabView, index: number): void {
	tabView.ios.selectedIndex = index;
	tabView.ios.delegate.tabBarControllerDidSelectViewController(tabView.ios, tabView.ios.selectedViewController);
}

export function getNativeSelectedIndex(tabView: TabView): number {
	return tabView.ios.selectedIndex;
}

export function getNativeFont(tabView: TabView): UIFont {
	const tabBar = <UITabBar>tabView.ios.tabBar;
	if (tabBar.items.count > 0) {
		const currentAttrs = tabBar.items[0].titleTextAttributesForState(UIControlState.Normal);
		if (currentAttrs) {
			return currentAttrs.objectForKey(NSFontAttributeName);
		}
	}

	return null;
}

export function getOriginalFont(tabView: TabView): UIFont {
	return (tabView.style.fontInternal || Font.default).getUIFont(UIFont.systemFontOfSize(10));
}
