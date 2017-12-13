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

import {Array2D, gpgpu_util, GPGPUContext, NDArrayMathGPU, webgl_util} from 'deeplearn';

import * as nnArtUtil from './nn-art-util';

const MAX_LAYERS = 10;

const colorModeOutputDimensions= {
  'rgb': 3,
  'rgba': 4,
  'hsv': 3,
  'hsva': 4,
  'yuv': 3,
  'yuva': 4,
  'bw': 1
};

const activationFunctionMap = {
  'tanh': (math, ndarray) => math.tanh(ndarray),
  'sin': (math, ndarray) => math.sin(ndarray),
  'relu': (math, ndarray) => math.relu(ndarray),
  'step': (math, ndarray) => math.step(ndarray)
};

const NUM_IMAGE_SPACE_VARIABLES = 3;  // x, y, r
const NUM_LATENT_VARIABLES = 2;

export class CPPN {
  inferenceCanvas;
  math;
  gl;
   gpgpu;
   renderShader;
   addLatentVariablesShader;

   inputAtlas;
   weights = [];

   z1Counter = 0;
   z2Counter = 0;
   z1Scale;
   z2Scale;
   numLayers;

   colorModeNames =
      ['rgb', 'rgba', 'hsv', 'hsva', 'yuv', 'yuva', 'bw'];

   selectedColorModeName;
   selectedActivationFunctionName;

   isInferring = false;

  constructor( inferenceCanvas) {
    this.inferenceCanvas = inferenceCanvas;
    this.gl = gpgpu_util.createWebGLContext(this.inferenceCanvas);
    this.gpgpu = new GPGPUContext(this.gl);
    this.math = new NDArrayMathGPU(this.gpgpu);

    const maxTextureSize = webgl_util.queryMaxTextureSize(this.gl);
    const canvasSize = Math.floor(Math.sqrt(maxTextureSize));
    this.inferenceCanvas.width = canvasSize;
    this.inferenceCanvas.height = canvasSize;

    this.renderShader = nnArtUtil.getRenderShader(this.gpgpu, canvasSize);
    this.addLatentVariablesShader = nnArtUtil.getAddLatentVariablesShader(
        this.gpgpu, NUM_IMAGE_SPACE_VARIABLES);
    this.inputAtlas = nnArtUtil.createInputAtlas(
        canvasSize, NUM_IMAGE_SPACE_VARIABLES, NUM_LATENT_VARIABLES);
  }

  generateWeights(neuronsPerLayer, weightsStdev) {
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i].dispose();
    }
    this.weights = [];

    this.weights.push(Array2D.randTruncatedNormal(
        [neuronsPerLayer, NUM_IMAGE_SPACE_VARIABLES + NUM_LATENT_VARIABLES], 0,
        weightsStdev));
    for (let i = 0; i < MAX_LAYERS; i++) {
      this.weights.push(Array2D.randTruncatedNormal(
          [neuronsPerLayer, neuronsPerLayer], 0, weightsStdev));
    }
    this.weights.push(Array2D.randTruncatedNormal(
        [4 /** max output channels */, neuronsPerLayer], 0, weightsStdev));
  }

  setColorMode(colorMode) {
    this.selectedColorModeName = colorMode;
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

    const colorModeIndex =
        this.colorModeNames.indexOf(this.selectedColorModeName);
    const outputDimensions =
        colorModeOutputDimensions[this.selectedColorModeName];

    this.z1Counter += 1 / this.z1Scale;
    this.z2Counter += 1 / this.z2Scale;
    const z1 = Math.sin(this.z1Counter);
    const z2 = Math.cos(this.z2Counter);

    const intermediateResults = [];

    // Add the latent variables.
    const addLatentVariablesResultTex =
        this.math.getTextureManager().acquireTexture(this.inputAtlas.shape);
    nnArtUtil.addLatentVariables(
        this.gpgpu, this.addLatentVariablesShader, this.inputAtlas.getTexture(),
        addLatentVariablesResultTex, this.inputAtlas.shape, z1, z2);
    const inputAtlasWithLatentVariables = Array2D.make(this.inputAtlas.shape, {
      texture: addLatentVariablesResultTex,
      textureShapeRC: this.inputAtlas.shape
    });
    intermediateResults.push(inputAtlasWithLatentVariables);

    let lastOutput = inputAtlasWithLatentVariables;

    this.math.scope(() => {
      for (let i = 0; i < this.numLayers; i++) {
        const matmulResult = this.math.matMul(this.weights[i], lastOutput);

        lastOutput = (i === this.numLayers - 1) ?
            this.math.sigmoid(matmulResult) :
            activationFunctionMap[this.selectedActivationFunctionName](
                this.math, matmulResult);
      }
      nnArtUtil.render(
          this.gpgpu, this.renderShader, lastOutput.getTexture(),
          outputDimensions, colorModeIndex);
    });

    inputAtlasWithLatentVariables.dispose();

    requestAnimationFrame(() => this.runInferenceLoop());
  }

  stopInferenceLoop() {
    this.isInferring = false;
  }
}
