"use strict";

const RawValue = require('./RawValue.js');
const RefValue = require('./RefValue.js');
const Range = require('./Range.js');

var exp_id = 0;

module.exports = function Exp(formula) {
    var self = this;
    self.id = ++exp_id;
    self.args = [];
    self.name = 'Expression';
    self.update_cell_value = update_cell_value;
    
    function update_cell_value() {
        try {
            formula.cell.v = self.calc();
            if (typeof(formula.cell.v) === 'string') {
                formula.cell.t = 's';
            }
            else if (typeof(formula.cell.v) === 'number') {
                formula.cell.t = 'n';
            }
        }
        catch (e) {
            if (e.message == '#N/A') {
                formula.cell.v = 42;
                formula.cell.t = 'e';
                formula.cell.w = e.message;
            }
            else {
                throw e;
            }
        }
        finally {
            formula.status = 'done';
        }
    }
    
    function exec(op, args, fn) {
        for (var i = 0; i < args.length; i++) {
            if (args[i] === op) {
                try {
                    var r = fn(args[i - 1].calc(), args[i + 1].calc());
                    args.splice(i - 1, 3, new RawValue(r));
                    i--;
                }
                catch (e) {
                    throw Error(formula.name + ': evaluating ' + formula.cell.f + '\n' + e.message);
                    //throw e;
                }
            }
        }
    }

    function exec_minus(args) {
        for (var i = args.length; i--;) {
            if (args[i] === '-') {
                var r = -args[i + 1].calc();
                if (typeof args[i - 1] !== 'string' && i > 0) {
                    args.splice(i, 1, '+');
                    args.splice(i + 1, 1, new RawValue(r));
                }
                else {
                    args.splice(i, 2, new RawValue(r));
                }
            }
        }
    }

    self.calc = function() {
        let args = self.args.concat();
        exec_minus(args);
        exec('^', args, function(a, b) {
            return Math.pow(+a, +b);
        });
        exec('*', args, function(a, b) {
            return (+a) * (+b);
        });
        exec('/', args, function(a, b) {
            return (+a) / (+b);
        });
        exec('+', args, function(a, b) {
            return (+a) + (+b);
        });
        exec('&', args, function(a, b) {
            return '' + a + b;
        });
        exec('<', args, function(a, b) {
            return a < b;
        });
        exec('>', args, function(a, b) {
            return a > b;
        });
        exec('>=', args, function(a, b) {
            return a >= b;
        });
        exec('<=', args, function(a, b) {
            return a <= b;
        });
        exec('<>', args, function(a, b) {
            return a != b;
        });
        exec('=', args, function(a, b) {
            return a == b;
        });
        if (args.length == 1) {
            if (typeof(args[0].calc) != 'function') {
                return args[0];
            }
            else {
                return args[0].calc();
            }
        }
    };

    var last_arg;
    self.push = function(buffer) {
        if (buffer) {
            var v;
            if (!isNaN(buffer)) {
                v = new RawValue(+buffer);
            }
            else if (typeof buffer === 'string' && buffer.trim().replace(/\$/g, '').match(/^[A-Z]+[0-9]+:[A-Z]+[0-9]+$/)) {
                v = new Range(buffer.trim().replace(/\$/g, ''), formula);
            }
            else if (typeof buffer === 'string' && buffer.trim().replace(/\$/g, '').match(/^[^!]+![A-Z]+[0-9]+:[A-Z]+[0-9]+$/)) {
                v = new Range(buffer.trim().replace(/\$/g, ''), formula);
            }
            else if (typeof buffer === 'string' && buffer.trim().replace(/\$/g, '').match(/^[A-Z]+:[A-Z]+$/)) {
                v = new Range(buffer.trim().replace(/\$/g, ''), formula);
            }
            else if (typeof buffer === 'string' && buffer.trim().replace(/\$/g, '').match(/^[^!]+![A-Z]+:[A-Z]+$/)) {
                v = new Range(buffer.trim().replace(/\$/g, ''), formula);
            }
            else if (typeof buffer === 'string' && buffer.trim().replace(/\$/g, '').match(/^[A-Z]+[0-9]+$/)) {
                v = new RefValue(buffer.trim().replace(/\$/g, ''), formula);
            }
            else if (typeof buffer === 'string' && buffer.trim().replace(/\$/g, '').match(/^[^!]+![A-Z]+[0-9]+$/)) {
                v = new RefValue(buffer.trim().replace(/\$/g, ''), formula);
            }
            else if (typeof buffer === 'string' && !isNaN(buffer.trim().replace(/%$/, ''))) {
                v = new RawValue(+(buffer.trim().replace(/%$/, '')) / 100.0);
            }
            else {
                v = buffer;
            }
            if (((v === '=') && (last_arg == '>' || last_arg == '<')) || (last_arg == '<' && v === '>')) {
                self.args[self.args.length - 1] += v;
            }
            else {
                self.args.push(v);
            }
            last_arg = v;
            //console.log(self.id, '-->', v);
        }
    };
};