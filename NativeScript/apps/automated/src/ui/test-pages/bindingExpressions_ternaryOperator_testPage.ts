import * as pages from '@nativescript/core/ui/page';

export function pageLoaded(args) {
	var page = <pages.Page>args.object;
	page.bindingContext = { author: 'Pratchett' };
}
