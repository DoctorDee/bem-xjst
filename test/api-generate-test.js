var assert = require('assert');
var bemhtml = require('../').bemhtml;
var vm = require('vm');
var EOL = require('os').EOL;
var vow = require('vow');
/* jscs:disable */
// fake commonJS module after browserify
var FAKE_COMMON_MODULE = 'var require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module \'"+o+"\'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"fake":[function(require,module,exports){ module.exports = { getText: function () { return "Hello templates!"; } }; },{}]},{},[]);';
/* jscs:enable */
var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

describe('API generate', function() {
  it('should work', function() {
    var bundle = bemhtml.generate();
    assert.equal(typeof bundle, 'string');
  });

  describe('options', function() {
    it('xhtml', function() {
      var bundle = bemhtml.generate('', { xhtml: true });
      assert.equal(typeof bundle, 'string');
    });

    it('exportName', function() {
      var CUSTOM_NAME = 'test';
      var bundle = bemhtml.generate('', { exportName: CUSTOM_NAME });
      var sandbox = {};
      vm.runInNewContext(bundle, sandbox);
      assert.equal(typeof sandbox[CUSTOM_NAME], 'object');
    });

    describe('requires option', function() {
      describe('global deps', function() {
        it('should get dependencies from global scope (Node.js for example)',
          function() {
          var TEXT = 'Hello templates!';
          var code = 'global.text = "' + TEXT + '";';
          var bundle = bemhtml.generate('', {
            requires: { text: { globals: 'text' } }
          });
          var sandbox = { global: {}, exports: {} };
          sandbox.module = { exports: sandbox.exports };

          vm.runInNewContext(code + EOL + bundle, sandbox);

          var result = sandbox.exports.bemhtml.compile(function() {
            block('b').def()(function() {
              return this.require('text');
            });
          }).apply({ block: 'b' });

          assert.equal(result, TEXT);
        });

        it('should get dependencies from window scope (any browser)',
          function() {
          var TEXT = 'Hello templates!';
          var code = 'window.text = "' + TEXT + '";';
          var bundle = bemhtml.generate('', {
            requires: { textModule: { globals: 'text' } }
          });
          var sandbox = { window: {} };

          vm.runInNewContext(code + EOL + bundle, sandbox);

          var result = sandbox.bemhtml.compile(function() {
            block('b').def()(function() {
              return this.require('textModule');
            });
          }).apply({ block: 'b' });

          assert.equal(result, TEXT);
        });
      });

      describe('global deps over YModule', function() {
        it('must get dependency from global scope ' +
          'if it also is presented in YModule', function() {
          var TEXT = 'Hello templates!';
          var fakeModule = 'modules.define(' +
            '"fakeModule", [], function(provide) {' +
            'provide("' + TEXT + '");});';
          var bundle = bemhtml.generate(function() {
            block('b').def()(function() {
              return this.require('fakeReq').getText();
            });
          }, {
            requires: { fakeReq: { globals: 'fakeVar', ym: 'fakeModule' } }
          });
          var sandbox = {
            global: {},
            exports: {},
            window: {},
            modules: require('ym')
          };
          sandbox.module = { exports: sandbox.exports };

          vm.runInNewContext(
            'window.fakeVar = { getText: function() { return "globals"; } };' +
            EOL +
            fakeModule +
            EOL +
            bundle, sandbox);

          assert.equal(sandbox.exports.bemhtml.apply({ block: 'b' }),
                       'globals');
        });
      });

      describe('global deps over CommonJS', function() {
        it('must get dependency from global scope ' +
          'if it also is presented in CommonJS', function() {
          var bundle = bemhtml.generate('', {
            commonJSModules: FAKE_COMMON_MODULE,
            requires: { fakeReq: { globals: 'fakeVar', commonJS: 'no-module' } }
          });

          var sandbox = { global: {}, exports: {}, window: {} };
          sandbox.module = { exports: sandbox.exports };

          vm.runInNewContext(
            'window.fakeVar = { getText: function() { return "globals"; } };' +
            EOL +
            bundle, sandbox);

          assert.equal(
            sandbox.exports.bemhtml.libs.fakeReq.getText(), 'globals'
          );
        });

        it('as commonjs', function() {
          var bundle = bemhtml.generate('', {
            commonJSModules: FAKE_COMMON_MODULE,
            requires: { fakeReq: { globals: 'fake', commonJS: 'no-module' } }
          });
          var module = { exports: {} };
          var sandbox = {
            global: {},
            module: module,
            exports: module.exports
          };
          vm.runInNewContext(bundle, sandbox);
          assert.deepEqual(sandbox.global, {},
                           'Should not export to global in CommonJS context.');
          assert.equal(typeof module.exports.bemhtml.apply, 'function');
        });
      });

      describe('CommonJS deps', function() {
        it('should get module from CommonJS', function() {
          var TEXT = 'Hello templates!';
          var bundle = bemhtml.generate('', {
            commonJSModules: FAKE_COMMON_MODULE,
            requires: { fakeReq: { commonJS: 'fake' } }
          });

          var sandbox = { global: {}, exports: {} };
          sandbox.module = { exports: sandbox.exports };
          vm.runInNewContext(bundle, sandbox);

          assert.equal(sandbox.exports.bemhtml.libs.fakeReq.getText(), TEXT);
          assert.deepEqual(sandbox.global, {},
                           'Should not export to global in CommonJS context.');
        });
      });

      describe('YModules deps', function() {
        it('must get dependency from ym', function() {
          var TEXT = 'Hello templates!';
          var fakeModule = 'modules.define("text", [], function(provide) {' +
            'provide("' + TEXT + '");});';
          var bundle = bemhtml.generate(function() {
            block('b').def()(function() { return this.require('text').text; });
          }, {
            requires: { text: { ym: 'text' } }
          });

          var sandbox = {
            modules: require('ym'),
            window: {}
          };

          vm.runInNewContext(fakeModule + EOL + bundle, sandbox);

          var getLibs = function() {
            return new vow.Promise(function(resolve) {
              sandbox.modules.require('bemhtml', function(bemhtml) {
                resolve(bemhtml.libs);
              });
            });
          };

          expect(getLibs().then(function(res) { return res.text; }))
            .to.eventually.equal(TEXT);
        });
      });
    });
  });
});
