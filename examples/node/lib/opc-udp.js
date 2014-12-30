/*
 * Simple Open Pixel Control client for Node.js
 *
 * 2013-2014 Micah Elizabeth Scott
 * This file is released into the public domain.
 *
 * Modifications by Yona Appletree for UDP and multiple channel support.
 * His changes are also released into the public domain.
 */

var Q = require('q');
var dgram = require('dgram');
var fs = require('fs');

/********************************************************************************
 * Core OPC Client
 */

var OpcUdpClient = function(host, port)
{
	this.host = host;
	this.port = port;
	this.pixelBuffer = null;
	this.channelCmdBuffer = null;

	this.stripCount = null;
	this.pixelsPerStrip = null;

	this.dgramClient = dgram.createSocket("udp4");

	this.setPixelCount(48, 64);
};

Object.defineProperty(OpcUdpClient.prototype, "pixelCount", {
	enumerable: true,
	configurable: true,
	get: function(){
		return this.stripCount * this.pixelsPerStrip;
	}
});

OpcUdpClient.prototype._send = function(bytes, count)
{
	var _this = this;

	return Q.nbind(this.dgramClient.send, this.dgramClient)(
		bytes,
		0,
		count || bytes.length,
		this.port,
		this.host
	);
};

OpcUdpClient.prototype.sendAllDataOnChannel0 = function()
{
	this.pixelBuffer.writeUInt16BE(this.stripCount*this.pixelsPerStrip*3, 2);  // Length
	return this._send(this.pixelBuffer);
};

OpcUdpClient.prototype.sendChannel = function(channelIndex)
{
	// Channel (1-based)
	this.channelCmdBuffer.writeUInt8(channelIndex+1, 0);
	// Command
	this.channelCmdBuffer.writeUInt8(0, 1);
	// Length
	this.channelCmdBuffer.writeUInt16BE(this.pixelsPerStrip * 3, 2);

	this.pixelBuffer.copy(this.channelCmdBuffer, 4, 4 + channelIndex*this.pixelsPerStrip*3, 4 + (channelIndex+1)*this.pixelsPerStrip*3-1);

	return this._send(this.channelCmdBuffer);
};

OpcUdpClient.prototype.sendSyncCh0 = function(channelIndex)
{
	this.pixelBuffer.writeUInt16BE(0, 2);  // Length
	return this._send(this.pixelBuffer, 4);
};

OpcUdpClient.prototype.sendAllChannels = function(disableSync) {
	var _this = this;
	var promiseChain = this.sendChannel(0);

	for (var i=1; i<this.stripCount; i++) {
		(function(boundI){
			promiseChain = promiseChain.then(function() {
				return _this.sendChannel(boundI);
			});
		})(i);
	}

	if (! disableSync) {
		promiseChain = promiseChain.then(function(){
			return _this.sendSyncCh0();
		});
	}

	return promiseChain;
};

OpcUdpClient.prototype.setPixelCount = function(strips, pixelsPerStrip)
{
	this.stripCount = strips;
	this.pixelsPerStrip = pixelsPerStrip;

	var newBufferLength = 4 + strips*pixelsPerStrip*3;
	if (this.pixelBuffer == null || this.pixelBuffer.length != newBufferLength) {
		this.pixelBuffer = new Buffer(newBufferLength);
	}

	var newChannelBufferLength = 4 + strips*pixelsPerStrip*3;
	if (this.channelCmdBuffer == null || this.channelCmdBuffer.length != newChannelBufferLength) {
		this.channelCmdBuffer = new Buffer(newChannelBufferLength);
	}

	// Initialize OPC header
	this.pixelBuffer.writeUInt8(0, 0);           // Channel
	this.pixelBuffer.writeUInt8(0, 1);           // Command
	this.pixelBuffer.writeUInt16BE(strips*pixelsPerStrip*3, 2);  // Length
};

