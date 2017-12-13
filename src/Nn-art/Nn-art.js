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
 * =============================================================================
 */

import React, {Component} from 'react';
import {CPPN} from './cppn';

const MAT_WIDTH = 30;
// Standard deviations for gaussian weight initialization.
const WEIGHTS_STDEV = .6;

export default class NnArt extends Component {
    colorModeNames = ['rgb', 'rgba', 'hsv', 'hsva', 'yuv', 'yuva', 'bw'];
    activationFunctionNames = ['tanh', 'sin', 'relu', 'step'];  
    cppn;
    inferenceCanvas;
    constructor(props) {
        super(props);
        this.state = {
            selectedColorModeName: 'rgb',
            selectedActivationFunctionName: 'tanh',
            numLayers: 2,
            z1Scale: 0,
            z2Scale: 0
        };
        this.ready = this.ready.bind(this);
        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);
    }
    componentDidMount() {
        this.ready();
    }
    componentWillUnmount() {
        this.stop();
    }
    ready() {
        const {selectedColorModeName, selectedActivationFunctionName, numLayers, z1Scale, z2Scale} = this.state;
        this.cppn = new CPPN(this.inferenceCanvas);

        this.cppn.setColorMode(selectedColorModeName);

        this.cppn.setActivationFunction(selectedActivationFunctionName);

        this.cppn.setNumLayers(numLayers);

        this.cppn.setZ1Scale(this.convertZScale(z1Scale));

        this.cppn.setZ2Scale(this.convertZScale(z2Scale));

        this.cppn.generateWeights(MAT_WIDTH, WEIGHTS_STDEV);
    }
    start() {
        this.stop();
        this.cppn && this.cppn.start();        
    }
    stop() {
        this.cppn && this.cppn.stopInferenceLoop();
    }
    convertZScale(z) {
        return (103 - z);
    }
    render() {
        const {nnArtEnabled} = this.props;
        nnArtEnabled ? this.start() : this.stop();
        return <canvas id="inference" className={nnArtEnabled ? 'enabled' : ''} ref={(el) => { this.inferenceCanvas = el; }}></canvas>;
    }
}