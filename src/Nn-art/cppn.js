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
 * Modified to use pure ES6 from TypeScript. Implemented video overlay.
 * =============================================================================
 */

import * as dl from 'deeplearn';
import * as nnArtUtil from './nn-art-util';

const MAX_LAYERS = 10;

const activationFunctionMap = {
  'tanh': x => x.tanh(),
  'sin': x => x.sin(),
  'relu': x => x.relu(),
  'leakyRelu': x => x.leakyRelu(),
  'sigmoid': x => x.sigmoid(),
  'step': x => x.step()
};

const NUM_IMAGE_SPACE_VARIABLES = 3;  // x, y, r
const NUM_LATENT_VARIABLES = 2; // z1, z2
const LEARNING_RATE = 0.01;
const BATCH_SIZE = 100;

export class CPPN {
  inputAtlas;
  batchInputAtlas;
  ones;
  batchOnes;

  firstLayerWeights;
  intermediateWeights = [];
  lastLayerWeights;

  firstLayerBiases;
  intermediateBiases = [];
  lastLayerBiases;

  z1Counter = 0;
  z2Counter = 0;
  z1Scale = 1;
  z2Scale = 1;
  numLayers;

  selectedActivationFunctionName;

  isInferring = false;
  inferenceCanvas;
  optimizer;
  getData;

  constructor(inferenceCanvas, dataGetter) {
    this.inferenceCanvas = inferenceCanvas;
    const canvasSize = 128;
    this.inferenceCanvas.width = canvasSize;
    this.inferenceCanvas.height = canvasSize;
    this.getData = dataGetter;

    this.inputAtlas = nnArtUtil.createInputAtlas(
    canvasSize, NUM_IMAGE_SPACE_VARIABLES, NUM_LATENT_VARIABLES);
    this.ones = dl.ones([this.inputAtlas.shape[0], 1]);
    this.batchOnes = dl.ones([BATCH_SIZE, 1]);
    this.optimizer = dl.train.adagrad(LEARNING_RATE);
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

    this.firstLayerWeights = dl.variable(dl.truncatedNormal(
      [NUM_IMAGE_SPACE_VARIABLES + NUM_LATENT_VARIABLES, neuronsPerLayer], 0,
      weightsStdev).mul(dl.scalar(Math.sqrt(2.0 / neuronsPerLayer))));
    this.firstLayerBiases = dl.variable(dl.zeros(
      [1]));

    for (let i = 0; i < MAX_LAYERS; i++) {
      this.intermediateWeights.push(dl.variable(dl.truncatedNormal(
        [neuronsPerLayer, neuronsPerLayer], 0, weightsStdev)));
      this.intermediateBiases.push(dl.variable(dl.zeros(
        [1])));
    }
    this.lastLayerWeights = dl.variable(dl.truncatedNormal(
      [neuronsPerLayer, 3 /** max output channels */], 0, weightsStdev));
    this.lastLayerBiases = dl.variable(dl.zeros(
      [1]));
  }

  generateBatchIndex() {
    return dl.tidy(() => {
      let batchInputIndexes = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        batchInputIndexes.push(randi(this.inputAtlas.shape[0], 0));
      }
      return dl.tensor1d(batchInputIndexes);
    });
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

  loss(prediction, actual) {
    const cost = prediction.sub(actual).square().mean().mean().mean();
    console.log(cost.dataSync());
    return cost;
  }

  start() {
    this.isInferring = true;
    this.runInferenceLoop();
  }

