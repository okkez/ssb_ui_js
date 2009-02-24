// Stack Stock Books
var Ssb = {

};

Ssb.Util = {
  t: function(template, data){
    var result = template;
    $.each(data, function(key, value){
      result = result.replace(new RegExp("{"+key+"}"), value);
    });
    return result;
  },
  append_query_parameters: function(url, params){
    var result = url;
    result = result + "?";
    var temp = [];
    $.each(params, function(key, val){
      temp.push(key + "=" + val);
    });
    return result + temp.join("&");
  },
  url: function(template, options, params){
    var result = this.t(template, options);
    result = this.append_query_parameters(result, params);
    console.log(result);
    return result;
  }
};

Ssb.API = {
  site: "http://stack.nayutaya.jp/api/",
  user_name: null,
  token: null,
  initialize: function(){
    this.user_name = $("input#user_name")[0].value;
    this.token = $("input#api_token")[0].value;
  }
};
Ssb.API.Book = {
  initialize: function(){
  },
  find_stocks_by_user_and_state: function(options, params, callback){
    $.getJSON(Ssb.Util.url(Ssb.API.site+"user/{user_id_type}/{user_id}/stocks/{state}.json", options, params), callback);
  }
};

Ssb.View = {
  initialize: function(){
    $("div#contents")
      .append($("<div>").attr("id", "state_tabs").addClass("ui-tabs")
	.append($("<ul>")
	  .append($("<li>").append($("<a>").attr("href", "#state_tabs-1").text("reading")),
		  $("<li>").append($("<a>").attr("href", "#state_tabs-2").text("unread")),
		  $("<li>").append($("<a>").attr("href", "#state_tabs-3").text("wish")),
		  $("<li>").append($("<a>").attr("href", "#state_tabs-4").text("read"))),
		$("<div>").attr("id", "state_tabs-1").addClass("books"),
		$("<div>").attr("id", "state_tabs-2").addClass("books"),
		$("<div>").attr("id", "state_tabs-3").addClass("books"),
		$("<div>").attr("id", "state_tabs-4").addClass("books")));
    $("div#state_tabs > ul").tabs({
      selected: 0,
      cache: true
    }).bind("tabsselect", function(event, original_event, ui){
      // ui.tab 選択されたタブを表す
      // ui.panel 選択されたタブに関連するパネルを表す
      Ssb.View.updatePanel($(ui.panel));
    });
    $("div#contents").show();
  },
  updatePanel: function(panel){
    var states = {
      "state_tabs-1": "reading",
      "state_tabs-2": "unread",
      "state_tabs-3": "wish",
      "state_tabs-4": "read"
    };
    var state = states[panel.attr("id")];
    Ssb.API.Book.find_stocks_by_user_and_state(
      { user_id_type: "name", user_id: Ssb.API.user_name, state: state },
      { include_books: true, page: 1, callback:"?" },
      function(data){
	if (data.success) {
	  $("#errorExplanation").empty();
	  panel.append($("<ul>"));
	  $.each(data.response.stocks, function(index, stock){
	    $("ul", panel)
		     .append($("<li>").addClass("stock")
			     .append($("<a>").text(stock.book.title).attr("href", stock.book.uri),
				     $("<br>"),
				     $("<span>").text("Update State : ")));
	  });
	  $("li.stock:nth-child(odd)").css("background-color", "#FFFCD0");
	  $("li.stock:nth-child(even)").css("background-color", "#DEF1FD");
	} else {
	  $("#errorExplanation").empty()
	    .append($("<h2>").text(data.message),
		    $("<p>").text(data.message));
	}
      }
    );
  }
};
