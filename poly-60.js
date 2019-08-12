var SCALE = 10; // 9
var WIDTH = 64;
var HEIGHT = 64;
var TIME_STEPS = 60;
var CHANNELS = 7;
var CHANNEL_HEIGHT = 7;
var MIN_BPM = 120;
var MAX_BPM = 360;
var D_BPM = 240;
var TURN_ONOFF_DURATION = 0.5;
assetManager = new AssetManager();
assetManager.downloadQueue = ["bg.png", "power_off.png", "power_on.png"];

/*******************/
/***** Colors ******/
/*******************/
function rgb(c) {
	return "rgb("+c.r+","+c.g+","+c.b+")";
}

function darken(c, f = 0.5) {
	return {r: Math.floor(c.r * f), g: Math.floor(c.g * f), b: Math.floor(c.b * f)};
}

function colorLerp(c1, c2, f) {
	return {r: Math.floor((c1.r + c2.r) * f), g: Math.floor((c1.g + c2.g) * f), b: Math.floor((c1.b + c2.b) * f)};
}

function rgba(c, a = 0.5) {
	return "rgba("+c.r+","+c.g+","+c.b+","+a+")";
}

var c_beatHighlight = "rgba(0,0,0,0.35)";
var c_bmpLED = {r: 255, g: 10, b: 0};
var c_minusPlus = "#abaea3";
var c_minusPlusSide = "#75776f";
var c_levelButton = "#ffffff";
var c_levelButtonSide = "#abaea3";
var c_muteButtonOn = rgb(c_bmpLED);
var c_muteButtonOnSide = rgb(darken(c_bmpLED, 0.7));
var c_muteButtonOff = rgb(darken(c_bmpLED, 0.35));
var c_muteButtonOffSide = rgb(darken(c_bmpLED, 0.2));
var c_stopButtonFront = "#535548";
var c_stopButtonBG = "#191a16";
var c_result = "#FF9C4D";
var c_result2 = "#FFFFFF";
var c_challengeButtonFront = "#66EBFF";
var c_challengeButtonBG = "#249FB3";
var channelColours = [
	{r: 255, g: 51, b: 18}, // red
	{r: 189, g: 20, b: 217}, // purple
	{r: 37, g: 53, b: 240}, // marine blue
	{r: 22, g: 216, b: 217}, // cyan
	{r: 30, g: 250, b: 34}, // green
	{r: 255, g: 161, b: 23}, // orange
	{r: 227, g: 215, b: 16}, // yellow
];

/*******************/
/*** Tonejs init ***/
/*******************/

var transport = Tone.Transport;
var bmp = D_BPM;
transport.bpm.value = bmp;
transport.timeSignature = TIME_STEPS;
transport.loop = true;
transport.setLoopPoints(0,"1m");
transport.scheduleRepeat(transportCallback, "4n");

var channels = [];
var times = [12,10,6,5,4,3,2];
var channelNotes = ["D5","A4","D4","B3","E3","G2","C2"];
var result = [];
var level = [];
for (let i = 0; i < TIME_STEPS; ++i) {
	result.push(0);
	level.push(0);
}

for (let i = 0; i < CHANNELS; ++i) {
	let channel = {
		id: i,
		synth: new Tone.Synth().toMaster(),
		colourIt: i,
		timeShift: 0,
		isOn: false,
		get colour () {
			return channelColours[this.colourIt];
		}
	};
	channels.push(channel);
}

var lastTransportTime = 0;
function transportCallback (time)
{
	transportIt = getCurrentTransportIt();

	result[transportIt] = 0;
	for (let i = 0; i < CHANNELS; ++i) {
		if (channels[i].isOn) {
			if (transportIt % times[i] == channels[i].timeShift) {
				channels[i].synth.triggerAttackRelease(channelNotes[channels[i].colourIt], Tone.Time("4n"), time, 0.7);
				result[transportIt]++;
			}
		}
	}

	lastTransportTime = 0;
}

function getCurrentTransportIt() {
	return parseInt(transport.position.split(':')[1]);
}

function decreaseBPM() {
	setBPM(Math.max(bmp - 20, MIN_BPM));
}
function increaseBPM() {
	setBPM(Math.min(bmp + 20, MAX_BPM));
}

