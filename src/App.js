import React, { Component } from 'react';
import Tone from 'tone';
import Vex from 'vexflow';
import Panel from './Panel';
import Visualizator from './Visualizator';
import { generateSong } from './MusicGenerator';
import { WIDTH, NICE_SONGS, SALAMANDER_PIANO_SOUNDS, getNotationForPaint, getNotationForPlay } from './Constants';
import './App.css';
import moment from 'moment';

class App extends Component {

	constructor() {
		super();
		
		// Set the initial state
		this.state = {
			speed: 100,
			duration: 10,
			generated: false,
			song: [],
			isPlaying: false,
			creationDate: 0
		};

		// Set the piano instrument
		this.piano = new Tone.Sampler(SALAMANDER_PIANO_SOUNDS, {
			'release': 1,
			'baseUrl': './salamander/'
		}).toMaster();

		this.handlePlaySong = this.handlePlaySong.bind(this);
		this.bringToTop = this.bringToTop.bind(this);
		this.handleGenerate = this.handleGenerate.bind(this);
		this.handleStopSong = this.handleStopSong.bind(this);
		this.paintSong = this.paintSong.bind(this);
	}

	bringToTop(targetElement) {
		// put the element at the bottom of its parent
		let parent = targetElement.parentNode;
		parent.appendChild(targetElement);
	}

	componentDidMount() {
		this.handleGenerate();
		setTimeout(()=>{
			this.handlePlaySong();
		}, 1000);
		
	}

	handleGenerate() {
		const song = generateSong(this.state.duration);
		this.setState({ song: song });
		this.setState({ generated: true });
		this.paintSong(song);
		this.setState({ creationDate: moment(Date.now()).format('DD-MMM-YY HH:mm:ss') });
	}

	paintSong(song) {
		const VF = Vex.Flow;
		let bars = song.length;
		let currentBar = [];
		var div = document.getElementById("boo");
		let parent = div.parentNode;
		parent.removeChild(div);
		div = document.createElement("div");
		div.setAttribute('id', 'boo');
		parent.appendChild(div);
		var renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
		const measuresPerLine = Math.floor(WIDTH / 250);
		renderer.resize(WIDTH, (bars / measuresPerLine) * 150);
		var context = renderer.getContext();
		var stave = new VF.Stave(10, 40, 250);
		stave.addClef("treble").addTimeSignature("4/4");

		for (let i = 0; i < song.length; i++) {
			const notes = song[i].notes; // measure notes
			let x = stave.width + stave.x;
			let y = stave.y;
			for (let j = 0; j < notes.length; j++) {
				const note = notes[j];
				const sound = NICE_SONGS[1][note.sound];
				const scale = sound[1];
				let duration = getNotationForPaint(note.duration);
				let item = new VF.StaveNote({ keys: [sound[0] + '/' + scale], duration: duration });
				if (note.accidental) {
					item.addAccidental(0, new VF.Accidental("#"));
				}
				currentBar.push(item);
			}
			let beams;
			if (i === song.length - 1) {
				stave.setEndBarType(VF.Barline.type.END);
				stave.setContext(context).draw();
				beams = VF.Beam.generateBeams(currentBar);
				VF.Formatter.FormatAndDraw(context, stave, currentBar);
				beams.forEach(function (b) { b.setContext(context).draw() });
			}
			else {
				stave.setContext(context).draw();
				beams = VF.Beam.generateBeams(currentBar);
				VF.Formatter.FormatAndDraw(context, stave, currentBar);
				beams.forEach(function (b) { b.setContext(context).draw() });
				if ((i + 1) % 5 === 0) {
					y = stave.y + 120;
					x = 10;
					stave = new VF.Stave(x, y, 220);
					stave.addClef("treble");
				} else {
					stave = new VF.Stave(x, y, 220);
				}
			}
			currentBar = [];
		}
	}

	translateForTone(song) {
		const newSong = [];
		for (let i = 0; i < song.length; i++) {
			let currentTempo = 0;
			const notes = song[i].notes; // measure notes
			for (let j = 0; j < notes.length; j++) {
				const note = notes[j];
				let sound = NICE_SONGS[1][note.sound];
				if (note.accidental) {
					sound = sound.slice(0, 1) + ("#") + sound.slice(1 + 0)
				}
				let duration = getNotationForPlay(note.duration);
				newSong.push([i + ":" + currentTempo, sound, duration]);
				currentTempo += note.duration;
			}

		}
		return newSong;
	}

	handlePlaySong() {
		const song = this.translateForTone(this.state.song);
		console.log(song);
		Tone.Transport.cancel();
		Tone.Transport.clear();
		new Tone.Part((time, note, duration) => {
			this.piano.triggerAttackRelease(note, duration, time);
			Tone.Draw.schedule(() => {
				const element = document.getElementById(note);
				if (element) {
					this.bringToTop(element);
					const color = element.getAttribute('data-color');
					const originalRadius = Number(element.getAttribute('r'));
					element.style.fill = color;
					element.style.opacity = 1;
					element.style.r = originalRadius + 5;
					element.style.transition = 'all 0.5s';
					setTimeout(() => {
						element.style.fill = "white";
						element.style.opacity = 0.3;
						element.style.r = originalRadius;
						element.style.transition = 'all 0.5s';
					}, 500);
				} else {
					console.log("CIRCLE_NOT_FOUND", note);
				}
			}, time);
		}, song).start();
		Tone.Transport.bpm.rampTo(this.state.speed);
		Tone.Transport.start();
		this.setState({ isPlaying: true });
	}

	handleStopSong() {
		Tone.Transport.stop();
		Tone.Transport.cancel();
		Tone.Transport.clear();
		this.setState({ isPlaying: false });
	}

	render() {
		return (
			<div>
				<Panel/>
				<Visualizator />
				<section className="song-container">
					<h3>Generated {this.state.creationDate}</h3>
					<div id="boo"></div>
				</section>
			</div>
		);
	}

}

export default App;