OpcUdpClient.prototype.setPixel = function(num, r, g, b)
{
	var offset = 4 + num*3;
	if (this.pixelBuffer == null) {
		throw new Error("Pixel buffer not initialized");
	} else if (offset + 3 > this.pixelBuffer.length) {
		throw new Error("Pixel out of bounds: " + num + " >= " + this.pixelCount);
	}

	this.pixelBuffer.writeUInt8(Math.max(0, Math.min(255, r | 0)), offset);
	this.pixelBuffer.writeUInt8(Math.max(0, Math.min(255, g | 0)), offset + 1);
	this.pixelBuffer.writeUInt8(Math.max(0, Math.min(255, b | 0)), offset + 2);
};

OpcUdpClient.prototype.setPixelHsb = function(num, h, s, b) {
	var rgb = OpcUdpClient.hsv(h, s, b);
	this.setPixel(num, rgb[0], rgb[1], rgb[2]);
};

OpcUdpClient.prototype.mapPixels = function(fn, model)
{
	// Set all pixels, by mapping each element of "model" through "fn" and setting the
	// corresponding pixel value. The function returns a tuple of three 8-bit RGB values.
	// Implies 'writePixels' as well. Has no effect if the OPC client is disconnected.

	this.setPixelCount(model.length);
	var offset = 4;
	var unused = [0, 0, 0];     // Color for unused channels (null model)

	for (var i = 0; i < model.length; i++) {
		var led = model[i];
		var rgb = led ? fn(led) : unused;

		this.pixelBuffer.writeUInt8(Math.max(0, Math.min(255, rgb[0] | 0)), offset);
		this.pixelBuffer.writeUInt8(Math.max(0, Math.min(255, rgb[1] | 0)), offset + 1);
		this.pixelBuffer.writeUInt8(Math.max(0, Math.min(255, rgb[2] | 0)), offset + 2);
		offset += 3;
	}

	this.writePixels();
};


/********************************************************************************
 * Client convenience methods
 */

OpcUdpClient.prototype.mapParticles = function(particles, model)
{
	// Set all pixels, by mapping a particle system to each element of "model".
	// The particles include parameters 'point', 'intensity', 'falloff', and 'color'.

	function shader(p) {
		var r = 0;
		var g = 0;
		var b = 0;

		for (var i = 0; i < particles.length; i++) {
			var particle = particles[i];

			// Particle to sample distance
			var dx = (p.point[0] - particle.point[0]) || 0;
			var dy = (p.point[1] - particle.point[1]) || 0;
			var dz = (p.point[2] - particle.point[2]) || 0;
			var dist2 = dx * dx + dy * dy + dz * dz;

			// Particle edge falloff
			var intensity = particle.intensity / (1 + particle.falloff * dist2);

			// Intensity scaling
			r += particle.color[0] * intensity;
			g += particle.color[1] * intensity;
			b += particle.color[2] * intensity;
		}

		return [r, g, b];
	}

	this.mapPixels(shader, model);
};


/********************************************************************************
 * Global convenience methods
 */

OpcUdpClient.loadModel = function(filename)
{
	// Synchronously load a JSON model from a file on disk
	return JSON.parse(fs.readFileSync(filename))
};

OpcUdpClient.hsv = function(h, s, v)
{
	/*
	 * Converts an HSV color value to RGB.
	 *
	 * Normal hsv range is in [0, 1], RGB range is [0, 255].
	 * Colors may extend outside these bounds. Hue values will wrap.
	 *
	 * Based on tinycolor:
	 * https://github.com/bgrins/TinyColor/blob/master/tinycolor.js
	 * 2013-08-10, Brian Grinstead, MIT License
	 */

	h = (h % 1) * 6;
	if (h < 0) h += 6;

	s = (s < 0) ? 0 : ((s > 1) ? 1 : s);
	v = (v < 0) ? 0 : ((v > 1) ? 1 : v);

	var i = h | 0,
		f = h - i,
		p = v * (1 - s),
		q = v * (1 - f * s),
		t = v * (1 - (1 - f) * s),
		r = [v, q, p, p, t, v][i],
		g = [t, v, v, q, p, p][i],
		b = [p, p, t, v, v, q][i];

	return [ r * 255, g * 255, b * 255 ];
};


module.exports = OpcUdpClient;