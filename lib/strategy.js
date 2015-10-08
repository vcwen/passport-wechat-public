
var passport = require('passport-strategy')
var url = require('url');
var util = require('util');
var utils = require('./utils');
var OAuth = require('wechat-oauth');
var logger = require('winston');



function WechatPublicStrategy(options, verify) {
  if (typeof options == 'function') {
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
  this._oauth = new OAuth(options.appId, options.appSecret);
  this._agent = options.agent || 'wechat';
  this._callbackURL = options.callbackURL;
  this._scope = options.scope;
  this._scopeSeparator = options.scopeSeparator || ' ';
  this._state = options.state;
  this._verify = verify;
  this._passReqToCallback = options.passReqToCallback;
  //state can't be blank, needs it to determine if user disapproved auth.
  this._state = options.state || "state";
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(WechatPublicStrategy, passport.Strategy);


WechatPublicStrategy.prototype.authenticate = function(req, options) {
  options = options || {};

  var self = this;
  //user disapproved, in the wechat docs it says it won't have code when user disapproved, actually get code 'authdeny'
  if (req.query && req.query.state && (!req.query.code ||  req.query.code === 'authdeny')) {
    logger.info("User disapproved authentication.");
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

  function verifyResult(accessToken, refreshToken, params,profile,verified) {
    try {
      if (self._passReqToCallback) {
        var arity = self._verify.length;
        if (arity == 6) {
          self._verify(req, accessToken, refreshToken, params, profile, verified);
        } else { // arity == 5
          self._verify(req, accessToken, refreshToken, profile, verified);
        }
      } else {
        var arity = self._verify.length;
        if (arity == 5) {
          self._verify(accessToken, refreshToken, params, profile, verified);
        } else { // arity == 4
          self._verify();
        }
      }
    } catch (ex) {
      return self.error(ex);
    }
  }

  if (req.query && req.query.code) {
    var code = req.query.code;
    this._code = code;
    var params = this.tokenParams(options);
    this._oauth.getAccessToken(code,
      function(err, result) {
        if (err) return self.error(err);
        var data = result.data;
        logger.info("retrieved access token.", data);
        var accessToken = data.access_token;
        var refreshToken = data.refresh_token;
        var openId = data.openid;
        if (data.scope === 'snsapi_base') {
          var profile = {
            id: openId,
            openId: openId
          }
          verifyResult(accessToken, refreshToken,{}, profile,verified);
        } else {
          self.getUserInfo(openId, accessToken,function(err,profile){
            if(err) return self.error(err);
            logger.info("retrieved user profile: %j", profile);
            profile.id = profile.openid;
            verifyResult(accessToken, refreshToken,{}, profile,verified)
          });
        }
      }
    );
  } else {
    var params = this.authorizationParams(options);
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
    logger.info("start authentication, agent: %s, redirect to %s", this._agent, location);
    this.redirect(location, 302);
  }
};


WechatPublicStrategy.prototype.getUserInfo = function(openId, accessToken, cb) {
  var self = this;
  var lang = this._lang || 'zh_CN';
  var params = {
    openid: openId,
    lang: lang
  };
  this._oauth._getUser(params, accessToken,function(err, profile) {
    if (err) return cb(err);
    cb(null, profile);
  });
};


WechatPublicStrategy.prototype.authorizationParams = function(options) {
  return {};
};


WechatPublicStrategy.prototype.tokenParams = function(options) {
  return {};
};


module.exports = WechatPublicStrategy;
