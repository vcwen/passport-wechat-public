[![npm version](https://badge.fury.io/js/passport-wechat-public.svg)](https://badge.fury.io/js/passport-wechat-public)
[![Dependencies Status](https://david-dm.org/wenwei1202/passport-wechat-public.svg)](https://david-dm.org/wenwei1202/passport-wechat-public)
[![Build Status](https://travis-ci.org/wenwei1202/passport-wechat-public.svg?branch=master)](https://travis-ci.org/wenwei1202/passport-wechat-public)
[![Coverage Status](https://coveralls.io/repos/github/wenwei1202/passport-wechat-public/badge.svg?branch=master)](https://coveralls.io/github/wenwei1202/passport-wechat-public?branch=master)
[![Code Climate](https://codeclimate.com/github/wenwei1202/passport-wechat-public/badges/gpa.svg)](https://codeclimate.com/github/wenwei1202/passport-wechat-public)

# passport-wechat-public
[Passport](http://passportjs.org/) strategy for authenticating with [Wechat Official Accounts](https://mp.weixin.qq.com/)


[Documents (English)](https://github.com/wenwei1202/passport-wechat-public/blob/master/README.en.md)



Passport的微信公众号OAuth2.0用户验证模块。支持的框架有Express,Strongloop/Loopback,支持Loopback-Component-Passport.
(网页登录可以支持，但是没有测试过，因为没有相应的网站应用，微信也没有给相应的可以测试的测试号。但是功能比较一致，只是改变了authURL，所以加了，正式使用的话慎重测试)

微信企业号, 转至[passport-wechat-enterprise](https://github.com/wenwei1202/passport-wechat-enterprise)

另外之前看到Langyali的[passport-wechat](https://github.com/liangyali/passport-wechat)，当时以为不支持loopback-compoment-passport,而且当时很久没更新，所以自己写了，后来发现是我弄错了，其实是支持的，现在Passport-wechat已经更新v2.0，若需要可以参考.

## Install

    $ npm install passport-wechat-public

## Usage

#### Configure Strategy

在Passport注册WechatPublicStrategy, Passport.use()的第一个参数是name，可以忽略使用默认的名字’wechat-public'。WechatPublicStrategy的构造函数的参数是options和verify。
options的appId，appSecret和callbackURL是必须的，其他为可选。verify函数是验证或创建用户传给done函数



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

`getToken` 和 `saveToken` 用于保存从微信服务器获得的用户的access token, 以免重复请求token，token的有效时间为2小时，如果忽略此方法，在production环境下console中会显示'**Please dont save oauth token into memory under production**'

#### Authenticate Requests

用`passport.authenticate()`在对应的route下，注意strategy名字和passport.use()时一致。

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


[Loopback-Component-Passport](https://github.com/strongloop/loopback-component-passport)  [官方文档](https://docs.strongloop.com/pages/releaseview.action?pageId=3836277)

在`providers.json`加入wechat provider即可，profile的id就是openid

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
- `providers.json` 不能直接写方法，需要在`configureProvider` 时将`getAccessToken ` 和 `saveAccessToken ` 加入options中

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





