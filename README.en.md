[![npm version](https://badge.fury.io/js/passport-wechat-public.svg)](https://badge.fury.io/js/passport-wechat-public)
[![Dependencies Status](https://david-dm.org/wenwei1202/passport-wechat-public.svg)](https://david-dm.org/wenwei1202/passport-wechat-public)
[![Build Status](https://travis-ci.org/wenwei1202/passport-wechat-public.svg?branch=master)](https://travis-ci.org/wenwei1202/passport-wechat-public)
[![Coverage Status](https://coveralls.io/repos/github/wenwei1202/passport-wechat-public/badge.svg?branch=master)](https://coveralls.io/github/wenwei1202/passport-wechat-public?branch=master)
[![Code Climate](https://codeclimate.com/github/wenwei1202/passport-wechat-public/badges/gpa.svg)](https://codeclimate.com/github/wenwei1202/passport-wechat-public)

# passport-wechat-public
[Passport](http://passportjs.org/) strategy for authenticating with [Wechat Official Accounts](https://mp.weixin.qq.com/)
using the OAuth 2.0 API.

[中文文档](https://github.com/wenwei1202/passport-wechat-public/blob/master/README.md)

Wechat Enterprise Accounts version, see [passport-wechat-enterprise](https://github.com/wenwei1202/passport-wechat-enterprise)

Wechat Documents: [Official Accounts](http://mp.weixin.qq.com/wiki/17/c0f37d5704f0b64713d5d2c37b468d75.html), [Website login](https://open.weixin.qq.com/cgi-bin/showdocument?action=dir_list&t=resource/res_list&verify=1&id=open1419316505&token=&lang=zh_CN)

This module lets you authenticate using Wechat in your Node.js applications.
By plugging into Passport, Wechat authentication can be easily and
unobtrusively integrated into any application or framework that supports
[Connect](http://www.senchalabs.org/connect/)-style middleware, including
[Express](http://expressjs.com/),[Loopback-Component-Passport](https://github.com/strongloop/loopback-component-passport).



## Install

    $ npm install passport-wechat-public

## Usage

#### Configure Strategy

The Wechat authentication strategy authenticates users using a Wechat
account and OAuth 2.0 tokens.  The strategy requires a `verify` callback, which
accepts these credentials and calls `done` providing a user, as well as
`options` specifying an app ID, app secret, callback URL, and optionally state, scope, agent(**NOTICE:By default , agent is 'wechat', website login is also supported, but not tested yet, so be caustious**).


```
passport.use("wechat",new WechatPublicStrategy({
    appId: APP_ID,
    appSecret: APP_SECRET,
    callbackURL: "http://localhost:3000/auth/wechat/callback",
    state: "state",
    scope: "snsapi_base",
    agent: "wechat",
    getToken: function(openid, cb) {...cb(null, accessToken)}
    saveToken: function (openid, token, cb) {... /*save to db*/ cb(null)}
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({ openId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));
```

`getToken` and `saveToken` is used to persist and fetch the accessToken of the wechat user, the token will be valid in 2 hrs. If you ignore these two functions, you will see a warning '**Please dont save oauth token into memory under production**' in the console

#### Authenticate Requests

Use `passport.authenticate()`, specifying the strategy with the name `'wechat' or default name 'wechat-public'`, to
authenticate requests.


For example

```
app.get('/auth/wechat',
  passport.authenticate('wechat'));

app.get('/auth/wechat/callback',
  passport.authenticate('wechat', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });
```


#### Loopback-Component-Passport
Simple add the a wechat provider into your `providers.json` file. **AuthScheme is required**,tell the framework using OAuth 2.0. **Notice:profile.id will be same with openid.**


Please see Strongloop [official documents](https://docs.strongloop.com/pages/releaseview.action?pageId=3836277) for more info about [Loopback-Component-Passport](https://github.com/strongloop/loopback-component-passport).

```
{
  "wechat": {
    "provider": "wechat",
    "module": "passport-wechat-public",
    "callbackURL": "/auth/wechat/callback",
    "successRedirect": "/auth/wechat/account",
    "failureRedirect": "/auth/wechat/failure",
    "scope": ["snsapi_userinfo"],
    "appId": "wxabe757c89bb6d74b",
    "appSecret": "9a62bc24a31d5c7c2b1d053515d276f8"
  }
}
```

- Since in loopback-component-passport, you won't initialize the Strategy on your own, do the trick, put the `getAccessToken ` and `saveAccessToken ` into the options which will be passed to Strategy constructor.


```
function getAccessToken(cb) {...};
function saveAccessToken(accessToken, cb){...};
for (var s in config) {
    var c = config[s];
    c.session = c.session !== false;
    if(s === 'wechat') {
      c.getToken = getAccessToken;
      c.saveToken = saveAccessToken;
    }
    passportConfigurator.configureProvider(s, c);
  }
```
