/*
	Poly-60 is a game by @fonserbc
	you can play it on fonserbc.itch.io/poly-60

	Originally made for LowRezJam19

	Made using Tonejs (tonejs.github.io)
*/

var SCALE = 10; // 9
var WIDTH = 64;
var HEIGHT = 64;
var TIME_STEPS = 60;
var CHANNELS = 7;
var CHANNEL_HEIGHT = 7;
var MIN_BPM = 200;
var MAX_BPM = 420;
var D_BPM = 300;
var TURN_ONOFF_DURATION = 0.5;
assetManager = new AssetManager();
assetManager.downloadQueue = ["bg.png", "win-bg.png", "win-mask.png"];

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

var c_bmpLEDWrong = {r: 255, g: 10, b: 0};
var c_bmpLED = {r: 255, g: 140, b: 0};
var c_level = {r: 81, g: 181, b:255};
var c_level_dark = rgb(darken(c_level, 0.7));
var c_beatHighlight = "rgba(0,0,0,0.35)";
var c_minusPlus = "#abaea3";
var c_minusPlusSide = "#75776f";
var c_levelButton = rgb(c_level);
var c_levelButtonSide = rgb(darken(c_level, 0.7));
var c_muteButtonOn = rgb(c_bmpLED);
var c_muteButtonOnSide = rgb(darken(c_bmpLED, 0.7));
var c_muteButtonOff = rgb(darken(c_bmpLED, 0.35));
var c_muteButtonOffSide = rgb(darken(c_bmpLED, 0.2));
var c_stopButtonFront = "#535548";
var c_stopButtonBG = "#191a16";
var c_result = rgb(c_bmpLED);
var c_result_wrong = rgb(darken(c_bmpLED, 0.7));
var c_challengeButtonFront = "#66EBFF";
var c_challengeButtonBG = "#249FB3";
var c_winLights = {r:244, g: 223, b: 95};
var channelColours = [
	{r: 255, g: 51, b: 18}, // red
	{r: 189, g: 20, b: 217}, // purple
	{r: 37, g: 53, b: 240}, // marine blue
	{r: 22, g: 216, b: 217}, // cyan
	{r: 30, g: 250, b: 34}, // green
	{r: 255, g: 161, b: 23}, // orange
	{r: 227, g: 215, b: 16}, // yellow
];

var pentatonicMajor = [0, 2, 4, 7, 9];
var bluesScale = [0, 3, 5, 6, 7, 10];
var scales = [
	["D5","A4","D4","B3","E3","G2","C2"],
	["G5","D5","C5","B4","G3","E3","C2"],
	["C7","D6","E5","F4","G3","A2","B1"],
	["Eb5","C5","G4","Db4","Ab3","F3","Bb2"],
	["D5","A4","E4","C4","B3","F3","G2"],
	["F#4","D4","Ab3","D3","Bb2","E2","C2"]
]
var scalesIt = -1;

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
var channelNotes = scales[0];
var result = [];
var level = [];
var levelCorrectCount = 0;
for (let i = 0; i < TIME_STEPS; ++i) {
	result.push(0);
	level.push(0);
}

var instruments = [];
instruments.push({synth: new Tone.PolySynth(7, Tone.Synth).toMaster(), volume: 0.9});
instruments.push({synth: new Tone.PolySynth(7, function () {
	return new Tone.Synth({
			"oscillator" : {
				"type" : "amtriangle",
				"harmonicity" : 0.5,
				"modulationType" : "sine"
			},
			"envelope" : {
				"attackCurve" : "exponential",
				"attack" : 0.025,
				"decay" : 0.2,
				"sustain" : 0.2,
				"release" : 1.5,
			},
			"portamento" : 0.05
			});
}).toMaster(), volume: 1});
instruments.push({synth: new Tone.PolySynth(7, function () {
	return new Tone.Synth({
			"oscillator" : {
				"type" : "fmtriangle",
				"harmonicity" : 1,
				"modulationType" : "square",
				"modulationIndex": 4
			},
			"envelope" : {
				"attackCurve" : "exponential",
				"attack" : 0.025,
				"decay" : 0.2,
				"sustain" : 0.2,
				"release" : 0.7,
			},
			"portamento" : 0.05
			});
}).toMaster(), volume: 0.2});
instruments.push({synth: new Tone.PolySynth(7, function () {
	return new Tone.Synth({
			"oscillator" : {
				"type" : "pwm",
				"modulationFrequency" : 0.4
			},
			"envelope" : {
				"attackCurve" : "sine",
				"attack" : 0.03,
				"decay" : 0.22,
				"sustain" : 0.4,
				"release" : 0.8,
			}
			});
}).toMaster(), volume: 0.1});
/*instruments.push({synth: new Tone.PolySynth(7, function () {
	return new Tone.NoiseSynth({
			"noise" : {
				"type" : "white"
			},
			"envelope" : {
				"attack" : 0.025,
				"decay" : 0.1,
				"sustain" : 0.1,
				"release" : 0.5,
			}
			});
}).toMaster(), volume: 1});*/