function setBPM(newBPM) {
	if (transport.state != "started" || true) {
		transport.bpm.value = newBPM;
	}
	else {
		transport.bpm.rampTo(newBPM, 0.3);
	}
	//console.log("setting BPM at "+newBPM);
	bmp = newBPM;
}

/*******************/
/***** Buttons *****/
/*******************/

var buttons = [];
var visibleButtonId = 0;
// OnOff
var onOffButton = {
	active: true,
	isOn: false,
	onSprite: "power_on.png",
	offSprite: "power_off.png",

	buttonRect: {
		x: 1, y: 58,
		width: 5, height: 5
	},
	onmousedown: function () {
		this.isOn = !this.isOn;

		if (this.isOn) {
			turnMachineOn();
		}
		else {
			turnMachineOff();
		}
		console.log("Turned machine "+(this.isOn? "ON" : "OFF"));
	},
	draw: function(ctx) {
		ctx.drawImageScaled(assetManager.getAsset(this.isOn? this.onSprite : this.offSprite), this.buttonRect.x, this.buttonRect.y, this.buttonRect.width, this.buttonRect.height);
	}
};
buttons.push(onOffButton); // 0


// stop button
var stopButton = {
	active: false,
	pressed: false,
	justPressed: false,
	vId: visibleButtonId++,

	buttonRect: {
		x: 54, y: 58,
		width: 4, height: 5
	},
	onmousedown: function () {
		if (!this.pressed) {
			this.pressed = true;
			transport.stop();
			this.justPressed = true;
		}
	},
	onmouseup: function () {
		if (this.pressed && !this.justPressed) {
			this.pressed = false;
			transport.start();
		}
		this.justPressed = false;
	},
	draw: function(ctx) {
		if (this.active) {
			if (this.pressed) {
				ctx.fillStyle = c_stopButtonFront;	
				ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y, 4, 4);
							
				let t = Math.floor(Time.time * 2) % 2;
				if (t == 0) ctx.fillStyle = rgb(c_bmpLED);
				else ctx.fillStyle = rgb(darken(c_bmpLED, 0.2));

				ctx.fillRectScaled(this.buttonRect.x + 1, this.buttonRect.y + 1, 2, 2);
			}
			else {
				ctx.fillStyle = c_stopButtonBG;
				ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y, 4, 1);

				ctx.fillStyle = c_stopButtonFront;	
				ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y + 1, 4, 4);

				ctx.fillStyle = rgb(darken(c_bmpLED, 0.2));
				ctx.fillRectScaled(this.buttonRect.x + 1, this.buttonRect.y + 2, 2, 2);

				let t = transportIt % 4;
				let aux = {x: 0, y:0};

				if (t == 1 || t == 2) aux.x = 1;
				if (t == 2 || t == 3) aux.y = 1;
				ctx.fillStyle = rgb(c_bmpLED);
				ctx.fillRectScaled(this.buttonRect.x + 1 + aux.x, this.buttonRect.y + 2 + aux.y, 1, 1);
			}
		}
	}
};
buttons.push(stopButton);
// -
var minusButton = {
	pressed: false,
	active: false,
	vId: visibleButtonId++,

	buttonRect: {
		x: 49, y: 60,
		width: 3, height: 2
	},
	onmousedown: function () {
		this.pressed = true;
		decreaseBPM();
	},
	onmouseup: function() {
		this.pressed = false;
	},
	draw: function(ctx) {
		if(this.active) {
			ctx.fillStyle = c_minusPlus;
			let aux = this.pressed? 0 : 1;
			ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y + aux, this.buttonRect.width, 1);
		}
	}
}
buttons.push(minusButton);
// +
var plusButton = {
	pressed: false,
	active: false,
	vId: visibleButtonId++,

	buttonRect: {
		x: 60, y: 59,
		width: 3, height: 3
	},
	onmousedown: function () {
		this.pressed = true;
		increaseBPM();
	},
	onmouseup: function() {
		this.pressed = false;
	},
	draw: function(ctx) {
		if(this.active) {
			ctx.fillStyle = c_minusPlus;
			let aux = this.pressed? 0 : 1;
			ctx.fillRectScaled(this.buttonRect.x + 1, this.buttonRect.y + aux, 1, 3);
			ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y + aux + 1, this.buttonRect.width, 1);
		}
	}
}
buttons.push(plusButton);

