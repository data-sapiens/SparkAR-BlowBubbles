const D = require('Diagnostics');
const R = require('Reactive');
const S = require('Shaders');
const Animation = require('Animation');
const Time = require('Time');
const Random = require('Random');

export const vec4position = S.vertexAttribute({variableName: S.VertexAttribute.POSITION});
export const position = R.pack3(vec4position.x, vec4position.y, vec4position.z);
export const matMVP = S.vertexTransform({variableName: S.BuiltinUniform.MVP_MATRIX});

export const fract = (t) => {
	return t.sub(R.floor(t));
}

export const fwidth = (p) => {
	return S.derivative(p, {
		'derivativeType': S.DerivativeType.FWIDTH
	});
}

export function uvScreenSpace() {
	let matrix = matMVP.mul(vec4position);
	matrix = R.pack3(matrix.x, matrix.y, matrix.z).div(matrix.w).mul(0.5).add(0.5);
	return R.pack2(
		matrix.x,
		matrix.y.toRange(1, 0)
	);
}

export function gradientStep(gradient, steps = []) {
	if (steps.length < 2) {
		throw 'You need at least 2 colors to make an gradient.';
	}

	let previousStep = steps[0][0];

	for(let i = 1; i < steps.length; i++) {
		previousStep = R.mix(previousStep, steps[i][0], R.smoothStep(gradient, steps[i-1][1], steps[i][1]));
	}

	return previousStep;
}

export function bubbleAlpha(texture) {
	const uv = S.functionVec2();
	const mask = S.gradient({type: 'CIRCULAR'});

	const colors = shuffleArray([
		R.pack4(0.9490196078, 0.7176470588, 0.02745098039, 1),
		R.pack4(0.01568627451, 0.9490196078, 0.7843137255, 1),
		R.pack4(0.6392156863, 0.01176470588, 0.3647058824, 1),
	]);

	const gradient = gradientStep(mask, [
		[R.pack4(0, 0, 0, 1), .1],
		[colors[0], .6],
		[colors[1], .8],
		[colors[2], 1],
	]);

	const gradient2 = gradientStep(mask, [
		[R.pack4(0, 0, 0, 1), 0.9],
		[R.pack4(0.5, 0.5, 0.5, 1), 1],
	]);

	const gradient3 = R.max(
		S.composition(
			gradientStep(S.gradient({type: 'HORIZONTAL'}), [
				[R.pack4(0.25, 0.25, 0.25, 1), 0],
				[R.pack4(0, 0, 0, 1), 0.5],
			]),
		uvTransfromRotate(uv, 0.785398163)
		),
		S.composition(
			gradientStep(S.gradient({type: 'HORIZONTAL'}), [
				[R.pack4(0.25, 0.25, 0.25, 1), 0],
				[R.pack4(0, 0, 0, 1), 0.2],
			]),
			uvTransfromRotate(uv, 3.92699082)
		)
	);

	const background = S.composition(
		texture,
		uvScreenSpace()
	);

	let reflection = S.composition(
		texture,
		uv.add(S.composition(mask.pow(4).toRange(0, .5), uv))
	);

	reflection = blendLighten(
		reflection,
		S.composition(
			reflection,
			uvTransfromRotate(uv, 3.14159265)
		)
	).add(gradient2.max(gradient3));

	const luminance = extractHighLuminance(reflection, 0.4);
	const iridescence = luminance.mul(gradient.max(gradient3));

	let color = blendLighten(
		background,
		reflection.add(gradient3).mul(iridescence)
	).sub(0.025);

	return R.pack4(
		color.x,
		color.y,
		color.z,
		mask.pow(100).toRange(1, 0)
	);
}

export function uvTransfromRotate(uv, rad) {
    return R.pack2(
    	R.cos(rad).mul(uv.x.sub(0.5)).add(R.sin(rad).mul(uv.y.sub(0.5))).add(0.5),
    	R.cos(rad).mul(uv.y.sub(0.5)).sub(R.sin(rad).mul(uv.x.sub(0.5))).add(0.5)
    );
}

export function createGrid(size = 80) {
	const coord = S.fragmentStage(R.pack2(position.x.mul(size), position.y.mul(size)));
	    
	// Compute anti-aliased world-space grid lines
	const grid = R.abs(fract(coord.sub(0.5)).sub(0.5)).div(fwidth(coord));

  	// Compute anti-aliased world-space grid lines
  	// 1.49 is thicknes
	const lines = R.sub(1.89, R.min(R.min(grid.x, grid.y), 1));

	// Just visualize the grid lines directly
	return R.pack4(lines.x, lines.x, lines.x, R.step(lines.x, 0.9))// .add(1);
}

export function extractHighLuminance(color, threshold) {
	return R.smoothStep(R.dot(
		R.pack4(0.2126, 0.7152, 0.0722, 0),
		color
	), threshold, 1);
}

export function blendLighten(base, blend) {
	return R.max(base, blend);
}

export function gridPulse(ms = 500, size = 80) {
	const inDriver = Animation.timeDriver({
	  durationMilliseconds: ms,
	  loopCount: 1,
	  mirror: false
	});

	const outDriver = Animation.timeDriver({
	  durationMilliseconds: ms,
	  loopCount: 1,
	  mirror: false
	});

	const grid = createGrid(size);
	const inCircle = R.step(0, S.sdfEllipse(R.pack2(0.5,0.5), Animation.animate(inDriver, Animation.samplers.linear(0, 1))));
	const outCircle = R.step(0, S.sdfEllipse(R.pack2(0.5,0.5), Animation.animate(outDriver, Animation.samplers.linear(0, 1))));
	return {
		texture: R.step(0, S.sdfEllipse(R.pack2(0.5,0.5), 0.5)).mul(grid.mul(inCircle.sub(outCircle))),
		pulse: () => {
			outDriver.reset();
			inDriver.reset();


			Time.setTimeout(() => {
				outDriver.start();
			}, ms / 1.75);

			inDriver.start();
		}
	}
}

export function shuffleArray([...arr]) {
	let m = arr.length;
	
	while (m) {
		const i = Math.floor(Random.random() * m--);
		[arr[m], arr[i]] = [arr[i], arr[m]];
	}
	
	return arr;
}
