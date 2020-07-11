function resizeCanvasAndResults(dimensions, canvas, results) {
    const {width, height} = faceapi.getMediaDimensions(dimensions)

    canvas.width = width
    canvas.height = height

    return results.map(res => res.forSize(width, height))
}

var detectionCounter = 0;

async function faceDetect(container) {
    const source = container.getElementsByTagName('img')[0];
    const canvas = container.getElementsByTagName('canvas')[0];

    const options = new faceapi.TinyFaceDetectorOptions({inputSize: 256, scoreThreshold: 0.7})

    const result = await faceapi.detectSingleFace(source, options).withFaceLandmarks(true)

    if (result) {
        const resizedResults = resizeCanvasAndResults(source, canvas, [result])
        faceapi.drawDetection(canvas, resizedResults.map(det => det.detection))

        // const faceLandmarks = resizedResults.map(det => det.landmarks)
        // const drawLandmarksOptions = { lineWidth: 2, drawLines: true, color: 'green' }
        // faceapi.drawLandmarks(canvas, faceLandmarks, drawLandmarksOptions)

        // Just printing the first of 68 face landmark x and y
        // console.log(
        //     Math.round(result._unshiftedLandmarks._positions[0]._x) + ', y: ' +
        //     Math.round(result._unshiftedLandmarks._positions[0]._y)
        // );

        detectionCounter += 1;

        if (detectionCounter === 10) {
            window.location.href = '#camera-modal';
        } else if (detectionCounter > 50) {
            detectionCounter = 50;
        }
    } else {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)

        if (detectionCounter > 0) {
            detectionCounter -= 2;
        }

        if (detectionCounter < 0) {
            detectionCounter = 0;

            window.location.href = '#';
        }
    }

    console.log('detectionCounter: ' + detectionCounter);

    let img = new Image()
    img.onload = () => {
        document.getElementById('face-detect').getElementsByTagName('img')[0].src = img.src;

        faceDetect(container);
    }
    img.src = 'https://192-168-0-5.homey.homeylocal.com/image/b980c0f7-0d4a-4b10-8a23-848a98e1a987/image?_face=' + Math.random();
}

window.addEventListener('load', async function run() {
    await faceapi.loadTinyFaceDetectorModel('https://hpssjellis.github.io/face-api.js-for-beginners/')
    await faceapi.loadFaceLandmarkTinyModel('https://hpssjellis.github.io/face-api.js-for-beginners/')

    // window.location.href = '#';

    const imgEl = document.getElementById('face-detect').getElementsByTagName('img')[0]

    imgEl.src = 'https://192-168-0-5.homey.homeylocal.com/image/b980c0f7-0d4a-4b10-8a23-848a98e1a987/image';

    imgEl.onload = faceDetect(document.getElementById('face-detect'))
});