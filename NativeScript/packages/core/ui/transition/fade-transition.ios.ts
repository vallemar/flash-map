import { Transition } from '.';

export class FadeTransition extends Transition {
	public animateIOSTransition(containerView: UIView, fromView: UIView, toView: UIView, operation: UINavigationControllerOperation, completion: (finished: boolean) => void): void {
		const originalToViewAlpha = toView.alpha;
		const originalFromViewAlpha = fromView.alpha;

		toView.alpha = 0.0;
		fromView.alpha = 1.0;

		switch (operation) {
			case UINavigationControllerOperation.Push:
				containerView.insertSubviewAboveSubview(toView, fromView);
				break;
			case UINavigationControllerOperation.Pop:
				containerView.insertSubviewBelowSubview(toView, fromView);
				break;
		}

		const duration = this.getDuration();
		const curve = this.getCurve();
		UIView.animateWithDurationAnimationsCompletion(
			duration,
			() => {
				UIView.setAnimationCurve(curve);
				toView.alpha = 1.0;
				fromView.alpha = 0.0;
			},
			(finished: boolean) => {
				toView.alpha = originalToViewAlpha;
				fromView.alpha = originalFromViewAlpha;
				completion(finished);
			}
		);
	}
}
