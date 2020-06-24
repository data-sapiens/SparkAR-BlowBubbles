const D = require('Diagnostics');
const R = require('Reactive');
const Animation = require('Animation');

export class Overlay {
  constructor(root, color = R.pack3(0, 0, 0), opacity = 0.5) {
 	this.root = root;
  	this.opacity = opacity;
  	this.color = R.pack4(color.x, color.y, color.z, opacity);
  	this.isActive = true;
    this.root.setTextureSlot('DIFFUSE', this.color);
  }

  toggle(makeActive) {

  	if(!this.isActive || makeActive) {
  		// Turn on
  		this.color = R.pack4(this.color.x, this.color.y, this.color.z, this.opacity);
  		this.isActive = true;
  	} else {
  		// Turn off
  		this.color = R.pack4(this.color.x, this.color.y, this.color.z, 0);
  		this.isActive = false;
  	}
  	this.root.setTextureSlot('DIFFUSE', this.color);
  }

  fadeIn(ms = 300) {
  	return this.fade(true, ms);
  }

  fadeOut(ms = 300) {
  	return this.fade(false, ms);
  }

  fade(fadeDirection, ms) {
  	return new Promise(resolve => {
	  	const driver = Animation.timeDriver({
			durationMilliseconds: ms,
			loopCount: 1,
			mirror: false
	  	});

	  	driver.onCompleted().subscribe(() => {
	  		this.isActive = fadeDirection;
	  		resolve();
	  	});

	  	this.root.setTextureSlot('diffuseTexture', R.pack4(
	  		this.color.x, 
	  		this.color.y, 
	  		this.color.z,
	  		fadeDirection ? 
	  			Animation.animate(driver, Animation.samplers.linear(0, this.opacity))
	  			:
	  			Animation.animate(driver, Animation.samplers.linear(this.opacity, 0))
	  	));
	  	
	  	driver.start();
  	});
  }
}
