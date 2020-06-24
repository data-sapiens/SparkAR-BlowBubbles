const D = require('Diagnostics');
const Scene = require('Scene');
const Patches = require('Patches');
const Touch = require('TouchGestures');
const Mat = require('Materials');
const Tex = require('Textures');
const Instruction = require('Instruction');
const R = require('Reactive');
const CameraInfo = require('CameraInfo');

import { bubbleAlpha, gridPulse } from './shaders';
import { delay } from './helpers';
import { Overlay } from './overlay';

const THRESHOLD_BLOW = 0.90;
const CALIBRATION_TIME = 3000;

const Filter = {
  isLoaded: false,
  trackerPlane: null,
  nullPositioner: null,
  objCamera: null,
  audioBand2: null,
  objEmmiter: null,
  matBubble: null,
  texCamera: null,
  overlay: null,
  actionFloorTap: null,

  init(assets = []) {
    Promise.all(assets).then(assets => this.onLoad(assets));
  },

  // When everything is loaded
  onLoad(assets) {
    // Set state to loaded.
    this.isLoaded = true;
    this.trackerPlane = assets[3];
    this.nullPositioner = assets[6];
    this.objCamera = assets[1].worldTransform;
    this.audioBand2 = assets[0];
    this.objEmmiter = assets[2];
    this.matBubble = assets[4];
    this.texCamera = assets[5];
    this.overlay = new Overlay(assets[7]);
    this.matFloorTap = assets[8];

    this.setupEmitter();
    this.setupMatBubble();
    this.setupMatFloorTap();

    this.setCameraPosition()
    .then(() => this.calibrate())
    .then(() => this.initPlaneTracker())
    .then(() => this.overlay.fadeOut(300))
    .then(() => {
      this.overlay.hidden = true;
      Instruction.bind(CameraInfo.isRecordingVideo.not(), 'press_to_launch');
    });
  },

  setupMatFloorTap() {
    const grid = gridPulse();
    this.actionFloorTap = () => {
      grid.pulse();
    };
    this.matFloorTap.setTextureSlot('DIFFUSE', grid.texture);
  },

  setupEmitter() {
    this.objEmmiter.worldTransform.position = this.objCamera.position;
    this.objEmmiter.transform.rotationX = this.objCamera.rotationX.sub(Math.PI);
    this.objEmmiter.transform.rotationY = this.objCamera.rotationZ.sub(this.trackerPlane.worldTransform.rotationZ);
    this.objEmmiter.transform.rotationZ = this.objCamera.rotationY;

    this.objEmmiter.birthrate = this.audioBand2.sub(0.5).mul(100);
  },

  setupMatBubble() {
    this.matBubble.setTextureSlot('DIFFUSE', bubbleAlpha(this.texCamera.signal));
  },

  initPlaneTracker() {
    return new Promise(resolve => {
      Touch.onTap().subscribe(evt => {
        this.trackerPlane.trackPoint(evt.location);
        Instruction.bind(false, 'tap_to_place_on_surface');
        this.actionFloorTap();
        resolve();
      });
      
      this.nullPositioner.transform.scaleX = R.div(1, this.trackerPlane.worldTransform.scaleX);
      this.nullPositioner.transform.scaleY = R.div(1, this.trackerPlane.worldTransform.scaleY);
      this.nullPositioner.transform.scaleZ = R.div(1, this.trackerPlane.worldTransform.scaleZ);

      Instruction.bind(true, 'tap_to_place_on_surface');
    });
  },

  setCameraPosition() {
    const isCameraBack = CameraInfo.captureDevicePosition.eq('BACK');
    Instruction.bind(isCameraBack.not(), 'flip_camera');

    return new Promise(resolve => {
      const subscription = isCameraBack.monitor({ fireOnInitialValue: true}).subscribe(evt => {
        if(evt.newValue) {
          subscription.unsubscribe();
          resolve();
        }
      });
    });
  },

  calibrate() {
    return new Promise(resolve => {
      Instruction.bind(true, 'look_around');
      // TODO: detect rotation status here? 
      delay(CALIBRATION_TIME).then(() => {
        Instruction.bind(false, 'look_around');
        resolve();
      });
    });
  }
}

// Initalize filter
Filter.init([
    Patches.outputs.getScalar('audioBand2'),
    Scene.root.findFirst('Camera'),
    Scene.root.findFirst('objEmitter'),
    Scene.root.findFirst('planeTracker0'),
    Mat.findFirst('matBubble'),
    Tex.findFirst('texCamera'),
    Scene.root.findFirst('nullPositioner'),
    Mat.findFirst('matOverlay'),
    Mat.findFirst('matFloorTap'),
]);
