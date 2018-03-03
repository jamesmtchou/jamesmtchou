/**
 * @license
 * Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 * @license
 * Copyright 2017 Meng-Ta Chou. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * -----------------------------------------------------------------------------
 * Modified to use pure ES6 from TypeScript.
 * =============================================================================
 */

import * as dl from 'deeplearn';
import * as nnArtUtil from './nn-art-util';

const MAX_LAYERS = 10;

const activationFunctionMap = {
  'tanh': x => x.tanh(),
  'sin': x => x.sin(),
  'relu': x => x.relu(),
  'step': x => x.step()
};

const NUM_IMAGE_SPACE_VARIABLES = 3;  // x, y, r
const NUM_LATENT_VARIABLES = 2; // z1, z2

export class CPPN {
  inputAtlas;
  ones;

  firstLayerWeights;
  intermediateWeights = [];
  lastLayerWeights;

  z1Counter = 0;
  z2Counter = 0;
  z1Scale = 1;
  z2Scale = 1;
  numLayers;

  selectedActivationFunctionName;

  isInferring = false;
  inferenceCanvas;

  constructor(inferenceCanvas) {
    this.inferenceCanvas = inferenceCanvas;
    const canvasSize = 128;
    this.inferenceCanvas.width = canvasSize;
    this.inferenceCanvas.height = canvasSize;

    this.inputAtlas = nnArtUtil.createInputAtlas(
    canvasSize, NUM_IMAGE_SPACE_VARIABLES, NUM_LATENT_VARIABLES);
    this.ones = dl.ones([this.inputAtlas.shape[0], 1]);
  }

  generateWeights(neuronsPerLayer, weightsStdev) {
    for (let i = 0; i < this.intermediateWeights.length; i++) {
      this.intermediateWeights[i].dispose();
    }
    this.intermediateWeights = [];
    if (this.firstLayerWeights != null) {
      this.firstLayerWeights.dispose();
    }
    if (this.lastLayerWeights != null) {
      this.lastLayerWeights.dispose();
    }

    this.firstLayerWeights = dl.truncatedNormal(
      [NUM_IMAGE_SPACE_VARIABLES + NUM_LATENT_VARIABLES, neuronsPerLayer], 0,
      weightsStdev);
    for (let i = 0; i < MAX_LAYERS; i++) {
      this.intermediateWeights.push(dl.truncatedNormal(
        [neuronsPerLayer, neuronsPerLayer], 0, weightsStdev));
    }
    this.lastLayerWeights = dl.truncatedNormal(
      [neuronsPerLayer, 3 /** max output channels */], 0, weightsStdev);
  }

  setActivationFunction(activationFunction) {
    this.selectedActivationFunctionName = activationFunction;
  }

  setNumLayers(numLayers) {
    this.numLayers = numLayers;
  }

  setZ1Scale(z1Scale) {
    this.z1Scale = z1Scale;
  }

  setZ2Scale(z2Scale) {
    this.z2Scale = z2Scale;
  }

  start() {
    this.isInferring = true;
    this.runInferenceLoop();
  }

  runInferenceLoop() {
    if (!this.isInferring) {
      return;
    }

    this.z1Counter += 1 / this.z1Scale;
    this.z2Counter += 1 / this.z2Scale;

    const lastOutput = dl.tidy(() => {
      const z1 = dl.scalar(Math.sin(this.z1Counter));
      const z2 = dl.scalar(Math.cos(this.z2Counter));
      const z1Mat = z1.mul(this.ones);
      const z2Mat = z2.mul(this.ones);

      const concatAxis = 1;
      const latentVars = z1Mat.concat(z2Mat, concatAxis);

      const activation = (x) =>
        activationFunctionMap[this.selectedActivationFunctionName](x);

      let lastOutput = this.inputAtlas.concat(latentVars, concatAxis);
      lastOutput = activation(lastOutput.matMul(this.firstLayerWeights));

      for (let i = 0; i < this.numLayers; i++) {
        lastOutput = activation(lastOutput.matMul(this.intermediateWeights[i]));
      }

      return lastOutput.matMul(this.lastLayerWeights).sigmoid().reshape([
        this.inferenceCanvas.height, this.inferenceCanvas.width, 3
      ]);
    });

    return renderToCanvas(lastOutput, this.inferenceCanvas)
      .then(() => dl.nextFrame())
      .then(() => this.runInferenceLoop());
  }

  stopInferenceLoop() {
    this.isInferring = false;
  }
}

function renderToCanvas(a, canvas) {
  const [height, width, ] = a.shape;
  const ctx = canvas.getContext('2d');
  const imageData = new ImageData(width, height);
  return a.data().then((data) => {
    for (let i = 0; i < height * width; ++i) {
      const j = i * 4;
      const k = i * 3;
      imageData.data[j + 0] = Math.round(255 * data[k + 0]);
      imageData.data[j + 1] = Math.round(255 * data[k + 1]);
      imageData.data[j + 2] = Math.round(255 * data[k + 2]);
      imageData.data[j + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  });
}
