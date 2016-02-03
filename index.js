var through = require('through');
var through2 = require('through2');
var patelPlex = require('patel');
var Stream = require('stream');

function isPTL (file) {
	return /\.(patel|ptl)$/.test(file);
}

function compile(filename, source, options, callback) {
	patelPlex.compile(source, {from: {'file': filename}}, function(err, result){
		if(err) {
			var buf = ''
			var t = through(function write(data){ buf += data.toString() }, function end(){
				return callback(new Error(buf))
			});
			patelPlex.reportError(err, t);
			t.end();
		} else if(result) {
			callback(null, result.code + "\n")
		} else {
			callback(null, null)
		}
	})
}

function patelify(filename, options) {
	if (!isPTL(filename)) return through2();

	if (typeof options === 'undefined' || options === null) options = {};

	var compileOptions = {
		sourceMap: (options._flags && options._flags.debug),
		bare: true,
		header: false
	};

	for (var i = 0, keys = Object.keys(compileOptions); i < keys.length; i++) {
		var key = keys[i], option = options[key];
		if (typeof option !== 'undefined' && option !== null) {
			if (option === 'false' || option === 'no' || option === '0') {
				option = false;
			}
			compileOptions[key] = !!option;
		}
	}

	var chunks = [];
	function transform(chunk, encoding, callback) {
		chunks.push(chunk);
		callback();
	}

	function flush(callback) {
		var stream = this;
		var source = Buffer.concat(chunks).toString();
		compile(filename, source, compileOptions, function(error, result) {
			if (!error) stream.push(result);
			callback(error);
		});
	}

	return through2(transform, flush);
}

module.exports = patelify