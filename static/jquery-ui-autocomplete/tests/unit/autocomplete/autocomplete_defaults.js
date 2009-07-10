/*
 * autocomplete_defaults.js
 */

var autocomplete_defaults = {
	ajaxDelay: 400,
	autoFill: false,
	cacheLength: 10,
	delay: 10,
	disabled: false,
	extraParams: {},
	formatItem: '???',
	formatMatch: null,
	formatResult: undefined,
	highlight: '???',
	inputClass: "ui-autocomplete-input",
	loadingClass: "ui-autocomplete-loading",
	localDelay: 10,
	matchCase: false,
	matchContains: false,
	matchSubset: true,
	max: 150,
	minChars: 1,
	multiple: false,
	multipleSeparator: ", ",
	mustMatch: false,
	noScrollMax: 10,
	resultsClass: "ui-widget ui-widget-content ui-autocomplete-results",
	scroll: true,
	scrollHeight: 180,
	scrollMax: 150,
	selectFirst: true,
	width: ""
};

commonWidgetTests('autocomplete', { defaults: autocomplete_defaults });
