// Stack Stock Books
var Ssb = {
    DEBUG: true,
    log: function(arg){
        if (Ssb.DEBUG) {
            console.log(arg);
        }
    }
};

Ssb.Util = {
    t: function(template, data){
        var result = template;
        $.each(data,
               function(key, value){
                   result = result.replace(new RegExp("{"+key+"}"), value);
               });
        return result;
    },
    append_query_parameters: function(url, params){
        var result = url;
        result = result + "?";
        var temp = [];
        $.each(params, function(key, val){ temp.push(key + "=" + val); });
        return result + temp.join("&");
    },
    url: function(template, options, params){
        var result = this.t(template, options);
        result = this.append_query_parameters(result, params);
        Ssb.log(result);
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
    },
    create_or_update: function(book, callback) {
        if (Ssb.API.token === null || Ssb.API.token === ""){
            Ssb.log([book.asin, book.state]);
            return;
        }
        // book = { asin:1234567890, date:'yyyy-mm-dd', state:'unread', public:true }
        var body = $.toJSON([book]);
        Ssb.log(body);
        $.post(Ssb.Util.url(Ssb.API.site+"{user_name}/{token}/stocks/update.1", { user_name: Ssb.API.user_name, token: Ssb.API.token }), { request: body }, callback);
    }
};

Ssb.View = {
    initialize: function(){
        $("div#initialize_form").find("input[type='text']").each(function(i, e) {
            $(e).attr('readonly', true);
        }).end().find("input#submit").each(function(i,e) {
            $(e).hide();
        }).end().find("input#toggle").each(function(i,e) {
            $(e).click(Ssb.View.toggleForm).attr("value", "re-edit").show();
        });
        $("div#contents")
            .append($("<div>").attr("id", "state_tabs")
            .append($("<ul>")
                    .append($("<li>").append($("<a>").attr("href", "#state_tabs-1").text("reading")),
                            $("<li>").append($("<a>").attr("href", "#state_tabs-2").text("unread")),
                            $("<li>").append($("<a>").attr("href", "#state_tabs-3").text("wish")),
                            $("<li>").append($("<a>").attr("href", "#state_tabs-4").text("read"))),
                    $("<div>").attr("id", "state_tabs-1").addClass("books"),
                    $("<div>").attr("id", "state_tabs-2").addClass("books"),
                    $("<div>").attr("id", "state_tabs-3").addClass("books"),
                    $("<div>").attr("id", "state_tabs-4").addClass("books")));
        $("div#state_tabs").tabs({
                                     selected: null,
                                     cache: true
                                 }).bind("tabsselect",
                                 function(event, ui){
                                     // ui.tab 選択されたタブを表す
                                     // ui.panel 選択されたタブに関連するパネルを表す
                                     Ssb.View.updatePanel($(ui.panel), 1);
                                 });
        $("div#contents").show();
    },
    updatePanel: function(panel, page){
        panel.empty();
        var states = {
            "state_tabs-1": "reading",
            "state_tabs-2": "unread",
            "state_tabs-3": "wish",
            "state_tabs-4": "read"
        };
        var update_state_links = function(stock){
            var states_table = {
                "reading": ["unread", "wish", "read"],
                "unread": ["reading", "wish", "read"],
                "wish": ["reading", "unread", "read"],
                "read": ["reading", "unread", "wish"]
            };
            var update_state_link = function(state) {
                return $("<a>").attr("href", "#")
                    .text(state+" ").click(function(){
                                               Ssb.API.Book.create_or_update({
                                                                                 asin: stock.book.isbn10,
                                                                                 date: null,
                                                                                 state: state,
                                                                                 "public": true
                                                                             }, function(data, status){ Ssb.log(data.message); });
                                           });
            };
            return $.map(states_table[stock.state], function(v, index){
                return update_state_link(v);
            });
        };
        var state = states[panel.attr("id")];
        Ssb.API.Book.find_stocks_by_user_and_state(
            { user_id_type: "name", user_id: Ssb.API.user_name, state: state },
            { include_books: true, page: page, callback:"?" },
            function(data){
                Ssb.View.clearMessage();
                if (data.success) {
                    Ssb.View.addInfoMessage(data.message);
                    panel.append($("<ul>"));
                    $.each(data.response.stocks, function(index, stock) {
                        $("ul", panel)
                            .append($("<li>").attr("id", stock.stock_id.toString()).addClass("stock")
                                    .append($("<a>").text(stock.book.title).attr("href", stock.book.uri),
                                            $("<br>"),
                                            $("<span>").text("Update State : ")));
                        $.each(update_state_links(stock), function(index, alink) {
                            $("ul > li#" + stock.stock_id  + " > span", panel).append(alink);
                        });
                    });
                    Ssb.View.addPaginationLinks(data.pagination, panel);
                    $("li.stock:nth-child(odd)").css("background-color", "#FFFCD0");
                    $("li.stock:nth-child(even)").css("background-color", "#DEF1FD");
                } else {
                    Ssb.View.addErrorMessage(data.message);
                }
            }
        );
    },
    clearMessage: function() {
        $("div#message").hide().find("p").empty();
    },
    addErrorMessage: function(message) {
        $("div#message").show().click(function(event) { $(this).hide(); })
            .find("div")
            .removeClass("ui-state-highlight")
            .addClass("ui-state-error")
            .find("p").append($("<span>")
                              .addClass("ui-icon ui-icon-alert")
                              .css("float","left").css("margin-right",".3em"),
                              $("<strong>").text("Alert : "),
                              $("<span>").text(message));
    },
    addInfoMessage: function(message) {
        $("div#message").show()
            .find("div")
            .addClass("ui-state-highlight")
            .removeClass("ui-state-error")
            .find("p").append($("<span>")
                              .addClass("ui-icon ui-icon-info")
                              .css("float","left").css("margin-right",".3em"),
                              $("<strong>").text("Info : "),
                              $("<span>").text(message)).end().fadeOut(3000);
    },
    toggleForm: function() {
        $("div#initialize_form").find("input[type='text']").each(function(i, e) {
            $(e).attr("readonly", function(i) {
                return !$(this).attr("readonly");
            });
        }).end().find("input#toggle").each(function(i, e) {
            $(e).attr("value", function(i) {
                return ("submit" === this.value) ? "re-edit" : "submit";
            });
        });
        return false;
    },
    addPaginationLinks: function(pagination, panel) {
        var f = function(p) {
            var m = function(page) {
                return function() {
                    Ssb.View.updatePanel(panel, page);
                };
            };
            return $('<div>').addClass('pagination_links')
                .append((function(){
                             return p.has_previous_page
                                 ? $('<a>').attr('href', '#').click(m(p.current_page-1)).text('Previous')
                                 : $('<span>').text('Previous');
                         })(),
                         (function() {
                              var result = $('<span>');
                              var links = $.map(new Array(p.total_pages), function(e, i) {
                                  return (p.current_page === i+1)
                                      ? $('<span>').text(i+1)
                                      : $('<a>').attr('href', '#').click(m(i+1)).text(i+1);
                              });
                              $.each(links, function(i, e){
                                  result.append(e);
                              });
                              console.log(links);
                              console.log(result);
                              return result;
                         })(),
                         (function() {
                             return p.has_next_page
                                  ? $('<a>').attr('href', '#').click(m(p.current_page+1)).text('Next')
                                  : $('<span>').text('Next');
                         })());
        };
        $(panel).prepend(f(pagination)).append(f(pagination));
    }
};