for (let i = 0; i < CHANNELS; ++i) {
	let channel = {
		id: i,
		colourIt: 0,
		timeShift: 0,
		isOn: false,
		get noteColour () {
			return channelColours[this.id];
		},
		get instrumentColour() {
			return channelColours[this.colourIt];
		}
	};
	channels.push(channel);
}

var lastTransportTime = 0;
var totalTransportCallbacks = 0;
function transportCallback (time)
{
	totalTransportCallbacks++;
	transportIt = getCurrentTransportIt();
	somethingIsWrong = false;

	result[transportIt] = 0;
	let instrumentNotes = [];
	for (let i = 0; i < instruments.length; ++i) instrumentNotes.push([]);

	for (let i = 0; i < CHANNELS; ++i) {
		if (channels[i].isOn) {
			if (transportIt % times[i] == channels[i].timeShift) {
				instrumentNotes[channels[i].colourIt].push(channelNotes[i]);
				//channels[i].synth.triggerAttackRelease(channelNotes[channels[i].colourIt], Tone.Time("4n"), time, 0.7);
				result[transportIt]++;

				let auxEnd = endLevelMap[transportIt * CHANNELS + i];
				if (auxEnd) {
					let b = auxEnd.on;
					auxEnd.on = true;
					auxEnd.a = Math.random() < 0.5? 0.7 : 1;

					let prevIt = (transportIt + 60 - times[i])%60;
					let auxPrev = endLevelMap[prevIt * CHANNELS + i];
					if (auxPrev && auxPrev.on) {
						auxPrev.on = false;
					}
				}
			}
		}
	}

	for (let i = 0; i < instruments.length; ++i) {
		if (instrumentNotes[i].length > 0) {
			instruments[i].synth.triggerAttackRelease(instrumentNotes[i], "4n", time, instruments[i].volume);
		}
		else {
			instruments[i].synth.triggerRelease(instrumentNotes[i], time, instruments[i].volume);
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
	channelButtonSynth.triggerAttackRelease(bmp, "8n", Tone.now(), 0.1);
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
		//console.log("Turned machine "+(this.isOn? "ON" : "OFF"));
	},
	draw: function(ctx) {
		if (this.isOn) {
			ctx.fillStyle = c_muteButtonOn;
			ctx.fillRectScaled(this.buttonRect.x + this.buttonRect.width - 1, this.buttonRect.y, 1, this.buttonRect.height);
			ctx.fillStyle = c_muteButtonOnSide;
			ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y, this.buttonRect.width - 1, this.buttonRect.height - 1);
		}
		else {
			ctx.fillStyle = c_muteButtonOnSide;
			ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y, 1, this.buttonRect.height);
			ctx.fillStyle = c_muteButtonOff;
			ctx.fillRectScaled(this.buttonRect.x + 1, this.buttonRect.y, this.buttonRect.width - 1, this.buttonRect.height - 1);
		}
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

				if (somethingIsWrong) {
					let t = Math.floor(Time.time * 4) % 2;
					if (t == 0) ctx.fillStyle = rgb(c_bmpLEDWrong);
					else ctx.fillStyle = rgb(darken(c_bmpLEDWrong, 0.2));

					ctx.fillRectScaled(this.buttonRect.x + 1, this.buttonRect.y + 2, 2, 2);
				}
				else {
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
		width: 1, height: 7
	},
	onmousedown: function () {
		this.pressed = true;
		generateNewLevel();
	},
	onmouseup: function() {
		this.pressed = false;
	},
	draw: function(ctx) {
		if(this.active) {
			ctx.fillStyle = c_levelButton;
			let aux = this.pressed? 1 : 0;

			ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y + aux, 1, this.buttonRect.height - 1);

			if (!this.pressed) {
				ctx.fillStyle = c_levelButtonSide;
				ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y + this.buttonRect.height - 1, 1, 1);
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
			x: 1, y: 11 + i * CHANNEL_HEIGHT,
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
				let lightOn = isOn && (!isMusicPlaying() || ((transportIt % times[this.id]) == channels[this.id].timeShift));

				ctx.fillStyle = lightOn? c_muteButtonOn : c_muteButtonOff;
				ctx.fillRectScaled(this.buttonRect.x, this.buttonRect.y + aux, 1, 2);
				if (!this.pressed) {
					ctx.fillStyle = lightOn? c_muteButtonOnSide : c_muteButtonOffSide;
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
			x: 1, y: 8 + i * CHANNEL_HEIGHT,
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
				let colour = channels[this.id].noteColour;
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
			x: 3, y: 8 + i * CHANNEL_HEIGHT,
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
					ctx.fillStyle = rgba(channels[this.id].noteColour, 0.5);
				}
				else {
					ctx.fillStyle = rgba(channels[this.id].noteColour, 0.35);
				}

				for (let j = p; j < TIME_STEPS; j += times[this.id]) {
					ctx.fillRectScaled(this.buttonRect.x + j, this.buttonRect.y, 1, CHANNEL_HEIGHT);
				}
				
				ctx.fillStyle = rgba(channels[this.id].noteColour, 0.5);
				for (let j = p; j < TIME_STEPS; j += times[this.id]) {
					ctx.fillRectScaled(this.buttonRect.x + j, CHANNEL_HEIGHT, 1, 1);//CHANNEL_HEIGHT - 1);
				}
			}
		}
	}
	buttons.push(touchInterface);
}

