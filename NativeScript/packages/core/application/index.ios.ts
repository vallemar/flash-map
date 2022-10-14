// Types
import { iOSApplication as iOSApplicationDefinition } from '.';
import { ApplicationEventData, CssChangedEventData, LaunchEventData, LoadAppCSSEventData, OrientationChangedEventData, SystemAppearanceChangedEventData } from './application-interfaces';

// TODO: explain why we need to this or remov it
// Use requires to ensure order of imports is maintained
const { backgroundEvent, displayedEvent, exitEvent, foregroundEvent, getCssFileName, launchEvent, livesync, lowMemoryEvent, notify, on, orientationChanged, orientationChangedEvent, resumeEvent, setApplication, suspendEvent, systemAppearanceChanged, systemAppearanceChangedEvent } = require('./application-common');
// First reexport so that app module is initialized.
export * from './application-common';

import { View } from '../ui/core/view';
import { NavigationEntry } from '../ui/frame/frame-interfaces';
// TODO: Remove this and get it from global to decouple builder for angular
import { Builder } from '../ui/builder';
import { Observable } from '../data/observable';
import { CSSUtils } from '../css/system-classes';
import { IOSHelper } from '../ui/core/view/view-helper';
import { Device } from '../platform';
import { profile } from '../profiling';
import { iOSNativeHelper } from '../utils';
import { initAccessibilityCssHelper } from '../accessibility/accessibility-css-helper';
import { initAccessibilityFontScale } from '../accessibility/font-scale';
import { inBackground, setInBackground, setSuspended, suspended } from './application-common';

const IOS_PLATFORM = 'ios';

const getVisibleViewController = iOSNativeHelper.getVisibleViewController;
const majorVersion = iOSNativeHelper.MajorVersion;

// NOTE: UIResponder with implementation of window - related to https://github.com/NativeScript/ios-runtime/issues/430
// TODO: Refactor the UIResponder to use Typescript extends when this issue is resolved:
// https://github.com/NativeScript/ios-runtime/issues/1012

const Responder = (<any>UIResponder).extend(
	{
		get window() {
			return iosApp ? iosApp.window : undefined;
		},
		set window(setWindow) {
			// NOOP
		},
	},
	{
		protocols: [UIApplicationDelegate],
	}
);

@NativeClass
class NotificationObserver extends NSObject {
	private _onReceiveCallback: (notification: NSNotification) => void;

	public static initWithCallback(onReceiveCallback: (notification: NSNotification) => void): NotificationObserver {
		const observer = <NotificationObserver>super.new();
		observer._onReceiveCallback = onReceiveCallback;

		return observer;
	}

	public onReceive(notification: NSNotification): void {
		this._onReceiveCallback(notification);
	}

	public static ObjCExposedMethods = {
		onReceive: { returns: interop.types.void, params: [NSNotification] },
	};
}

let displayedOnce = false;
let displayedLinkTarget;
let displayedLink;

@NativeClass
class CADisplayLinkTarget extends NSObject {
	onDisplayed(link: CADisplayLink) {
		link.invalidate();
		const ios = UIApplication.sharedApplication;
		const object = iosApp;
		displayedOnce = true;
		notify(<ApplicationEventData>{
			eventName: displayedEvent,
			object,
			ios,
		});
		displayedLinkTarget = null;
		displayedLink = null;
	}
	public static ObjCExposedMethods = {
		onDisplayed: { returns: interop.types.void, params: [CADisplayLink] },
	};
}