// level
var levelButton = {
	pressed: false,
	active: false,
	vId: visibleButtonId++,

	buttonRect: {
		x: 1, y: 0,
		width: 1, height: 6
	},
	onmousedown: function () {
		this.pressed = true;
		genearteNewLevel();
	},
	onmouseup: function() {
		this.pressed = false;
	},
	draw: function(ctx) {
		if(this.active) {
			ctx.fillStyle = c_levelButton;
			let aux = this.pressed? 1 : 0;

			ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y + aux, 1, 5);

			if (!this.pressed) {
				ctx.fillStyle = c_levelButtonSide;
				ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y + 5, 1, 1);
			}
		}
	}
}
buttons.push(levelButton);

// Channel buttons
var touchButtons = []
for (let i = 0; i < CHANNELS; ++i) {
	let muteButton = {
		pressed: false,
		active: false,
		id: i,
		vId: visibleButtonId++,

		buttonRect: {
			x: 1, y: 10 + i * CHANNEL_HEIGHT,
			width: 1, height: 3
		},
		onmousedown: function () {
			this.pressed = true;
		},
		onmouseup: function() {
			this.pressed = false;
			muteChannelPressed(i);
		},
		draw: function(ctx) {
			if(this.active) {
				let isOn = channels[this.id].isOn;
				let aux = this.pressed? 1 : 0;
				ctx.fillStyle = isOn? c_muteButtonOn : c_muteButtonOff;
				ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y + aux, 1, 2);
				if (!this.pressed) {
					ctx.fillStyle = isOn? c_muteButtonOnSide : c_muteButtonOffSide;
					ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y + 2, 1, 1);
				}
			}
		}
	}
	buttons.push(muteButton);

	let switchButton = {
		pressed: false,
		active: false,
		id: i,
		vId: visibleButtonId++,

		buttonRect: {
			x: 1, y: 7 + i * CHANNEL_HEIGHT,
			width: 1, height: 2
		},
		onmousedown: function () {
			this.pressed = true;
		},
		onmouseup: function() {
			this.pressed = false;
			changeChannelPressed(i);
		},
		draw: function(ctx) {
			if(this.active) {
				let aux = this.pressed? 1 : 0;
				let colour = channels[this.id].colour;
				ctx.fillStyle = rgb(colour);
				ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y + aux, 1, 1);
				if (!this.pressed) {
					ctx.fillStyle = rgb(darken(colour));
					ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y + 1, 1, 1);
				}
			}
		}
	}
	buttons.push(switchButton);

	let touchInterface = {
		active: false,
		mouseIsOver: false,
		id: i,
		vId: visibleButtonId++,

		buttonRect: {
			x: 3, y: 7 + i * CHANNEL_HEIGHT,
			width: 60, height: CHANNEL_HEIGHT
		},
		onmousedown: function (pos) {
			let p = pos.x - this.buttonRect.x;
			p = p % times[this.id];

			if (channels[this.id].isOn) {
				if (channels[this.id].timeShift == p) {
					channels[this.id].isOn = false;
				}
				else {
					channels[this.id].timeShift = p;
				}
			}
			else {
				channels[this.id].isOn = true;
				channels[this.id].timeShift = p;
			}
		},
		onmouseenter: function () {
			this.mouseIsOver = true;
		},
		onmouseexit: function () {
			this.mouseIsOver = false;
		},
		draw: function(ctx) {
			if (this.mouseIsOver) {
				let p = lastMousePosition.x - this.buttonRect.x;
				p = p % times[this.id];

				if (p == channels[this.id].timeShift && channels[this.id].isOn) {
					ctx.fillStyle = rgb(channels[this.id].colour);
				}
				else {
					ctx.fillStyle = rgba(channels[this.id].colour, 0.35);
				}

				for (let j = p; j < TIME_STEPS; j += times[this.id]) {
					ctx.fillRectScaled(3 + j, 7 + this.id * CHANNEL_HEIGHT, 1, CHANNEL_HEIGHT);
				}
			}
		}
	}
	buttons.push(touchInterface);
}

// turn on off music
var turnOnScale = [];
var turnOffScale = [];
var pentatonicMajor = [0, 2, 4, 7, 9];
var bluesScale = [0, 3, 5, 6, 7, 10];

