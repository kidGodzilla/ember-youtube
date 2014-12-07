/*global YT*/
import Ember from 'ember';
import InboundActions from 'ember-component-inbound-actions/inbound-actions';

export default Ember.Component.extend(Ember.Evented, /*InboundActions, */{

	ytid: null,
	player: null,
	playerState: 'loading',
	isMuted: false,

	// progressBar: function() {
	// 	var player = this.get('player');
	// 	player.getCurrentTime // 205.32458
	// 	player.getDuration // 478.145305
	// 	player.seekTo
	// }.on('playing')

	// from YT.PlayerState
	stateNames: {
		'-1': 'ready',		// READY
		0: 'ended', 		// YT.Player.ENDED
		1: 'playing', 		// YT.PlayerState.PLAYING
		2: 'paused', 		// YT.PlayerState.PAUSED
		3: 'buffering', 	// YT.PlayerState.BUFFERING
		5: 'queued'			// YT.PlayerState.CUED
	},

	// YouTube's embedded player can take a number of optional parameters.
	// Full list here: https://developers.google.com/youtube/player_parameters#Parameters
	playerVars: {
		autoplay: 0,
		controls: 1,
		enablejsapi: 1,
		rel: 0,
		showinfo: 0,
		autohide: 1
		// disablekb: 1,
		// fs: 0,
		// iv_load_policy: 3,
		// modestbranding: 1,
	},

	isPlaying: function() {
		var player = this.get('player');
		if (!player) { return false; }
		if (this.get('playerState') === 'loading') { return false; }

		return player.getPlayerState() === YT.PlayerState.PLAYING;
	}.property('playerState'),

	// Make the component available to the outside world
	_register: function() {
		this.set('name', this);
	}.on('init'),

	// Load the iframe player API asynchronously from YouTube
	loadApi: function() {
		var tag = document.createElement('script');
		tag.src = "https://www.youtube.com/iframe_api";
		var firstTag = document.getElementsByTagName('script')[0];
		firstTag.parentNode.insertBefore(tag, firstTag);

		// Youtube callback when API is ready
		window.onYouTubePlayerAPIReady = function() {
			Ember.debug('yt player api ready');
			this.createPlayer();
		}.bind(this);
	}.on('init'),

	createPlayer: function() {
		var _this = this;
		var videoId = this.get('ytid');
		var playerVars = this.get('playerVars');
		var $iframe = this.$('#ember-youtube-player');
		var player = new YT.Player($iframe[0], {
			// videoId: 'g8MN92gCCjw',
			width: 360,
			height: 270,
			playerVars: playerVars,
			events: {
				'onReady': _this.onPlayerReady.bind(_this),
				'onStateChange': _this.onPlayerStateChange.bind(_this),
				'onError': _this.onPlayerError.bind(_this)
			}
		});

		this.set('player', player);
	},

	loadVideo: function() {
		this.get('player').loadVideoById(this.get('ytid'));
	}.observes('ytid'),

	onPlaybackChange: function() {
		if (this.get('playback')) {
			this.send('play');
		} else {
			this.send('pause');
		}
	}.observes('playbackChange'),

	onVolumeChange: function() {
		if (this.get('volume')) {
			this.send('play');
		} else {
			this.send('pause');
		}
	}.observes('volumeChange'),

	// called by the API
	onPlayerReady: function() {
		this.set('playerState', 'ready');
		this.loadVideo();
	},

	// called by the API
	onPlayerStateChange: function(event) {
		// Get a readable state name
		var state = this.get('stateNames.' + event.data.toString());
		this.set('playerState', state);

		Ember.debug(state);

		// send actions outside
		this.sendAction(state);

		// send actions inside
		this.send(state);

		// internal events using .on('event') syntax
		// isn't available outside the component
		this.trigger(state);
	},

	// called by the API
	onPlayerError: function(event) {
		Ember.warn('YT error');
		this.set('playerState', 'error');
		console.log(event.data);

		// TODO: go to next video on error

		// switch(event.data) {
		// 	case 2:
		// 		Ember.warn('Invalid parameter');
		// 		break;
		// 	case 100:
		// 		Ember.warn('Not found/private');
		// 		this.send('playNext');
		// 		break;
		// 	case 101:
		// 	case 150:
		// 		Ember.warn('Embed not allowed');
		// 		this.send('playNext');
		// 		break;
		// 	default:
		// 		break;
		// }
	},

	startTimer: function() {
		var player = this.get('player');

		this.set('currentTime', player.getCurrentTime());
		this.set('duration', player.getDuration());

		// every 60ms, update current time
		var timer = window.setInterval(function() {
			this.set('currentTime', player.getCurrentTime());
		}.bind(this), 60);

		this.set('timer', timer);
	}.on('playing'),

	stopTimer: function() {
		window.clearInterval(this.get('timer'));
	}.on('paused'),

	currentTimeFormatted: function() {
		var time = this.get('currentTime');
		var minutes = Math.floor(time / 60);
		var seconds = Math.floor(time - minutes * 60);

		if (seconds < 10) seconds = '0' + seconds;

		return minutes + ':' + seconds;

	}.property('currentTime'),

	durationFormatted: function() {
		var time = this.get('duration');
		var minutes = Math.floor(time / 60);
		var seconds = time - minutes * 60;
		return minutes + ':' + seconds;
	}.property('duration'),

	// durationFormatted: function() {
	// 	return
	// }.property('duration'),

	actions: {
		playing: function() {
			Ember.debug('on playing from component');
		},
		load: function() {
			this.get('player').loadVideo();
		},
		play: function() {
			this.get('player').playVideo();
		},
		pause: function() {
			this.get('player').pauseVideo();
		},
		togglePlay: function() {
			if (this.get('isPlaying')) {
				this.send('pause');
			} else {
				this.send('play');
			}
		},
		toggleVolume: function() {
			var player = this.get('player');
			this.toggleProperty('isMuted');
			if (player.isMuted()) {
				player.unMute();
			} else {
				player.mute();
			}
		}
	}
});
