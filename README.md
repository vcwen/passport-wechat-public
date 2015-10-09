# passport-wechat-public
[Passport](http://passportjs.org/) strategy for authenticating with [Wechat Official Accounts](https://mp.weixin.qq.com/)
using the OAuth 2.0 API.**NOTICE:Website login is also enabled but not tested yet.**

Wechat Enterprise Accounts version, see [passport-wechat-enterprise](https://github.com/wenwei1202/passport-wechat-enterprise)

Wechat Documents: [Official Accounts](http://mp.weixin.qq.com/wiki/17/c0f37d5704f0b64713d5d2c37b468d75.html), [Website login](https://open.weixin.qq.com/cgi-bin/showdocument?action=dir_list&t=resource/res_list&verify=1&id=open1419316505&token=&lang=zh_CN)

This module lets you authenticate using Wechat in your Node.js applications.
By plugging into Passport, Wechat authentication can be easily and
unobtrusively integrated into any application or framework that supports
[Connect](http://www.senchalabs.org/connect/)-style middleware, including
[Express](http://expressjs.com/). It also supports [Loopback-Component-Passport](https://github.com/strongloop/loopback-component-passport).

Passport的微信公众号OAuth2.0用户验证模块(网页登录可以支持，但是没有测试过，因为没有相应的网站应用，微信也没有给相应的可以测试的测试号。但是功能比较一致，只是改变了authURL，所以加了，正式使用的话慎重测试)。支持的框架有Express,Strongloop/Loopback,支持Loopback-Component-Passport.

微信企业号, 转至[passport-wechat-enterprise](https://github.com/wenwei1202/passport-wechat-enterprise)

另外之前看到Langyali的[passport-wechat](https://github.com/liangyali/passport-wechat)，当时以为不支持loopback-compoment-passport,而且当时很久没更新，所以自己写了，后来发现是我弄错了，其实是支持的，现在Passport-wechat已经更新v2.0，若需要可以参考.

## Install

    $ npm install passport-wechat-public

## Usage

#### Configure Strategy

The Wechat authentication strategy authenticates users using a Wechat
account and OAuth 2.0 tokens.  The strategy requires a `verify` callback, which
accepts these credentials and calls `done` providing a user, as well as
`options` specifying an app ID, app secret, callback URL, and optionally state, scope, agent(**NOTICE:By default , agent is 'wechat', website login is also supported, but not tested yet, so be caustious**).

在Passport注册WechatPublicStrategy, Passport.use()的第一个参数是name，可以忽略使用默认的名字’wechat-public'。WechatPublicStrategy的构造函数的参数是options和verify。
options的appId，appSecret和callbackURL是必须的，其他为可选。verify函数是验证或创建用户传给done函数



```
passport.use("wechat",new WechatPublicStrategy({
    appId: APP_ID,
    appSecret: APP_SECRET,
    callbackURL: "http://localhost:3000/auth/wechat/callback",
    state: "state",
    scope: "snsapi_base",
    agent: "wechat"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({ openId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));
```

#### Authenticate Requests

Use `passport.authenticate()`, specifying the strategy with the name `'wechat' or default name 'wechat-public'`, to
authenticate requests.

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
Simple add the a wechat provider into your `providers.json` file. **AuthScheme is required**,tell the framework using OAuth 2.0. **Notice:profile.id will be same with openid.**


Please see Strongloop [official documents](https://docs.strongloop.com/pages/releaseview.action?pageId=3836277) for more info about [Loopback-Component-Passport](https://github.com/strongloop/loopback-component-passport).

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
    "appSecret": "9a62bc24a31d5c7c2b1d053515d276f8",
    "agent": "wechat",
    "authScheme": "OAuth 2.0"/*required*/
  }
}
```