export function setMaxRefreshRate(options?: { min?: number; max?: number; preferred?: number }) {
	const adjustRefreshRate = function () {
		if (displayedLink) {
			const minFrameRateDisabled = NSBundle.mainBundle.objectForInfoDictionaryKey('CADisableMinimumFrameDurationOnPhone');
			if (minFrameRateDisabled) {
				let max = 120;
				const deviceMaxFrames = UIScreen.mainScreen?.maximumFramesPerSecond;
				if (options?.max) {
					if (deviceMaxFrames) {
						// iOS 10.3
						max = options.max <= deviceMaxFrames ? options.max : deviceMaxFrames;
					} else if (displayedLink.preferredFramesPerSecond) {
						// iOS 10.0
						max = options.max <= displayedLink.preferredFramesPerSecond ? options.max : displayedLink.preferredFramesPerSecond;
					}
				}

				if (iOSNativeHelper.MajorVersion >= 15) {
					const min = options?.min || max / 2;
					const preferred = options?.preferred || max;
					displayedLink.preferredFrameRateRange = CAFrameRateRangeMake(min, max, preferred);
				} else {
					displayedLink.preferredFramesPerSecond = max;
				}
			}
		}
	};
	if (!displayedOnce) {
		displayedLinkTarget = <CADisplayLink>CADisplayLinkTarget.new();
		displayedLink = CADisplayLink.displayLinkWithTargetSelector(displayedLinkTarget, 'onDisplayed');
		adjustRefreshRate();
		displayedLink.addToRunLoopForMode(NSRunLoop.mainRunLoop, NSDefaultRunLoopMode);
		displayedLink.addToRunLoopForMode(NSRunLoop.mainRunLoop, UITrackingRunLoopMode);
	} else {
		adjustRefreshRate();
	}
}

/* tslint:disable */
export class iOSApplication implements iOSApplicationDefinition {
	/* tslint:enable */
	private _backgroundColor = majorVersion <= 12 || !UIColor.systemBackgroundColor ? UIColor.whiteColor : UIColor.systemBackgroundColor;
	private _delegate: typeof UIApplicationDelegate;
	private _window: UIWindow;
	private _observers: Array<NotificationObserver>;
	private _orientation: 'portrait' | 'landscape' | 'unknown';
	private _rootView: View;
	private _systemAppearance: 'light' | 'dark';

	get paused() {
		return suspended;
	}
	get backgrounded() {
		return inBackground;
	}

	constructor() {
		this._observers = new Array<NotificationObserver>();
		this.addNotificationObserver(UIApplicationDidFinishLaunchingNotification, this.didFinishLaunchingWithOptions.bind(this));
		this.addNotificationObserver(UIApplicationDidBecomeActiveNotification, this.didBecomeActive.bind(this));
		this.addNotificationObserver(UIApplicationDidEnterBackgroundNotification, this.didEnterBackground.bind(this));
		this.addNotificationObserver(UIApplicationWillTerminateNotification, this.willTerminate.bind(this));
		this.addNotificationObserver(UIApplicationDidReceiveMemoryWarningNotification, this.didReceiveMemoryWarning.bind(this));
		this.addNotificationObserver(UIApplicationDidChangeStatusBarOrientationNotification, this.didChangeStatusBarOrientation.bind(this));
	}

	get orientation(): 'portrait' | 'landscape' | 'unknown' {
		if (!this._orientation) {
			const statusBarOrientation = UIApplication.sharedApplication.statusBarOrientation;
			this._orientation = this.getOrientationValue(statusBarOrientation);
		}

		return this._orientation;
	}

	get rootController(): UIViewController {
		if (NativeScriptEmbedder.sharedInstance().delegate && !this._window) {
			this._window = UIApplication.sharedApplication.delegate.window;
		}
		return this._window.rootViewController;
	}

	get systemAppearance(): 'light' | 'dark' | null {
		// userInterfaceStyle is available on UITraitCollection since iOS 12.
		if (majorVersion <= 11) {
			return null;
		}

		if (!this._systemAppearance) {
			const userInterfaceStyle = this.rootController.traitCollection.userInterfaceStyle;
			this._systemAppearance = getSystemAppearanceValue(userInterfaceStyle);
		}

		return this._systemAppearance;
	}

	get nativeApp(): UIApplication {
		return UIApplication.sharedApplication;
	}

	get window(): UIWindow {
		return this._window;
	}

	get delegate(): typeof UIApplicationDelegate {
		return this._delegate;
	}

	set delegate(value: typeof UIApplicationDelegate) {
		if (this._delegate !== value) {
			this._delegate = value;
		}
	}

	get rootView(): View {
		return this._rootView;
	}

	public addNotificationObserver(notificationName: string, onReceiveCallback: (notification: NSNotification) => void): NotificationObserver {
		const observer = NotificationObserver.initWithCallback(onReceiveCallback);
		NSNotificationCenter.defaultCenter.addObserverSelectorNameObject(observer, 'onReceive', notificationName, null);
		this._observers.push(observer);

		return observer;
	}

