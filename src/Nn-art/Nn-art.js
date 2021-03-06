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
 * Implemented React version of the nn-art.html Polymer component.
 * Added camera video capturing to combine with NN Art.
 * =============================================================================
 */

import React, { Component, Fragment } from 'react';
import { CPPN } from './cppn';
import * as dl from 'deeplearn';

// const CANVAS_UPSCALE_FACTOR = 3;
const MAT_WIDTH = 30;
// Standard deviations for gaussian weight initialization.
const WEIGHTS_STDEV = .6;

export default class NnArt extends Component {
    colorModeNames = ['rgb', 'rgba', 'hsv', 'hsva', 'yuv', 'yuva', 'bw'];
    activationFunctionNames = ['tanh', 'sin', 'relu', 'step'];
    cppn;
    inferenceCanvas;
    video;
    image = null;
    timer;
    isVideoPlaying = false;
    constructor(props) {
        super(props);
        this.state = {
            selectedColorModeName: 'rgb',
            selectedActivationFunctionName: 'tanh',
            numLayers: 2,
            z1Scale: 1,
            z2Scale: 1,
            stream: null,
        };
        this.ready = this.ready.bind(this);
        this.setupCamera = this.setupCamera.bind(this);
        this.startCppn = this.startCppn.bind(this);
        this.startVideo = this.startVideo.bind(this);
        this.stopCppn = this.stopCppn.bind(this);
        this.stopVideo = this.stopVideo.bind(this);
        this.setVideoData = this.setVideoData.bind(this);
        this.getVideoData = this.getVideoData.bind(this);
    }
    componentDidMount() {
        this.ready();

        const { nnArtEnabled, videoEnabled } = this.props;
        nnArtEnabled ? this.startCppn() : this.stopCppn();
        videoEnabled ? this.startVideo() : this.stopVideo();
    }
    componentWillReceiveProps(nextProps) {
        const { nnArtEnabled, videoEnabled } = this.props;
        const { nnArtEnabled: nextNnArtEnabled, videoEnabled: nextVideoEnabled } = nextProps;

        if (nextNnArtEnabled && !nnArtEnabled) this.startCppn();

        if (!nextNnArtEnabled && nnArtEnabled) this.stopCppn();

        if (nextVideoEnabled && !videoEnabled) this.startVideo();

        if (!nextVideoEnabled && videoEnabled) this.stopVideo();
    }

    componentWillUnmount() {
        this.stopCppn();
        this.stopVideo();
    }
    ready() {
        const {selectedActivationFunctionName, numLayers, z1Scale, z2Scale} = this.state;
        this.cppn = new CPPN(this.inferenceCanvas, this.getVideoData);

        this.cppn.setActivationFunction(selectedActivationFunctionName);

        this.cppn.setNumLayers(numLayers);

        this.cppn.setZ1Scale(this.convertZScale(z1Scale));

        this.cppn.setZ2Scale(this.convertZScale(z2Scale));

        this.cppn.generateWeights(MAT_WIDTH, WEIGHTS_STDEV);
    }
    setupCamera() {
        return navigator.mediaDevices.getUserMedia({video: true, audio: false})
            .then((stream) => {
                this.video.srcObject = stream;
                this.video.addEventListener('playing', ()=> this.isVideoPlaying = true);
                this.video.addEventListener('paused', ()=> this.isVideoPlaying = false);
          });
    }
    startVideo() {
        this.stopVideo();

        if (!this.video.srcObject) {
            this.setupCamera().then(() => {
              this.video.play();
              this.timer = requestAnimationFrame(this.setVideoData);
            });
        } else {
            this.video.play();
            this.timer = requestAnimationFrame(this.setVideoData);
        }
    }
    stopVideo() {
        this.video.pause();
        this.image = null;
        this.timer && cancelAnimationFrame(this.timer);
    }

    setVideoData() {
        this.image && this.image.dispose();
        this.image = dl.fromPixels(this.video).reverse(1);
        this.timer = requestAnimationFrame(this.setVideoData);
    }
    getVideoData() {
        return this.isVideoPlaying ? this.image : null;
    }

    startCppn() {
        this.stopCppn();
        this.cppn && this.cppn.start();
    }
    stopCppn() {
        this.cppn && this.cppn.stopInferenceLoop();
    }
    convertZScale(z) {
        return (103 - z);
    }
    render() {
        const { nnArtEnabled } = this.props;
        return (
            <Fragment>
                <canvas id="inference" className={`${nnArtEnabled ? 'enabled' : ''}`} ref={(el) => { this.inferenceCanvas = el; }}/>
                <video ref={(video) => {this.video = video}}
                    height="128" width="128" autoPlay playsInline/>
            </Fragment>
        );
    }
}