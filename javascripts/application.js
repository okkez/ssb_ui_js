// Place your application-specific JavaScript functions and classes here
// This file is automatically included by javascript_include_tag :defaults

var Ssb = {

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
  find_a: function(options, params){
    $.getJSON();
  }
};
