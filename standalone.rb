#!/usr/bin/ruby

require 'webrick'
require 'net/http'

module Ssb
  class App
    def update(user, token, data, params = nil)
      Ssb::Api.update_a(user, token, data)
    end
    def get_instance(server)
      self
    end
    def service(req, res)
      match_data = (%r!\A/(\w+?)/(\w+?)/stocks/(\w+?)\z!).match(req.path_info)
      user, token, m = match_data.values_at(1, 2, 3)
      params = { }
      req.query_string.split('&').each do |v|
        h = v.split('=')
        params[h[0]] = h[1]
      end
      data = req.query
      original_response = __send__(m, user, token, data, params)
      res.body = "#{params['callback']}(#{original_response.body})"
      res['Content-Type'] = original_response['Content-Type']
    end
  end

  module Api
    def self.update_a(user, token, data)
      response = nil
      Net::HTTP.start("stack.nayutaya.jp", 80) do |http|
        uri = "/api/#{user}/#{token}/stocks/update.1"
        response = http.post(uri, data.map{|k, v| "#{k}=#{v}" }.join("&"))
      end
      response
    end
  end
end

document_root = ARGV[0] || '.'
port = ARGV[1] || 10080

server = WEBrick::HTTPServer.new({ :DocumentRoot => document_root,
                                   #:BindAddress => '127.0.0.1',
                                   :BindAddress => '0.0.0.0',
                                   :Port => port})
Signal.trap("INT"){ server.shutdown }
app = Ssb::App.new
server.mount '/ssb/api/', app
server.start

def usage
  STDERR.puts <<EOD
usage:
$0 document_roor port
EOD
end
