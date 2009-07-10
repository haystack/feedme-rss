/*
 * autocomplete_core.js
 */

(function($) {

module("autocomplete: core");

test("re-attach", function() {
	expect(2);

	var el = $("#autocomplete").autocomplete().autocomplete("destroy").autocomplete();
	ok(true, '.autocomplete().autocomplete("destroy").autocomplete() called on element');

	$('<input id="autocomplete_dis">').autocomplete().autocomplete("destroy").autocomplete().remove();
	ok(true, '.autocomplete().autocomplete("destroy").autocomplete() called on disconnected element');
});

test("highlighter", function() {
	equals( $.ui.autocomplete.defaults.highlight("Peter", "Pe"), "<strong>Pe</strong>ter" );
	equals( $.ui.autocomplete.defaults.highlight("Peter <em>&lt;Pan&gt;</em>", "Pe"), "<strong>Pe</strong>ter <em>&lt;Pan&gt;</em>" );
	equals( $.ui.autocomplete.defaults.highlight("Peter <em>&lt;Pan&gt;</em>", "a"), "Peter <em>&lt;P<strong>a</strong>n&gt;</em>" );
	equals( $.ui.autocomplete.defaults.highlight("Peter <em>(&lt;Pan&gt;)</em>", "(&lt;P"), "Peter <em><strong>(&lt;P</strong>an&gt;)</em>" );
});

})(jQuery);