for (let i = 0; i < visibleButtonId; ++i) {
	let tOn = Math.floor(i/pentatonicMajor.length) * 12 + pentatonicMajor[i % pentatonicMajor.length];
	let tOff = Math.floor(i/bluesScale.length) * 12 + bluesScale[i % bluesScale.length];

	turnOnScale.push(tOn);
	turnOffScale.push(tOff);
}
console.log(turnOnScale, turnOffScale);
//

function isMachineOn() {
	return onOffButton.isOn;
}

function isMusicPlaying() {
	return transport.state == "started";
}

//var turnOnSynth = new Tone.MembraneSynth({pitchDecay: 0.1, octaves: 10, }).toMaster();
var turnOnSynth = new Tone.AMSynth().toMaster();
var turningOn = false;
var turnOnOffTime = 0;
function turnMachineOn() {
	transport.start();
	for (let i = 1; i < buttons.length; ++i) {
		if (!(buttons[i].vId >= 0)) buttons[i].active = true;
	}
	stopButton.pressed = false;

	turningOn = true;
	turnOnOffTime = 0;
}

function turnMachineOff() {
	transport.stop();
	for (let i = 1; i < buttons.length; ++i) {
		if (typeof buttons[i].vId == 'undefined') buttons[i].active = false;
	}

	for (let i = 0; i < CHANNELS; ++i) {
		channels[i].isOn = false;
	}

	for (let i = 0; i < TIME_STEPS; ++i) {
		result[i] = 0;
	}

	turningOn = true;
	turnOnOffTime = 0;

	setBPM(D_BPM);
}

function muteChannelPressed(channelIt) {
	if (!channels[channelIt].isOn) {
		channels[channelIt].isOn = true;
	}
	else {
		channels[channelIt].isOn = false;

		/*
		let shift = channels[channelIt].timeShift;

		shift ++;
		if (shift >= times[channelIt]) {
			channels[channelIt].timeShift = 0;
			channels[channelIt].isOn = false;
		}
		else {
			channels[channelIt].timeShift = shift;
		}*/
	}
}

function changeChannelPressed(channelIt) {
	let it = channels[channelIt].colourIt + 1;
	if (it >= CHANNELS) {
		it = 0;
	}
	channels[channelIt].colourIt = it;
}

function genearteNewLevel() {
	
}

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var holderElement = document.getElementById("holder");

holderElement.width = WIDTH * SCALE;
holderElement.height = HEIGHT * SCALE;
holderElement.style.marginLeft = -holderElement.width/2+"px";
canvas.width = WIDTH * SCALE;
canvas.height = HEIGHT * SCALE;
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled  = false;

ctx.fillRectScaled = function (x, y, w, h) {
	ctx.fillRect(x * SCALE, y * SCALE, w * SCALE, h * SCALE);
}

ctx.drawImageScaled = function (image, x, y, w, h) {
	ctx.drawImage(image, x * SCALE, y * SCALE, w * SCALE, h * SCALE);
}
			 
/*******************/
/****** Input ******/
/*******************/

function getMousePos(e) {
	var rect = canvas.getBoundingClientRect();
	return {
		x: Math.floor((e.clientX - rect.left)/SCALE),
		y: Math.floor((e.clientY - rect.top)/SCALE)
	};
}

var pressedButton = null;
function onmousedown (e) {
	var pos = getMousePos(e);
	var button = getButtonUnder(pos);

	if (button && button.active && button.onmousedown) {
		button.onmousedown(pos);
		pressedButton = button;
	}
}

var overButton = null;
var lastMousePosition = {x:0, y:0};
function onmousemove (e) {
	var pos = getMousePos(e);
			
	var button = getButtonUnder(pos);

	if (button && button.active) {
		document.body.style.cursor = "pointer";

		if (overButton != button) {
			if (overButton) {
				if (overButton.onmouseexit)
					overButton.onmouseexit();
				if (pressedButton) {
					if (pressedButton.onmouseup)
						pressedButton.onmouseup();
					pressedButton = null;
				}
			}

			if (button.onmouseenter) {
				button.onmouseenter();
			}
		}

		if (button.onmousemove) {
			button.onmousemove(pos);
		}
	}
	else {
		document.body.style.cursor = "default";

		if (overButton && overButton.onmouseexit) {
			overButton.onmouseexit();
		}

		if (pressedButton && pressedButton.onmouseup) {
			pressedButton.onmouseup();
		}
		pressedButton = null;
	}

	overButton = button;

	lastMousePosition = pos;
}