  runModel(withCounter, fullModel) {
    return dl.tidy(() => {
      let z1, z2;
      if (withCounter) {
        z1 = dl.scalar(Math.sin(this.z1Counter));
        z2 = dl.scalar(Math.cos(this.z2Counter));
      } else {
        z1 = dl.scalar(0);
        z2 = dl.scalar(0);
      }

      let ones, input;
      if(fullModel) {
        ones = this.ones;
        input = this.inputAtlas;
      } else {
        ones = this.batchOnes;
        input = dl.gather(this.batchInputAtlas, dl.tensor1d([0, 1]), 1).concat(dl.scalar(0).mul(this.batchOnes), 1);
      }

      const z1Mat = z1.mul(ones);
      const z2Mat = z2.mul(ones);

      const concatAxis = 1;
      const latentVars = z1Mat.concat(z2Mat, concatAxis);

      const activation = (x) =>
        activationFunctionMap[this.selectedActivationFunctionName](x);

      let lastOutput = input.concat(latentVars, concatAxis);
      lastOutput = activation(lastOutput.matMul(this.firstLayerWeights).add(this.firstLayerBiases));

      for (let i = 0; i < this.numLayers; i++) {
        lastOutput = activation(lastOutput.matMul(this.intermediateWeights[i]).add(this.intermediateBiases[i]));
      }

      if (fullModel) {
        return lastOutput.matMul(this.lastLayerWeights).add(this.lastLayerBiases).sigmoid().reshape([
          this.inferenceCanvas.height, this.inferenceCanvas.width, 3
        ]);
      } else {
        return lastOutput.matMul(this.lastLayerWeights).add(this.lastLayerBiases).sigmoid().reshape([
          BATCH_SIZE, 3
        ]);
      }
    });
  }

  runOptimizer() {
    return dl.tidy(() => {
      this.optimizer.minimize(() => {
        const batchInputIndexes = this.generateBatchIndex();

        this.batchInputAtlas = this.inputAtlas.gather(batchInputIndexes);
        // this.batchInputAtlas = this.inputAtlas;
        const prediction = dl.keep(this.runModel(false, false));

        const data = this.getData() ? tensorNormalize(this.getData()
          .reshape([-1, 3]).gather(batchInputIndexes).asType('float32'), 0, 255) : prediction;
        return this.loss(prediction, data)
      });
      // return tensorNormalize(this.getData().reshape([-1, 3]).reshape([this.inferenceCanvas.height, this.inferenceCanvas.width, 3]).asType('float32'), 0, 255);
      return this.runModel(false, true);
    });
  }

  runOverlay() {
    return dl.tidy(() => {
      // const data = this.getData() ? this.getData().asType('float32') : dl.scalar(0);
      const dynamicOutput = this.runModel(true, true);
      // const logicMap = data.greater(dynamicOutput);
      // const comp = dl.scalar(255).sub(dynamicOutput).mul(logicMap.asType('float32'));
      // const norm = dynamicOutput.mul(dl.logicalNot(logicMap).asType('float32'));
      // return norm.add(comp);

      return dynamicOutput;
    });
  }

  runInferenceLoop() {
    if (!this.isInferring) {
      return;
    }

    this.z1Counter += 1 / this.z1Scale;
    this.z2Counter += 1 / this.z2Scale;

    const lastOutput = dl.tidy(() => {
      return this.getData() ? this.runOptimizer() : this.runOverlay();
    });

    return renderToCanvas(lastOutput, this.inferenceCanvas)
      .then(() => dl.nextFrame())
      .then(() => this.runInferenceLoop());
  }

  stopInferenceLoop() {
    this.isInferring = false;
  }
}

function denormalize(value, min, max) {
  const diff = max - min;
  return Math.min(Math.max(Math.round(value * diff + diff /2), min), max);
}

function tensorNormalize(tensor, min, max) {
  const diff = dl.scalar(max).sub(dl.scalar(min));
  return tensor.sub(diff.div(dl.scalar(2))).div(diff);
}

function randi(max, min = 0) {
  const diff = max - min;
  return Math.floor(Math.random() * diff + min);
}

function renderToCanvas(a, canvas) {
  const [height, width, ] = a.shape;
  const ctx = canvas.getContext('2d');
  const imageData = new ImageData(width, height);
  return a.data().then((data) => {
    a.dispose();
    for (let i = 0; i < height * width; ++i) {
      const j = i * 4;
      const k = i * 3;
      imageData.data[j + 0] = denormalize(data[k + 0], 0, 255);
      imageData.data[j + 1] = denormalize(data[k + 1], 0, 255);
      imageData.data[j + 2] = denormalize(data[k + 2], 0, 255);
      imageData.data[j + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  });
}
