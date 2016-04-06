var passport = require('passport-strategy')
var url = require('url');
var util = require('util');
var utils = require('./utils');
var OAuth = require('wechat-oauth');
var debug = require('debug')('passport-wechat-public');



function WechatPublicStrategy(options, verify) {
  if (typeof options === 'function') {
    verify = options;
    options = undefined;
  }
  options = options || {};

  if (!verify) {
    throw new TypeError('WechatPublicStrategy requires a verify callback');
  }

  if (!options.appId) {
    throw new TypeError('WechatPublicStrategy requires a appId option');
  }
  if (!options.appSecret) {
    throw new TypeError('WechatPublicStrategy requires a appSecret option');
  }

  passport.Strategy.call(this);
  this.name = 'wechat-public';
  this._oauth = new OAuth(options.appId, options.appSecret, options.getToken, options.saveToken);
  this._agent = options.agent || 'wechat';
  this._callbackURL = options.callbackURL;
  this._scope = options.scope || "snsapi_base";
  this._scopeSeparator = options.scopeSeparator || ' ';
  this._state = options.state;
  this._verify = verify;
  this._passReqToCallback = options.passReqToCallback;
  //state can't be blank, needs it to determine if user disapproved auth.
  this._state = options.state || "state";
  this._lang = options.language || 'zh_CN';
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(WechatPublicStrategy, passport.Strategy);


WechatPublicStrategy.prototype.authenticate = function(req, options) {
  options = options || {};

  var self = this;
  //user disapproved, in the wechat docs it says it won't have code when user disapproved, actually get code 'authdeny'
  if (req.query && req.query.state && (!req.query.code || req.query.code === 'authdeny')) {
    debug("User disapproved authentication.");
    return this.fail({
      message: "access_denied"
    });
  }

  var callbackURL = options.callbackURL || this._callbackURL;
  if (callbackURL) {
    var parsed = url.parse(callbackURL);
    if (!parsed.protocol) {
      // The callback URL is relative, resolve a fully qualified URL from the
      // URL of the originating request.
      callbackURL = url.resolve(utils.originalURL(req, {
        proxy: this._trustProxy
      }), callbackURL);
    }
  }

  function verified(err, user, info) {
    if (err) {
      return self.error(err);
    }
    if (!user) {
      return self.fail(info);
    }
    self.success(user, info);
  }

  function verifyResult(accessToken, refreshToken, params, profile, verified) {
    try {
      var arity = self._verify.length;
      if (self._passReqToCallback) {
        if (arity === 6) {
          self._verify(req, accessToken, refreshToken, params, profile, verified);
        } else { // arity == 5
          self._verify(req, accessToken, refreshToken, profile, verified);
        }
      } else {
        if (arity === 5) {
          self._verify(accessToken, refreshToken, params, profile, verified);
        } else { // arity == 4
          self._verify(accessToken, refreshToken, profile, verified);
        }
      }
    } catch (ex) {
      self.error(ex);
    }
  }

  var params = {};
  if (req.query && req.query.code) {
    var code = req.query.code;
    this._code = code;
    this._oauth.getAccessToken(code,
      function(err, result) {
        if (err) return self.error(err);
        var data = result.data;
        debug("retrieved access token.%j", data);
        var accessToken = data.access_token;
        var refreshToken = data.refresh_token;
        var openId = data.openid;
        if (data.scope === 'snsapi_base') {
          var profile = {
            id: openId,
            openid: openId
          }
          verifyResult(accessToken, refreshToken, {}, profile, verified);
        } else {
          var lang = this._lang;
          var options = {
            openid: openId,
            lang: lang
          };
          self._oauth.getUser(options, function(err, profile) {
            if (err) return self.error(err);
            debug("retrieved user profile: %j", profile);
            profile.id = profile.openid;
            verifyResult(accessToken, refreshToken, {}, profile, verified)
          });
        }
      }
    );
  } else {
    params.redirect_uri = callbackURL;
    var scope = options.scope || this._scope;
    if (scope) {
      if (Array.isArray(scope)) {
        scope = scope.join(this._scopeSeparator);
      }
      params.scope = scope;
    }
    var authUrlMethod = this._agent === 'wechat' ? "getAuthorizeURL" : "getAuthorizeURLForWebsite";
    var location = this._oauth[authUrlMethod](params.redirect_uri, this._state, params.scope);
    debug("start authentication, agent: %s, redirect to %s", this._agent, location);
    this.redirect(location, 302);
  }
};



module.exports = WechatPublicStrategy;
