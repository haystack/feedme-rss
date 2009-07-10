/*
 * autocomplete_options.js
 */
(function($) {

module("autocomplete: options");

test("defaults with url and no scroll", function() {
	el = $("#autocomplete").autocomplete({
		url: "xxx",
		scroll: false
	});
	equals(el.data("delay.autocomplete"), 400, "longer delay when url is specified");
	equals(el.data("max.autocomplete"), 10, "smaller max when scrolling is disabled");
});

test("defaults with custom delay and max", function() {
	el = $("#autocomplete").autocomplete({
		delay: 50,
		max: 30
	});
	equals(el.data("delay.autocomplete"), 50, "custom delay");
	equals(el.data("max.autocomplete"), 30, "custom max");
});

test("defaults with custom delay and max and url and no scroll", function() {
	el = $("#autocomplete").autocomplete({
		delay: 50,
		url: "xxx",
		scroll: false,
		max: 30
	});
	equals(el.data("delay.autocomplete"), 50, "custom delay");
	equals(el.data("max.autocomplete"), 30, "custom max");
});

test("option: extraParams callback with input as paramter", function() {
	stop();
	var expected = "hello";
	var autocomplete = $("#autocomplete").autocomplete({
		url: "data/emails-json.php",
		extraParams: {
			param: function(input) {
				same(input, expected);
				start();
			}
		} 
	})
	autocomplete.val(expected);
	autocomplete.triggerHandler("keydown");
	autocomplete.triggerHandler("keypress");
});

})(jQuery);
