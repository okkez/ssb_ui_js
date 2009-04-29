// Date extension
Date.prototype.strftime = function(format) {
    var f = function(num) {
        var str = num.toString();
        if (str.length === 1) {
            str = '0' + str;
        }
        return str;
    };
    // とりあえず使うモノだけ
    var data = {
        '%Y': this.getFullYear(),
        '%m': f(this.getMonth() + 1),
        '%d': f(this.getDate())
    };
    var result = format;
    $.each(data, function(key, value){
        result = result.replace(new RegExp(key), value);
    });
    return result;
};


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
        $.each(data, function(key, value){
            result = result.replace(new RegExp("{"+key+"}"), value);
        });
        return result;
    },
    append_query_parameters: function(url, params){
        var temp = [];
        $.each(params, function(key, val){ temp.push(key + "=" + val); });
        if (temp.length === 0) {
            return url;
        }
        return url + "?" + temp.join("&");
    },
    url: function(template, options, params){
        var result = this.t(template, options);
        result = this.append_query_parameters(result, params);
        Ssb.log(result);
        return result;
    },
    rough_time_string: function(time) {
        console.log(time);
        var m = /^(\d+?)-(\d+?)-(\d+?) (\d+?):(\d+?):(\d+?)$/.exec(time);
        var now = new Date(); // NOTE: Is this right way to get current time?
        m = $.map(m, function(e, i) { return new Number(e); });
        var date = new Date(m[1], m[2]-1, m[3], m[4], m[5], m[6]);
        var diff = now.getTime() - date.getTime();
        var f = function (d) {
            return {
                minutes: Math.floor(d / (1000 * 60)),
                hours:   Math.floor(d / (1000 * 60 * 60)),
                day:     Math.floor(d / (1000 * 60 * 60 * 24)),
                month:   Math.floor(d / (1000 * 60 * 60 * 24 * 30)),
                year:    Math.floor(d / (1000 * 60 * 60 * 24 * 365))
            };
        };
        var s = function(num) {
            if (num === 1) {
                return "";
            } else {
                return "s";
            }
        };
        var r = f(diff);
        Ssb.log(["diff", r]);
        if (r.year > 0){
            r.suffix = s(r.year);
            return Ssb.Util.t("about {year} year{suffix} ago", r);
        }
        if (r.month > 0){
            r.suffix = s(r.month);
            return Ssb.Util.t("about {month} month{suffix} ago", r);
        }
        if (r.day > 0){
            r.suffix = s(r.day);
            return Ssb.Util.t("about {day} day{suffix} ago", r);
        }
        if (r.hour > 0){
            r.suffix = s(r.hour);
            return Ssb.Util.t("about {hour} hour{suffix} ago", r);
        }
        if (r.minute > 0){
            r.suffix = s(r.minute);
            return Ssb.Util.t("about {minute} minute{suffix} ago", r);
        }
        return "";
    }
};

