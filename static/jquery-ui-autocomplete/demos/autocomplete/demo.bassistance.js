$(document).ready(function(){
	
	//Util methods
	
	function findValueCallback(event, data, formatted) {
		$("<li>").html( !data ? "No match!" : "Selected: " + formatted).appendTo("#result");
	};
	
	function formatItem(item) {
		return item[0] + " (<strong>id: " + item[1] + "</strong>)";
	};
	
	function formatResult(item) {
		return item[0].replace(/(<.+?>)/gi, '');
	};
	
	
	//Local Data
	
	$('#_TextSingleCity').autocomplete({data: cities, scroll: true});
	$('#_TextSingleCity2').autocomplete({data: cities, matchContains: true, minChars: 0});
	
	$('#_TextMonth').autocomplete({
		data: months,
		minChars: 0,
		max: 12,
		autoFill: true,
		mustMatch: true,
		matchContains: false,
		scrollHeight: 220,
		formatItem: function(item, i, total) {
			// don't show the current month in the list of values (for whatever reason)
			if ( item[0] == months[new Date().getMonth()] ) 
				return false;
			return item[0];
		}
	});	
	
	$('#_TextEmail').autocomplete({
		data: emails,
		minChars: 0,
		width: 310,
		matchContains: true,
		autoFill: false,
		formatItem: function(item, i, total) {
			return i + "/" + total + ": \"" + item.name + "\" [" + item.to + "]";
		},
		formatMatch: function(item, i, total) {
			return item.name + " " + item.to;
		},
		formatResult: function(item) {
			return item.to;
		}
	});	
	
	$('#_TextMultipleCities').autocomplete({
		data: cities,
		multiple: true,
		mustMatch: true,
		autoFill: true
	});	
	
	$('#_TextTags').autocomplete({
		data: ['c++', 'java', 'php', 'coldfusion', 'javascript', 'asp'],
		width: 320,
		max: 4,
		highlight: false,
		multiple: true,
		multipleSeparator: " ",
		scroll: true,
		scrollHeight: 300
	});	

	//Remote Data
	
	$('#_TextSingleBird').autocomplete({
		url: 'search.php',
		width: 260,
		selectFirst: false
	});
	$('#_TextMultipleBirds').autocomplete({
		url: 'search.php',
		width: 300,
		multiple: true,
		matchContains: true,
		formatItem: formatItem,
		formatResult: formatResult
	});		


	//Button init
	$('button').attr('type', 'button');
	$("#_ButtonRemove").click(function() {
		$(":input").autocomplete('destroy');
	});
	
});

function changeOptions(){
	var max = parseInt(window.prompt('Please type number of items to display:', jQuery.Autocompleter.defaults.max));
	if (max > 0) $("#_TextSingleCity").autocomplete('options', {max: max});
};

function changeScrollHeight() {
    var h = parseInt(window.prompt('Please type new scroll height (number in pixels):', jQuery.Autocompleter.defaults.scrollHeight));
    if(h > 0) $("#_TextSingleCity").autocomplete('options', {scrollHeight: h});
};

function changeToMonths(){
	$("#_TextSingleCity")
		// clear existing data
		.val("")
		// change the local data to months
		.('options', {data: months})
		// get the label tag
		.prev();
}