
var chai = require('chai');
chai.use(require('chai-passport-strategy'));
var expect = chai.expect;
var WechatStrategy = require('../lib/strategy');


describe('Strategy', function() {

  var strategy = new WechatStrategy({
      appId: 'ABC123',
      appSecret: 'secret'
    },
    function() {});

  it('should be named wechat-public', function() {
    expect(strategy.name).to.equal('wechat-public');
  });

  describe('handling a return request in which authorization was denied by user', function() {
    var info;
    before(function(done) {
      chai.passport.use(strategy)
        .fail(function(i) {
          info = i;
          done();
        })
        .req(function(req) {
          req.query = {};
          req.query.state = 'state';
        })
        .authenticate();
    });

    it('should fail with info', function() {
      expect(info).to.not.be.undefined;
      expect(info.message).to.equal('access_denied');
    });
  });
});