Ssb.API = {
    site: "http://stack.nayutaya.jp/api/",
    wrapper_site: "http://localhost:10080/ssb/api/",
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
    find_mumbles_by_book: function(options, params, callback) {
        $.getJSON(Ssb.Util.url(Ssb.API.site+"book/{book_id_type}/{book_id}/mumbles.json", options, params), callback);
    },
    find_mumbles_by_user: function(options, params, callback) {
        $.getJSON(Ssb.Util.url(Ssb.API.site+"user/{user_id_type}/{user_id}/mumbles.json", options, params), callback);
    },
    create_or_update: function(book, callback) {
        if (Ssb.API.token === null || Ssb.API.token === ""){
            Ssb.log([book.asin, book.state]);
            return;
        }
        // book = { asin:1234567890, date:'yyyy-mm-dd', state:'unread', public:true }
        var body = $.toJSON([book]);
        Ssb.log(body);
        $.post(Ssb.Util.url(Ssb.API.wrapper_site+"{user_name}/{token}/stocks/update",
                            { user_name: Ssb.API.user_name, token: Ssb.API.token }, { callback: '?' }),
               { request: body }, callback, 'json');
        // $.post(Ssb.Util.url(Ssb.API.site+"{user_name}/{token}/stocks/update.1",
        //                     { user_name: Ssb.API.user_name, token: Ssb.API.token }, { callback: '?' }), { request: body }, callback);
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
        $("a#user_mumbles").click(function(){ return Ssb.View.viewUserMumbles(); });
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
                                                   date: (new Date()).strftime('%Y-%m-%d'),
                                                   state: state,
                                                   "public": true
                                               }, function(data, status){ Ssb.View.updateStateCallback(data, status); });
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
                    panel.append($("<ul>"));
                    $.each(data.response.stocks, function(index, stock) {
                        $("ul", panel)
                            .append($("<li>").attr("id", stock.book.isbn10).addClass("stock")
                                    .append($("<a>").text(stock.book.title).attr("href", stock.book.uri),
                                            $("<a>").addClass("mumbles").text("\u3000").attr("title", "mumbles").attr("href", "#").click(function() { return Ssb.View.viewMumbles(stock); }),
                                            $("<br>"),
                                            $("<span>").text("Update State : ")));
                        $.each(update_state_links(stock), function(index, alink) {
                            $("ul > li#" + stock.book.isbn10  + " > span", panel).append(alink);
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
        if ($('#info_message')) {
            $('#info_message').dialog('destroy');
        }
        if ($("#error_message")) {
            $("#error_message").dialog('destroy');
        }
    },
    addErrorMessage: function(message) {
        var id = "error_message";
        $("div#message").append($("<div>").attr("id", id).hide());
        id = "#"+id;
        $(id).append($("<div>").addClass("ui-state-error ui-corner-all")
                     .append($("<p>")
                             .append($("<span>")
                                     .addClass("ui-icon ui-icon-alert")
                                     .css("float","left").css("margin-right",".3em"),
                                     $("<strong>").text("Alert : "),
                                     $("<span>").text(message))));
        $(id).dialog({
            title: "Error Message",
            width: 600,
            height: 200
        });
    },
    addInfoMessage: function(message) {
        var id = "info_message";
        $("div#message").append($("<div>").attr("id", id).hide());
        id = "#"+id;
        $(id).append($("<div>")
                     .addClass("ui-state-highlight ui-corner-all")
                     .append($("<p>")
                             .append($("<span>")
                                     .addClass("ui-icon ui-icon-info")
                                     .css("float","left").css("margin-right",".3em"),
                                     $("<strong>").text("Info : "),
                                     $("<span>").text(message))));
        $(id).dialog({
            title: "Info Message",
            width: 600,
            height: 200,
            open: function(event) { $(this).fadeOut('slow', function(){ $(this).dialog('destroy'); }); }
        });
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
                             return p.has_previous_page ?
                                 $('<a>').attr('href', '#').click(m(p.current_page-1)).text('Previous') :
                                 $('<span>').text('Previous');
                         })(),
                         (function() {
                              var result = $('<span>');
                              var links = $.map(new Array(p.total_pages), function(e, i) {
                                  return (p.current_page === i+1) ?
                                                        $('<span>').text(i+1) :
                                                        $('<a>').attr('href', '#').click(m(i+1)).text(i+1);
                              });
                              $.each(links, function(i, e){
                                  result.append(e);
                              });
                              console.log(links);
                              console.log(result);
                              return result;
                         })(),
                         (function() {
                             return p.has_next_page ?
                                  $('<a>').attr('href', '#').click(m(p.current_page+1)).text('Next') :
                                  $('<span>').text('Next');
                         })());
        };
        $(panel).prepend(f(pagination)).append(f(pagination));
    },
    viewMumbles: function(stock) {
        $("li#"+stock.book.isbn10).append($("<div>").attr("id", "mumbles_" + stock.book.isbn10).addClass("mumbles").hide());
        Ssb.API.Book.find_mumbles_by_book(
            { book_id_type: "isbn10", book_id: stock.book.isbn10 },
            { page: "1", include_users: true, callback: "?" },
            function(data) {
                Ssb.View.clearMessage();
                if (data.success) {
                    var id = "#mumbles_"+stock.book.isbn10;
                    $(id).append($("<ul>"));
                    $.each(data.response.mumbles, function(index, mumble) {
                        $(id + " > ul").append(
                            $("<li>").addClass("mumble").append(
                                $("<div>").addClass("mumble_header").text(Ssb.Util.rough_time_string(mumble.time) + " : " + mumble.user.nick),
                                $("<div>").addClass("mumble_body").text(mumble.body)));
                    });
                    $("li.mumble:nth-child(odd)").css("background-color", "#C1FFC1");
                    $("li.mumble:nth-child(even)").css("background-color", "#FFE4E1");
                    $(id).dialog({
                        title: "mumbles about " + stock.book.isbn10 + " (" + data.response.mumbles.length + ")",
                        width: 600,
                        height: 200
                    });
                } else {
                    Ssb.View.addErrorMessage(data.message);
                }
            }
        );
        return false;
    },
    viewUserMumbles: function() {
        if (!Ssb.API.user_name) {
            return false;
        }
        var id = "user_mumbles_dialog";
        $("div#contents").append($("<div>").attr("id", id).addClass("mumbles").hide());
        id = "#" + id;
        Ssb.API.Book.find_mumbles_by_user(
            { user_id_type: "name", user_id: Ssb.API.user_name },
            { include_books: true, page: 1, callback: "?" },
            function(data) {
                Ssb.View.clearMessage();
                if (data.success) {
                    $(id).append($("<ul>"));
                    $.each(data.response.mumbles, function(index, mumble) {
                        $(id + " > ul").append(
                            $("<li>").addClass("mumble").append(
                                $("<div>").addClass("mumble_header").text(Ssb.Util.rough_time_string(mumble.time) + " : " + mumble.book.title),
                                $("<div>").addClass("mumble_body").text(mumble.body)));
                    });
                    $("li.mumble:nth-child(odd)").css("background-color", "#C1FFC1");
                    $("li.mumble:nth-child(even)").css("background-color", "#FFE4E1");
                    $(id).dialog({
                        title: "mumbles by " + Ssb.API.user_name,
                        width: 600,
                        height: 200
                    });
                } else {
                    Ssb.View.addErrorMessage(data.message);
                }
            }
        );
        return false;
    }, updateStateCallback: function(data, status) {
        if (status) {
            Ssb.View.addInfoMessage(data.message);
            $("#"+data.response[0].asin).fadeOut('slow', function(){ $(this).remove(); });
        } else {
            Ssb.View.addErrorMessage(data.message);
        }
    }
};
