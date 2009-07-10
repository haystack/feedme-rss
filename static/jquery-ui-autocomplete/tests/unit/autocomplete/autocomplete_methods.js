/*
 * autocomplete_methods.js
 */
(function($) {

module("autocomplete: methods");

test("init", function() {
	expect(6);

	var el = $("#autocomplete").autocomplete();
	ok(true, '.autocomplete() called on element');

	$([]).autocomplete();
	ok(true, '.autocomplete() called on empty collection');

	$("<input/>").autocomplete();
	ok(true, '.autocomplete() called on disconnected DOMElement');

	$("<input/>").autocomplete().autocomplete("foo");
	ok(true, 'arbitrary method called after init');

	$("<input/>").autocomplete().data("foo.autocomplete");
	ok(true, 'arbitrary option getter after init');

	$("<input/>").autocomplete().data("foo.autocomplete", "bar");
	ok(true, 'arbitrary option setter after init');
});

test("destroy", function() {
	expect(6);

	$("#autocomplete").autocomplete().autocomplete("destroy");
	ok(true, '.autocomplete("destroy") called on element');

	$([]).autocomplete().autocomplete("destroy");
	ok(true, '.autocomplete("destroy") called on empty collection');

	$("<input/>").autocomplete().autocomplete("destroy");
	ok(true, '.autocomplete("destroy") called on disconnected DOMElement');

	$("<input/>").autocomplete().autocomplete("destroy").autocomplete("foo");
	ok(true, 'arbitrary method called after destroy');

	$("<input/>").autocomplete().autocomplete("destroy").data("foo.autocomplete");
	ok(true, 'arbitrary option getter after destroy');

	$("<input/>").autocomplete().autocomplete("destroy").data("foo.autocomplete", "bar");
	ok(true, 'arbitrary option setter after destroy');
});

test("enable", function() {
	expect(1);

	$("#autocomplete").autocomplete().autocomplete("disable").autocomplete("enable");
	ok(true, '.autocomplete("enable") called on element');
});

test("disable", function() {
	expect(1);

	$("#autocomplete").autocomplete().autocomplete("disable");
	ok(true, '.autocomplete("disable") called on element');
});

})(jQuery);