// turn on off music
var turnOnScale = [];
var turnOffScale = [];

for (let i = 0; i < visibleButtonId; ++i) {
	let tOn = Math.floor(i/pentatonicMajor.length) * 12 + pentatonicMajor[i % pentatonicMajor.length];
	let tOff = Math.floor(i/bluesScale.length) * 12 + bluesScale[i % bluesScale.length];

	turnOnScale.push(tOn);
	turnOffScale.push(tOff);
}
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

var channelButtonSynth = new Tone.MembraneSynth({pitchDecay: 0.05, octaves: 10, }).toMaster();
//var channelButtonSynth = new Tone.Synth({oscillator: {type: "square"}}).toMaster();

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
	
	instruments[channels[channelIt].colourIt].synth.triggerAttackRelease(channelNotes[channelIt], "8n", Tone.now(), instruments[channels[channelIt].colourIt].volume);
}

function changeChannelPressed(channelIt) {
	let it = channels[channelIt].colourIt + 1;
	if (it >= instruments.length) {
		it = 0;
	}
	channels[channelIt].colourIt = it;

	instruments[it].synth.triggerAttackRelease(channelNotes[channelIt], "8n", Tone.now(), instruments[it].volume);
}

var levelExpectedChannels = 0;
var endLevelMap = {};
function generateNewLevel()
{	
	levelExpectedChannels = Math.floor(Math.random() * (CHANNELS - 1)) + 2;

	let chosenChannels = [];
	for (let i = 0; i < CHANNELS; ++i) {
		chosenChannels.push(i);
	}

	while (chosenChannels.length > levelExpectedChannels) {
		let r = Math.floor(Math.random() * chosenChannels.length);
		chosenChannels.splice(r, 1);
	}

	console.log("Choosen channels: ", chosenChannels);

	let chosenShifts = [];
	for (let i = 0; i < chosenChannels.length; ++i) {
		chosenShifts.push(Math.floor(Math.random() * times[chosenChannels[i]]));
	}
	console.log("Choosen shifts: ", chosenShifts);
		
	let availableMap = [];// level end viz
	let needMap = [];

	for (let i = 0; i < TIME_STEPS; ++i) {
		level[i] = 0;

		// add up level counts
		for (let j = 0; j < chosenChannels.length; ++j) {
			if ((i % times[chosenChannels[j]]) == chosenShifts[j]) {
				level[i]++;

				needMap.push(i * CHANNELS + chosenChannels[j]);
			}
		}

		// levelEndViz
		for (let j = level[i]; j < CHANNELS; ++j) {
			availableMap.push({x: i, y: j, on: false, a: 1});
		}
	}

	// levelEndViz
	for (let i = 0; i < needMap.length; ++i) {
		let r = Math.floor(Math.random() * availableMap.length);

		endLevelMap[needMap[i]] = availableMap[r];

		endLevelMap[needMap[i]].on = i % 2 == 0;
		endLevelMap[needMap[i]].a = 0.5 * Math.random();

		if (r == availableMap.length - 1) {
			availableMap.splice(r, 1);
		}
		else {
			availableMap.splice(r, 2);
		}
	}

	scalesIt = (scalesIt + 1)%scales.length;
	channelNotes = scales[scalesIt];

	if (isMachineOn()) {
		console.log("doing time thing", channelNotes.length);
		// make some noise
		for (let i = 0; i < channelNotes.length; ++i) {
			turnOnSynth.triggerAttack(channelNotes[channelNotes.length - 1 - i], Tone.now() + 0.035 * i, 0.7);
		}
		turnOnSynth.triggerRelease(Tone.now() + 0.035 * channelNotes.length);
	}
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
var somethingIsWrong = false;
function update(tick)
{
	var deltaTime = Math.min((tick - lastTick)/1000, maxTick);
	lastTick = tick;

	Time.deltaTime = deltaTime;
	Time.time += deltaTime;

	//transportIt = getCurrentTransportIt();

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

	if (!turningOn && isMusicPlaying() && lastTransportTime > (60/bmp)*2) {
		console.log("Something is wrong with the audio");
		somethingIsWrong = true;

		transport.stop();
		transport.start();
		somethingIsWrong = false;
	}
}

function draw() {
	ctx.drawImageScaled(bgImage, 0, 0, WIDTH, HEIGHT);
				
	let everythingCorrect = false;
	if (isMachineOn()) {
		// level
		levelCorrectCount = 0;
		for (let i = 0; i < TIME_STEPS; ++i) {
			if (result[i] == level[i]) levelCorrectCount++;
		}

		everythingCorrect = levelCorrectCount == TIME_STEPS;

		if (everythingCorrect) {
			ctx.drawImageScaled(winbg, 3, 0, 60, 7);
		}

		let lastLevelFill = c_level_dark;
		for (let i = 0; i < TIME_STEPS; ++i) {
			let correct = result[i] == level[i]; // || (level[i] == 0 && result[i] <= 1) 
			
			if (everythingCorrect) {
				
				//if (i > 0) {
				//	if (level[i] != level[i - 1]) {
				//		lastLevelFill = rgb(darken(c_level, 0.5));// * Math.random()));
				//	}
				//}
				ctx.fillStyle = lastLevelFill;
			}
			else {
				ctx.fillStyle = rgb(c_level);
			}

			let h = 7 - level[i];
			if (h > 0) {
				ctx.fillRectScaled(3 + i, level[i], 1, h);
			}

			if (!everythingCorrect && result[i] > 0) {
				let top = Math.min(level[i], result[i]);

				if (top > 0) {
					ctx.fillStyle = (correct && !everythingCorrect)? c_result : c_result; // c_result_wrong

					ctx.fillRectScaled(3 + i, 0, 1, top);
				}

				if (result[i] > level[i]) {
					let overflow = result[i] - level[i];

					ctx.fillStyle = rgb(c_bmpLEDWrong);//, 0.5); // Overlapping
					ctx.fillRectScaled(3 + i, top, 1, overflow);
				}
			}
		}

		if (everythingCorrect) {
			for(let c = 0; c < channelColours.length; ++c) {

				ctx.fillStyle = rgb(channelColours[c]);
				let i = (c*2 + totalTransportCallbacks)%(channelColours.length * 2);
				let max = 30 * 5; // Size of POLY-60 pixels
				while (i < max) {
					ctx.fillRectScaled(6 + 30 - i%30, 58 + Math.floor(i/30), 1, 1);
					i++;
					if (i < max) {
						ctx.fillRectScaled(6  + 30 - i%30, 58 + Math.floor(i/30), 1, 1);
					}
					i++;
					i += (channelColours.length - 1) * 2;
				}
			}

			ctx.drawImageScaled(winMaskImage, 7, 58, 30, 5);
		}
	}

	if (transport.state != "stopped") {
		ctx.fillStyle = c_beatHighlight;
		ctx.fillRectScaled((3 + transportIt), 0, 1, 1 + CHANNEL_HEIGHT * (CHANNELS + 1));
	}

	if (isMachineOn()) {
		var usedChannels = 0;
		// Channels
		for (let i = 0; i < CHANNELS; ++i) {
			if (channels[i].isOn) {
				usedChannels++;
				for (let j = channels[i].timeShift; j < TIME_STEPS; j += times[i])
				{
					let endLevelWindow = endLevelMap[j * CHANNELS + i];

					if (everythingCorrect && endLevelWindow && endLevelWindow.on) { // win windows render
						ctx.fillStyle = rgba(c_winLights, endLevelWindow.a);
						ctx.fillRectScaled(3 + endLevelWindow.x, endLevelWindow.y, 1, 1);
					}

					let isPlayingNoteNow = transportIt == j && isMusicPlaying();
					if (isPlayingNoteNow) {						
						ctx.fillStyle = rgb(channels[i].noteColour);
					}
					else {
						ctx.fillStyle = rgb(darken(channels[i].noteColour, 0.7));
					}
					ctx.fillRectScaled(3 + j, 8 + i * CHANNEL_HEIGHT, 1, CHANNEL_HEIGHT);

					// texture
					if (channels[i].colourIt == 0) {
					
					}
					else if (channels[i].colourIt == 1) {
						ctx.fillStyle = rgb(darken(channels[i].noteColour, 0.5));
						ctx.fillRectScaled(3 + j, 8 + i * CHANNEL_HEIGHT, 1, 3);
					}
					else if (channels[i].colourIt == 2) {
						ctx.fillStyle = rgb(darken(channels[i].noteColour, 0.5));
						ctx.fillRectScaled(3 + j, 8 + i * CHANNEL_HEIGHT, 1, 1);
						ctx.fillRectScaled(3 + j, 8 + i * CHANNEL_HEIGHT + 2, 1, 1);
						ctx.fillRectScaled(3 + j, 8 + i * CHANNEL_HEIGHT + 4, 1, 1);
						ctx.fillRectScaled(3 + j, 8 + i * CHANNEL_HEIGHT + 6, 1, 1);
					}
					else if (channels[i].colourIt == 3) {
						ctx.fillStyle = rgb(darken(channels[i].noteColour, 0.5));
						ctx.fillRectScaled(3 + j, 8 + i * CHANNEL_HEIGHT, 1, 1);
						ctx.fillRectScaled(3 + j, 8 + i * CHANNEL_HEIGHT + 3, 1, 1);
						ctx.fillRectScaled(3 + j, 8 + i * CHANNEL_HEIGHT + 6, 1, 1);
					}
					else if (channels[i].colourIt == 4) {
						ctx.fillStyle = rgb(darken(channels[i].noteColour, 0.5));
						ctx.fillRectScaled(3 + j, 8 + i * CHANNEL_HEIGHT + 1, 1, 5);
					}
				}
			}
		}

		// Channel count bottom
		var channelOverUnder = levelExpectedChannels - usedChannels;

		for (let i = 0; i < CHANNELS; ++i) {
			let y = Math.floor(i / 4);
			let x = i % 4;

			if (Math.abs(channelOverUnder) > i) {
				ctx.fillStyle = channelOverUnder < 0? rgb(c_bmpLEDWrong) : rgb(c_bmpLED);
				ctx.fillRectScaled(39 + x * 2, 59 + y * 2, 1, 1);
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
var winbg = null;
var winMaskImage = null;
assetManager.downloadAll(function() {
	bgImage = assetManager.getAsset("bg.png");
	winbg = assetManager.getAsset("win-bg.png");
	winMaskImage = assetManager.getAsset("win-mask.png");
	ctx.drawImageScaled(bgImage, 0, 0, WIDTH, HEIGHT);

	generateNewLevel();
				
	window.requestAnimFrame(loop);
});