var chai = require( 'chai' )
chai.use( require( 'chai-passport-strategy' ) )
var expect = chai.expect
var WechatStrategy = require( '../lib/strategy' )


describe( 'Strategy', function() {

  describe( 'constructor', function() {
    var strategy = new WechatStrategy( {
        appId: 'ABC123',
        appSecret: 'secret'
      },
      function() {} )

    it( 'should be named wechat-public', function() {
      expect( strategy.name ).to.equal( 'wechat-public' )
    } )
  } )


  describe( 'constructed with undefined options', function() {
    it( 'should throw', function() {
      expect( function() {
        var strategy = new WechatStrategy( undefined, function() {} )
      } ).to.throw( Error )
    } )
  } )

  describe( 'authorization request with authorization parameters', function() {
    var strategy = new WechatStrategy( {
      appId: 'ABC123',
      appSecret: 'secret'
    }, () => {} )

    var url

    before( function( done ) {
      chai.passport.use( strategy )
        .redirect( function( u ) {
          url = u
          done()
        } )
        .req( function( req ) {} )
        .authenticate()
    } )

    it( 'should be redirected', function() {
      expect( url ).to.equal( 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=ABC123&redirect_uri=&response_type=code&scope=snsapi_base&state=state#wechat_redirect' )
    } )
  } )

  describe( 'handling a return request in which authorization was denied by user', function() {
    var info
    var strategy = new WechatStrategy( {
      appId: 'ABC123',
      appSecret: 'secret'
    }, () => {} )
    before( function( done ) {
      chai.passport.use( strategy )
        .fail( function( i ) {
          info = i
          done()
        } )
        .req( function( req ) {
          req.query = {}
          req.query.state = 'state'
          req.query.state = 'authdeny'
        } )
        .authenticate()
    } )

    it( 'should fail with info', function() {
      expect( info ).to.not.be.undefined
      expect( info.message ).to.equal( 'access_denied' )
    } )
  } )

  describe( 'error caused by invalid code sent to token endpoint', function() {
    var strategy = new WechatStrategy( {
      appId: 'ABC123',
      appSecret: 'secret'
    }, function() {} )

    // inject a "mock" oauth2 instance
    strategy._oauth.getAccessToken = function( code, callback ) {
      return callback( {
        "errcode": 40029,
        "errmsg": "invalid code"
      } )
    }


    var err

    before( function( done ) {
      chai.passport.use( strategy )
        .error( function( e ) {
          err = e
          done()
        } )
        .req( function( req ) {
          req.query = {}
          req.query.code = 'SplxlOBeZQQYbYS6WxSbIA+ALT1'
        } )
        .authenticate()
    } )

    it( 'should error', function() {
      expect( err.errcode ).to.equal( 40029 )
      expect( err.errmsg ).to.equal( 'invalid code' )
    } )
  } )

  describe( 'fetch profile', () => {
    const getAccessToken = ( code, callback ) => {
      const accessToken = {
        "access_token": "ACCESS_TOKEN",
        "expires_in": 7200,
        "refresh_token": "REFRESH_TOKEN",
        "openid": "OPENID",
        "scope": "snsapi_base"
      }
      if ( code === 'base' ) {
        callback( null, {
          data: accessToken
        } )
      } else if ( code === 'userinfo' ) {
        accessToken.scope = 'snsapi_userinfo'
        callback( null, {
          data: accessToken
        } )
      } else {
        accessToken.openid = 'invalid_openid'
        accessToken.scope = 'snsapi_userinfo'
        callback( null, {
          data: accessToken
        } )
      }
    }

    const getUser = ( options, callback ) => {
      if ( options.openid === 'invalid_openid' ) {
        callback( {
          "errcode": 40003,
          "errmsg": "invalid openid"
        } )
      } else {
        const profile = {
          "openid": "openid",
          "nickname": 'NICKNAME',
          "sex": "1",
          "province": "PROVINCE",
          "city": "CITY",
          "country": "COUNTRY",
          "headimgurl": "http://wx.qlogo.cn/mmopen/g3MonUZtNHkdmzicIlibx6iaFqAc56vxLSUfpb6n5WKSYVY0ChQKkiaJSgQ1dZuTOgvLLrhJbERQQ4eMsv84eavHiaiceqxibJxCfHe/46",
          "privilege": [
            "PRIVILEGE1",
            "PRIVILEGE2"
          ]
        }
        callback( null, profile )
      }
    }

    it( 'should fetch basic info if scope is snsapi_base', function( done ) {
      const strategy = new WechatStrategy( {
        appId: 'ABC123',
        appSecret: 'secret'
      }, ( accessToken, refreshToken, profile, next ) => {
        expect( profile.id ).to.equal( 'OPENID' )
        expect( profile.openid ).to.equal( 'OPENID' )
        done()
      } )
      strategy._oauth.getAccessToken = getAccessToken
      strategy._oauth.getUser = getUser

      chai.passport.use( strategy )
        .req( function( req ) {
          req.query = {}
          req.query.code = 'base'
        } )
        .authenticate()
    } )

    it( 'should fetch user info if scope is snsapi_userinfo', function( done ) {
      const strategy = new WechatStrategy( {
        appId: 'ABC123',
        appSecret: 'secret'
      }, ( accessToken, refreshToken, profile, next ) => {
        expect( profile.id ).to.equal( 'openid' )
        expect( profile.openid ).to.equal( 'openid' )
        expect( profile.nickname ).to.equal( 'NICKNAME' )
        done()
      } )
      strategy._oauth.getAccessToken = getAccessToken
      strategy._oauth.getUser = getUser

      chai.passport.use( strategy )
        .req( function( req ) {
          req.query = {}
          req.query.code = 'userinfo'
        } )
        .authenticate()
    } )

    it( 'should throw error when openid is invalid', function( done ) {
      const strategy = new WechatStrategy( {
        appId: 'ABC123',
        appSecret: 'secret'
      }, () => {} )
      strategy._oauth.getAccessToken = getAccessToken
      strategy._oauth.getUser = getUser

      chai.passport.use( strategy )
        .error( ( err ) => {
          expect( err.errcode ).to.equal( 40003 )
          expect( err.errmsg ).to.equal( 'invalid openid' )
          done()
        } )
        .req( function( req ) {
          req.query = {}
          req.query.code = 'invalid_openid'
        } )
        .authenticate()
    } )

  } )
} )