	public removeNotificationObserver(observer: any, notificationName: string) {
		const index = this._observers.indexOf(observer);
		if (index >= 0) {
			this._observers.splice(index, 1);
			NSNotificationCenter.defaultCenter.removeObserverNameObject(observer, notificationName, null);
		}
	}

	@profile
	private didFinishLaunchingWithOptions(notification: NSNotification) {
		setMaxRefreshRate();

		this._window = UIWindow.alloc().initWithFrame(UIScreen.mainScreen.bounds);
		// TODO: Expose Window module so that it can we styled from XML & CSS
		this._window.backgroundColor = this._backgroundColor;

		this.notifyAppStarted(notification);
	}

	public notifyAppStarted(notification?: NSNotification) {
		const args: LaunchEventData = {
			eventName: launchEvent,
			object: this,
			ios: (notification && notification.userInfo && notification.userInfo.objectForKey('UIApplicationLaunchOptionsLocalNotificationKey')) || null,
		};

		notify(args);
		notify(<LoadAppCSSEventData>{
			eventName: 'loadAppCss',
			object: <any>this,
			cssFile: getCssFileName(),
		});

		// this._window will be undefined when NS app is embedded in a native one
		if (this._window) {
			if (args.root !== null) {
				this.setWindowContent(args.root);
			}
		} else {
			this._window = UIApplication.sharedApplication.delegate.window;
		}
	}

	@profile
	private didBecomeActive(notification: NSNotification) {
		const ios = UIApplication.sharedApplication;
		const object = this;
		setInBackground(false);
		setSuspended(false);
		notify(<ApplicationEventData>{ eventName: resumeEvent, object, ios });
		notify(<ApplicationEventData>{ eventName: foregroundEvent, object, ios });
		const rootView = this._rootView;
		if (rootView && !rootView.isLoaded) {
			rootView.callLoaded();
		}
	}

	private didEnterBackground(notification: NSNotification) {
		const ios = UIApplication.sharedApplication;
		const object = this;
		setInBackground(true);
		setSuspended(true);
		notify(<ApplicationEventData>{ eventName: suspendEvent, object, ios });
		notify(<ApplicationEventData>{ eventName: backgroundEvent, object, ios });
		const rootView = this._rootView;
		if (rootView && rootView.isLoaded) {
			rootView.callUnloaded();
		}
	}

	private willTerminate(notification: NSNotification) {
		notify(<ApplicationEventData>{
			eventName: exitEvent,
			object: this,
			ios: UIApplication.sharedApplication,
		});
		const rootView = this._rootView;
		if (rootView && rootView.isLoaded) {
			rootView.callUnloaded();
		}
	}

	private didChangeStatusBarOrientation(notification: NSNotification) {
		const statusBarOrientation = UIApplication.sharedApplication.statusBarOrientation;
		const newOrientation = this.getOrientationValue(statusBarOrientation);

		if (this._orientation !== newOrientation) {
			this._orientation = newOrientation;
			orientationChanged(getRootView(), newOrientation);

			notify(<OrientationChangedEventData>{
				eventName: orientationChangedEvent,
				ios: this,
				newValue: this._orientation,
				object: this,
			});
		}
	}

	private didReceiveMemoryWarning(notification: NSNotification) {
		notify(<ApplicationEventData>{
			eventName: lowMemoryEvent,
			object: this,
			ios: UIApplication.sharedApplication,
		});
	}

	private getOrientationValue(orientation: number): 'portrait' | 'landscape' | 'unknown' {
		switch (orientation) {
			case UIInterfaceOrientation.LandscapeRight:
			case UIInterfaceOrientation.LandscapeLeft:
				return 'landscape';
			case UIInterfaceOrientation.PortraitUpsideDown:
			case UIInterfaceOrientation.Portrait:
				return 'portrait';
			case UIInterfaceOrientation.Unknown:
				return 'unknown';
		}
	}

	public _onLivesync(context?: ModuleContext): void {
		// Handle application root module
		const isAppRootModuleChanged = context && context.path && context.path.includes(getMainEntry().moduleName) && context.type !== 'style';

		// Set window content when:
		// + Application root module is changed
		// + View did not handle the change
		// Note:
		// The case when neither app root module is changed, nor livesync is handled on View,
		// then changes will not apply until navigate forward to the module.
		if (isAppRootModuleChanged || (this._rootView && !this._rootView._onLivesync(context))) {
			this.setWindowContent();
		}
	}

