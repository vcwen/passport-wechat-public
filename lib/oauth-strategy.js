/**
 * Module dependencies.
 */
var passport = require('passport-strategy'),
  url = require('url'),
  util = require('util'),
  utils = require('./utils'),
  OAuth = require('wechat-oauth');



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
  this.name = 'wechat-public-strategy';
  this._oauth = new OAuth(options.appId, options.appSecret);

  this._callbackURL = options.callbackURL;
  this._scope = options.scope;
  this._scopeSeparator = options.scopeSeparator || ' ';
  this._state = options.state;
  this._verify = function(data, verified) {
    verified(null, data);
  }


};
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(WechatPublicStrategy, passport.Strategy);



WechatPublicStrategy.prototype.authenticate = function(req, options, verify) {
  options = options || {};
  if (verify && typeof verify === 'function') {
    this._verify = verify;
  }


  var self = this;
  if (req.query && req.query.error) {
    if (req.query.error == 'access_denied') {
      return this.fail({
        message: req.query.error_description
      });
    } else {
      return this.error(new Error(req.query.error_description));
    }
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

  if (req.query && req.query.code) {
    var code = req.query.code;
    this._code = code;

    var params = this.tokenParams(options);

    function verified(err, user, info) {
      if (err) {
        return self.error(err);
      }
      if (!user) {
        return self.fail(info);
      }
      self.success(user, info);
    }

    this._oauth.getAccessToken(code,
      function(err, result) {
        if (err) return self.error(err);

        var data = result.data;
        if (data.scope === 'snsapi_base') {
          this._verify(data, verified);
        } else {
          self.getUserInfo(data.openid);
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

    var location = this._oauth.getAuthorizeURL(params.redirect_uri, params.state, params.state);
    this.redirect(location, 302);
  }
};


WechatPublicStrategy.prototype.getUserInfo = function(openId) {
  var self = this;
  var lang = this._lang || 'zh_CN';
  var params = {
    openId: openId,
    lang: lang
  };
  this._oauth.getUser(params, function(err, result) {
    if (err) return self.error(err);
    this._verify(result, verified);
  });
};


WechatPublicStrategy.prototype.authorizationParams = function(options) {
  return {};
};


WechatPublicStrategy.prototype.tokenParams = function(options) {
  return {};
};


module.exports = WechatPublicStrategy;
