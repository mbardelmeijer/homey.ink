function resizeCanvasAndResults(dimensions, canvas, results) {
    const {width, height} = faceapi.getMediaDimensions(dimensions)

    canvas.width = width
    canvas.height = height

    return results.map(res => res.forSize(width, height))
}

var detectionCounter = 0;

async function faceDetect() {
    const source = document.getElementById('image');
    const canvas = document.getElementById('overlay');

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
}

window.addEventListener('load', async function run() {
    await faceapi.loadTinyFaceDetectorModel('https://hpssjellis.github.io/face-api.js-for-beginners/')
    await faceapi.loadFaceLandmarkTinyModel('https://hpssjellis.github.io/face-api.js-for-beginners/')

    // window.location.href = '#';

    let timeout = null;
    window.drawToCanvas = (url) => {
        const baseUrl = url;
        const canvas = document.querySelector('#face-detect #image');

        var img = document.createElement('img');
        img.src = baseUrl;
        img.crossOrigin = "anonymous";

        img.onload = function () {

            var context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0);

            canvas.dispatchEvent(new Event('drawn'));

            faceDetect();

            img.src = baseUrl + '?_r=' + Math.random();
        };

        return canvas;

        // if (timeout) clearTimeout(timeout);
        // timeout = setTimeout(loop, 1000);
    };
    // loop();
});