	public setWindowContent(view?: View): void {
		if (this._rootView) {
			// if we already have a root view, we reset it.
			this._rootView._onRootViewReset();
		}
		const rootView = createRootView(view);
		const controller = getViewController(rootView);

		this._rootView = rootView;

		// setup view as styleScopeHost
		rootView._setupAsRootView({});

		setViewControllerView(rootView);

		const haveController = this._window.rootViewController !== null;
		this._window.rootViewController = controller;

		setRootViewsSystemAppearanceCssClass(rootView);

		if (!haveController) {
			this._window.makeKeyAndVisible();
		}

		rootView.on(IOSHelper.traitCollectionColorAppearanceChangedEvent, () => {
			const userInterfaceStyle = controller.traitCollection.userInterfaceStyle;
			const newSystemAppearance = getSystemAppearanceValue(userInterfaceStyle);

			if (this._systemAppearance !== newSystemAppearance) {
				this._systemAppearance = newSystemAppearance;
				systemAppearanceChanged(rootView, newSystemAppearance);

				notify(<SystemAppearanceChangedEventData>{
					eventName: systemAppearanceChangedEvent,
					ios: this,
					newValue: this._systemAppearance,
					object: this,
				});
			}
		});
	}
}

/* tslint:disable */
let iosApp: iOSApplication;
/* tslint:enable */
export { iosApp as ios };

export function ensureNativeApplication() {
	if (!iosApp) {
		iosApp = new iOSApplication();
		setApplication(iosApp);
	}
}

// attach on global, so it can be overwritten in NativeScript Angular
(<any>global).__onLiveSyncCore = function (context?: ModuleContext) {
	ensureNativeApplication();
	iosApp._onLivesync(context);
};

let mainEntry: NavigationEntry;

function createRootView(v?: View) {
	let rootView = v;
	if (!rootView) {
		// try to navigate to the mainEntry (if specified)
		if (!mainEntry) {
			throw new Error('Main entry is missing. App cannot be started. Verify app bootstrap.');
		} else {
			// console.log('createRootView mainEntry:', mainEntry);
			rootView = Builder.createViewFromEntry(mainEntry);
		}
	}
	// console.log('createRootView rootView:', rootView);

	setRootViewsCssClasses(rootView);

	return rootView;
}

export function getMainEntry() {
	return mainEntry;
}

export function getRootView() {
	ensureNativeApplication();
	return iosApp.rootView;
}

let started = false;
export function run(entry?: string | NavigationEntry) {
	ensureNativeApplication();

	mainEntry = typeof entry === 'string' ? { moduleName: entry } : entry;
	started = true;

	if (!iosApp.nativeApp) {
		// Normal NativeScript app will need UIApplicationMain.
		UIApplicationMain(0, null, null, iosApp && iosApp.delegate ? NSStringFromClass(<any>iosApp.delegate) : NSStringFromClass(Responder));
	} else {
		// TODO: this rootView should be held alive until rootController dismissViewController is called.
		const rootView = createRootView();
		if (rootView) {
			// Attach to the existing iOS app
			const window = iosApp.nativeApp.keyWindow || (iosApp.nativeApp.windows.count > 0 && iosApp.nativeApp.windows[0]);
			if (window) {
				const rootController = window.rootViewController;
				if (rootController) {
					const controller = getViewController(rootView);
					rootView._setupAsRootView({});
					const embedderDelegate = NativeScriptEmbedder.sharedInstance().delegate;
					if (embedderDelegate) {
						embedderDelegate.presentNativeScriptApp(controller);
					} else {
						const visibleVC = getVisibleViewController(rootController);
						visibleVC.presentViewControllerAnimatedCompletion(controller, true, null);
					}

					// Mind root view CSS classes in future work
					// on embedding NativeScript applications
					setRootViewsSystemAppearanceCssClass(rootView);
					rootView.on(IOSHelper.traitCollectionColorAppearanceChangedEvent, () => {
						const userInterfaceStyle = controller.traitCollection.userInterfaceStyle;
						const newSystemAppearance = getSystemAppearanceValue(userInterfaceStyle);

						if (this._systemAppearance !== newSystemAppearance) {
							this._systemAppearance = newSystemAppearance;

							notify(<SystemAppearanceChangedEventData>{
								eventName: systemAppearanceChangedEvent,
								ios: this,
								newValue: this._systemAppearance,
								object: this,
							});
						}
					});
					iosApp.notifyAppStarted();
				}
			}
		}
	}

	initAccessibilityCssHelper();
	initAccessibilityFontScale();
}