function onmouseup (e) {
	var pos = getMousePos(e);

	if (pressedButton && pressedButton.onmouseup) {
		pressedButton.onmouseup();
	}
	pressedButton = null;
}

canvas.addEventListener("mousedown", onmousedown);
canvas.addEventListener("mousemove", onmousemove);
document.addEventListener("mouseup", onmouseup);
			
//document.onkeydown = keydown;
//document.onkeyup = keyup;

/*******************/
/****** Logic ******/
/*******************/
function collides(rect, pos) {
	return pos.x >= rect.x && pos.y >= rect.y && pos.x < rect.x + rect.width && pos.y < rect.y + rect.height;
}

function getButtonUnder(pos) {
	for (let i = 0; i < buttons.length; ++i) {
		if (collides(buttons[i].buttonRect, pos)) {
			return buttons[i];
		}
	}

	return null;
}
			
var transportIt = 0;
var lastTick = 0;
var maxTick = 1/20;
var Time = {
	time : 0,
	deltaTime: 0
};
function update(tick)
{
	var deltaTime = Math.min((tick - lastTick)/1000, maxTick);
	lastTick = tick;

	Time.deltaTime = deltaTime;
	Time.time += deltaTime;

	transportIt = getCurrentTransportIt();

	lastTransportTime += deltaTime;

	// turning on-off scale
	if (turningOn) {
		turnOnOffTime += deltaTime;

		var maxTurnOn = Math.floor(Math.min(1, turnOnOffTime / TURN_ONOFF_DURATION) * visibleButtonId);

		var machineOn = isMachineOn();

		for (let i = 0; i < buttons.length; ++i) {
			if (buttons[i].vId >= 0) {
				if (buttons[i].vId < maxTurnOn) {
					if (buttons[i].active != machineOn) {
						buttons[i].active = machineOn;

						if (machineOn) {
							turnOnSynth.triggerAttack(Tone.Frequency("C2").transpose(turnOnScale[buttons[i].vId]));
						}
						else {
							turnOnSynth.triggerAttack(Tone.Frequency("C2").transpose(turnOffScale[visibleButtonId - buttons[i].vId - 1]));
						}
					}
				}
				else break;
			}
		}

		if (maxTurnOn >= visibleButtonId) {
			turningOn = false;

			turnOnSynth.triggerRelease(Tone.now() + Tone.Time("8n"));
		}
	}
}

function draw() {
	ctx.drawImageScaled(bgImage, 0, 0, WIDTH, HEIGHT);
				
	if (transport.state != "stopped") {
		ctx.fillStyle = c_beatHighlight;
		ctx.fillRectScaled((3 + transportIt), 1, 1, 6 + 7 * CHANNELS);
	}

	if (isMachineOn()) {
		for (let i = 0; i < CHANNELS; ++i) {
			if (channels[i].isOn) {
				for (let j = channels[i].timeShift; j < TIME_STEPS; j += times[i]) {
					if (transportIt == j && isMusicPlaying()) {
						ctx.fillStyle = rgb(channelColours[channels[i].colourIt]);
					}
					else {
						ctx.fillStyle = rgb(darken(channelColours[channels[i].colourIt], 0.7));
					}
					ctx.fillRectScaled(3 + j, 7 + i * CHANNEL_HEIGHT, 1, CHANNEL_HEIGHT);
				}
			}
		}

		for (let i = 0; i < TIME_STEPS; ++i) {
			if (result[i] > 1) {
				ctx.fillStyle = c_result2;

				ctx.fillRectScaled(3 + i, 1, 1, result[i] - 1)
			}
		}
	}

	buttons.forEach(function (b) {
		b.draw(ctx);
	});
}

function loop (tick) {
	update(tick);
	draw();

	window.requestAnimFrame(loop);
}

ctx.fillStyle = "#000";
ctx.clearRect(0,0,WIDTH*SCALE,HEIGHT*SCALE);

var bgImage = null;
assetManager.downloadAll(function() {
	bgImage = assetManager.getAsset("bg.png");
	ctx.drawImageScaled(bgImage, 0, 0, WIDTH, HEIGHT);
				
	window.requestAnimFrame(loop);
});