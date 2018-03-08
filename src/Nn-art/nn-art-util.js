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

export function createInputAtlas(
  imageSize, inputNumDimensions, numLatentVariables) {
  const coords = new Float32Array(imageSize * imageSize * inputNumDimensions);
  let dst = 0;
  for (let i = 0; i < imageSize * imageSize; i++) {
    for (let d = 0; d < inputNumDimensions; d++) {
      const x = i % imageSize;
      const y = Math.floor(i / imageSize);
      const coord = imagePixelToNormalizedCoord(
        x, y, imageSize, imageSize, numLatentVariables);
      coords[dst++] = coord[d];
    }
  }

  return dl.tensor2d(coords, [imageSize * imageSize, inputNumDimensions]);
}

// Normalizes x, y to -.5 <=> +.5, adds a radius term, and pads zeros with the
// number of z parameters that will get added by the add z shader.
export function imagePixelToNormalizedCoord(
  x, y, imageWidth, imageHeight, zSize) {
  const halfWidth = imageWidth * 0.5;
  const halfHeight = imageHeight * 0.5;
  const normX = (x - halfWidth) / imageWidth;
  const normY = (y - halfHeight) / imageHeight;

  const r = Math.sqrt(normX * normX + normY * normY);

  const result = [normX, normY, r];

  return result;
}

/**
 * This implementation of computing the complementary color came from an
 * answer by Edd https://stackoverflow.com/a/37657940
 */
export function computeComplementaryColor(data) {
  const normalizedData = data.div(dl.scalar(255.0));
  let rData = dl.gather(normalizedData, dl.tensor1d([0]), 2);
  let gData = dl.gather(normalizedData, dl.tensor1d([1]), 2);
  let bData = dl.gather(normalizedData, dl.tensor1d([2]), 2);

  const maxData = normalizedData.max(2).expandDims(2);
  const argMaxData = normalizedData.argMax(2).expandDims(2);
  const minData = normalizedData.min(2).expandDims(2);
  const argMinData = normalizedData.argMin(2).expandDims(2);
  let hData = maxData.add(minData).div(dl.scalar(2.0));
  let sData = hData;
  const lData = hData;

  const dData = maxData.sub(minData);
  sData = dl.where(argMaxData.equal(argMinData),
            dl.zerosLike(sData),
          dl.where(lData.greater(dl.scalar(0.5)),
            dData.div(dl.scalar(2.0).sub(maxData).sub(minData)),
            dData.div(maxData.add(minData))));

  hData = dl.where(argMaxData.equal(argMinData),
            dl.zerosLike(lData),
          dl.where(argMaxData.equal(dl.scalar(0, 'int32')).logicalAnd(gData.greaterEqual(bData)),
            gData.sub(bData).div(dData).mul(dl.scalar(1.0472)),
          dl.where(argMaxData.equal(dl.scalar(0, 'int32')).logicalAnd(gData.less(bData)),
            gData.sub(bData).div(dData).mul(dl.scalar(1.0472)).add(dl.scalar(6.2832)),
          dl.where(argMaxData.equal(dl.scalar(1, 'int32')),
            bData.sub(rData).div(dData).mul(dl.scalar(1.0472)).add(dl.scalar(2.0944)),
          dl.where(argMaxData.equal(dl.scalar(2, 'int32')),
            rData.sub(gData).div(dData).mul(dl.scalar(1.0472)).add(dl.scalar(4.1888)),
            hData)))));

  hData = hData.div(dl.scalar(6.2832)).mul(dl.scalar(360.0));

  // Shift hue to opposite side of wheel and convert to [0-1] value
  hData = hData.add(dl.scalar(180.0));

  hData = dl.where(hData.greater(dl.scalar(360.0)),
            hData.sub(dl.scalar(360.0)),
            hData);
  hData = hData.div(dl.scalar(360.0));

  // Convert h s and l values into r g and b values
  // Adapted from answer by Mohsen http://stackoverflow.com/a/9493060/4939630
  const hue2rgb = (pData, qData, tData) => {
    tData = dl.where(tData.less(dl.scalar(0)),
      tData.add(dl.scalar(1.0)),
      tData);

    tData = dl.where(tData.greater(dl.scalar(1.0)),
      tData.sub(dl.scalar(1.0)),
      tData);


    return dl.where(tData.greaterEqual(dl.scalar(2 / 3)),
      pData,
      dl.where(tData.greaterEqual(dl.scalar(1 / 2)),
        pData.add((qData.sub(pData)).mul(dl.scalar(2 / 3).sub(tData)).mul(dl.scalar(6))),
        dl.where(tData.greaterEqual(dl.scalar(1 / 6)),
          qData,
          qData.sub(pData).mul(dl.scalar(6.0)).mul(tData).add(pData))));
  };

  const qData = dl.where(lData.less(dl.scalar(0.5)),
                  lData.mul(sData.add(dl.scalar(1.0))),
                  lData.add(sData).sub(lData.mul(sData)));
  const pData = lData.mul(dl.scalar(2.0)).sub(qData);

  rData = dl.where(sData.equal(dl.scalar(0)),
            lData,
            hue2rgb(pData, qData, hData.add(dl.scalar(1 / 3))));
  gData = dl.where(sData.equal(dl.scalar(0)),
            lData,
            hue2rgb(pData, qData, hData));
  bData = dl.where(sData.equal(dl.scalar(0)),
            lData,
            hue2rgb(pData, qData, hData.sub(dl.scalar(1 / 3))));

  return rData.concat(gData, 2).concat(bData, 2).mul(dl.scalar(255)).ceil();
}