export function addCss(cssText: string, attributeScoped?: boolean): void {
	notify(<CssChangedEventData>{
		eventName: 'cssChanged',
		object: <any>iosApp,
		cssText: cssText,
	});
	if (!attributeScoped) {
		const rootView = getRootView();
		if (rootView) {
			rootView._onCssStateChange();
		}
	}
}

export function _resetRootView(entry?: NavigationEntry | string) {
	ensureNativeApplication();
	mainEntry = typeof entry === 'string' ? { moduleName: entry } : entry;
	iosApp.setWindowContent();
}

export function getNativeApplication(): UIApplication {
	ensureNativeApplication();
	return iosApp.nativeApp;
}

function getSystemAppearanceValue(userInterfaceStyle: number): 'dark' | 'light' {
	switch (userInterfaceStyle) {
		case UIUserInterfaceStyle.Dark:
			return 'dark';
		case UIUserInterfaceStyle.Light:
		case UIUserInterfaceStyle.Unspecified:
			return 'light';
	}
}

function getViewController(rootView: View): UIViewController {
	let viewController: UIViewController = rootView.viewController || rootView.ios;

	if (!(viewController instanceof UIViewController)) {
		// We set UILayoutViewController dynamically to the root view if it doesn't have a view controller
		// At the moment the root view doesn't have its native view created. We set it in the setViewControllerView func
		viewController = IOSHelper.UILayoutViewController.initWithOwner(new WeakRef(rootView)) as UIViewController;
		rootView.viewController = viewController;
	}

	return viewController;
}

function setViewControllerView(view: View): void {
	const viewController: UIViewController = view.viewController || view.ios;
	const nativeView = view.ios || view.nativeViewProtected;

	if (!nativeView || !viewController) {
		throw new Error('Root should be either UIViewController or UIView');
	}

	if (viewController instanceof IOSHelper.UILayoutViewController) {
		viewController.view.addSubview(nativeView);
	}
}

function setRootViewsCssClasses(rootView: View): void {
	ensureNativeApplication();
	const deviceType = Device.deviceType.toLowerCase();

	CSSUtils.pushToSystemCssClasses(`${CSSUtils.CLASS_PREFIX}${IOS_PLATFORM}`);
	CSSUtils.pushToSystemCssClasses(`${CSSUtils.CLASS_PREFIX}${deviceType}`);
	CSSUtils.pushToSystemCssClasses(`${CSSUtils.CLASS_PREFIX}${iosApp.orientation}`);

	rootView.cssClasses.add(CSSUtils.ROOT_VIEW_CSS_CLASS);
	const rootViewCssClasses = CSSUtils.getSystemCssClasses();
	rootViewCssClasses.forEach((c) => rootView.cssClasses.add(c));
}

function setRootViewsSystemAppearanceCssClass(rootView: View): void {
	ensureNativeApplication();
	if (majorVersion >= 13) {
		const systemAppearanceCssClass = `${CSSUtils.CLASS_PREFIX}${iosApp.systemAppearance}`;
		CSSUtils.pushToSystemCssClasses(systemAppearanceCssClass);
		rootView.cssClasses.add(systemAppearanceCssClass);
	}
}

export function orientation(): 'portrait' | 'landscape' | 'unknown' {
	ensureNativeApplication();
	return iosApp.orientation;
}

export function systemAppearance(): 'dark' | 'light' {
	ensureNativeApplication();
	return iosApp.systemAppearance;
}

global.__onLiveSync = function __onLiveSync(context?: ModuleContext) {
	if (!started) {
		return;
	}

	const rootView = getRootView();
	livesync(rootView, context);
};

// core exports this symbol so apps may import them in general
// technically they are only available for use when running that platform
// helps avoid a webpack nonexistent warning
export const AndroidApplication = undefined;
